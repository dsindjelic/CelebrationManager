import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";

export type ExportReservation = {
  id: number;
  celebration_date: string;
  start_time: string | null;
  celebrant_name: string;
  customer_name: string;
  phone_number: string;
  celebration_type: string;
  status: string;
  guest_count: number;
  fasting_guests: number;
  price_per_person: number;
  currency?: string | null;
  menu: string | null;
  has_smoke: number;
  has_sparklers?: number;
  has_white_tablecloths?: number;
  has_black_tablecloths?: number;
  notes: string | null;
};

const monthNames = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Jun",
  "Jul",
  "Avgust",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
];
const weekdayNames = ["Pon", "Uto", "Sre", "Cet", "Pet", "Sub", "Ned"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getMonthlyReservations(
  reservations: ExportReservation[],
  year: number,
  month: number,
) {
  const prefix = `${year}-${pad(month)}`;
  return reservations
    .filter((reservation) => reservation.celebration_date.startsWith(prefix))
    .sort((a, b) =>
      `${a.celebration_date} ${a.start_time ?? "23:59"}`.localeCompare(
        `${b.celebration_date} ${b.start_time ?? "23:59"}`,
      ),
    );
}

function getCalendarWeeks(year: number, month: number) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const weeks: (number | null)[][] = [];
  let day = 1;

  while (day <= daysInMonth) {
    const week: (number | null)[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      if ((weeks.length === 0 && weekday < firstWeekday) || day > daysInMonth) {
        week.push(null);
      } else {
        week.push(day++);
      }
    }
    weeks.push(week);
  }
  return weeks;
}

function getComment(reservation: ExportReservation) {
  const extras: string[] = [];
  if (reservation.has_smoke === 1) extras.push("Dim");
  if (reservation.has_sparklers === 1) extras.push("Prskalice");
  if (reservation.has_white_tablecloths === 1) extras.push("Beli stolnjaci");
  if (reservation.has_black_tablecloths === 1) extras.push("Crni stolnjaci");

  return [
    `Vreme: ${reservation.start_time ?? "nije uneto"}`,
    `Zakazuje: ${reservation.customer_name}`,
    `Telefon: ${reservation.phone_number}`,
    `Vrsta: ${reservation.celebration_type}`,
    `Status: ${reservation.status}`,
    `Broj gostiju: ${reservation.guest_count}`,
    `Gostiju koji poste: ${reservation.fasting_guests}`,
    `Cena po osobi: ${reservation.price_per_person} ${reservation.currency === "EUR" ? "EUR" : "RSD"}`,
    reservation.menu ? `Jelovnik: ${reservation.menu}` : "",
    extras.length ? `Dodatno: ${extras.join(", ")}` : "",
    reservation.notes ? `Napomena: ${reservation.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function checkSharing() {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Deljenje fajlova nije dostupno na ovom uređaju.");
  }
}

export async function exportReservationsToExcel(
  reservations: ExportReservation[],
  year: number,
  month: number,
) {
  const monthly = getMonthlyReservations(reservations, year, month);
  const weeks = getCalendarWeeks(year, month);
  const rows: (string | number)[][] = [
    [`Kalendar proslava – ${monthNames[month - 1]} ${year}`],
    weekdayNames,
  ];

  for (const week of weeks) {
    rows.push(
      week.map((day) => {
        if (day === null) return "";
        const date = `${year}-${pad(month)}-${pad(day)}`;
        const names = monthly
          .filter((reservation) => reservation.celebration_date === date)
          .map((reservation) => reservation.customer_name.trim())
          .filter(Boolean);
        return names.length ? `${day}\n${names.join("\n")}` : day;
      }),
    );
  }

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
  sheet["!cols"] = weekdayNames.map(() => ({ wch: 22 }));
  sheet["!rows"] = [
    { hpt: 30 },
    { hpt: 24 },
    ...weeks.map(() => ({ hpt: 82 })),
  ];

  weeks.forEach((week, weekIndex) => {
    week.forEach((day, weekdayIndex) => {
      if (day === null) return;
      const date = `${year}-${pad(month)}-${pad(day)}`;
      const daily = monthly.filter(
        (reservation) => reservation.celebration_date === date,
      );
      if (!daily.length) return;
      const address = XLSX.utils.encode_cell({
        r: weekIndex + 2,
        c: weekdayIndex,
      });
      const cell = sheet[address];
      if (cell) {
        cell.c = [
          {
            a: "Emona Proslave",
            t: daily.map(getComment).join("\n\n---\n\n"),
          },
        ];
        cell.c.hidden = true;
      }
    });
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Kalendar");
  const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
  const fileUri = `${FileSystem.cacheDirectory}Emona-proslave-${year}-${pad(month)}.xlsx`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await checkSharing();
  await Sharing.shareAsync(fileUri, {
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: `Izvezi ${monthNames[month - 1]} ${year}`,
    UTI: "org.openxmlformats.spreadsheetml.sheet",
  });
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function exportReservationsToPdf(
  reservations: ExportReservation[],
  year: number,
  month: number,
) {
  const monthly = getMonthlyReservations(reservations, year, month);
  const weeks = getCalendarWeeks(year, month);
  const bodyRows = weeks
    .map(
      (week) =>
        `<tr>${week
          .map((day) => {
            if (day === null) return "<td></td>";
            const date = `${year}-${pad(month)}-${pad(day)}`;
            const items = monthly
              .filter((reservation) => reservation.celebration_date === date)
              .map(
                (reservation) => `
        <div class="reservation">
          <strong>${escapeHtml(reservation.customer_name)}</strong>
          ${reservation.start_time ? `<span>${escapeHtml(reservation.start_time)}</span>` : ""}
          <small>${escapeHtml(reservation.status)}</small>
        </div>`,
              )
              .join("");
            return `<td><div class="day">${day}</div>${items}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html lang="sr"><head><meta charset="utf-8" />
    <style>
      @page { size: A4 landscape; margin: 12mm; }
      * { box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #35213b; margin: 0; }
      h1 { text-align: center; color: #6d3b7c; font-size: 25px; margin: 0 0 12px; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th { background: #6d3b7c; color: white; padding: 7px; font-size: 13px; }
      td { height: 92px; vertical-align: top; border: 1px solid #cdbfd1; padding: 6px; }
      .day { font-size: 15px; font-weight: 700; margin-bottom: 5px; }
      .reservation { margin-top: 4px; padding: 4px; border-radius: 5px; background: #f2e9f4; font-size: 11px; }
      .reservation strong, .reservation span, .reservation small { display: block; }
      .reservation small { color: #6d3b7c; }
    </style></head><body>
    <h1>Kalendar proslava – ${monthNames[month - 1]} ${year}</h1>
    <table><thead><tr>${weekdayNames.map((name) => `<th>${name}</th>`).join("")}</tr></thead>
    <tbody>${bodyRows}</tbody></table></body></html>`;

  const result = await Print.printToFileAsync({ html });
  const fileUri = `${FileSystem.cacheDirectory}Emona-proslave-${year}-${pad(month)}.pdf`;
  const oldFile = await FileSystem.getInfoAsync(fileUri);
  if (oldFile.exists) {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
  }
  await FileSystem.copyAsync({ from: result.uri, to: fileUri });
  await checkSharing();
  await Sharing.shareAsync(fileUri, {
    mimeType: "application/pdf",
    dialogTitle: `Izvezi ${monthNames[month - 1]} ${year} u PDF`,
    UTI: "com.adobe.pdf",
  });
}
