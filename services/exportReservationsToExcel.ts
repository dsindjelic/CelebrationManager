import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";

export type ExcelReservation = {
  id: number;
  celebration_date: string;
  start_time: string | null;

  celebrant_name: string;
  customer_name: string;
  phone_number: string;

  celebration_type: string;
  status: string;

  guest_count: number;
  complimentary_guests: number;
  fasting_guests: number;
  price_per_person: number;

  menu: string | null;
  music: string | null;

  has_cake: number;
  has_smoke: number;
  has_decoration: number;

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

const weekdayNames = [
  "Ponedeljak",
  "Utorak",
  "Sreda",
  "Četvrtak",
  "Petak",
  "Subota",
  "Nedelja",
];

function calculateBasePrice(reservation: ExcelReservation) {
  const chargedGuests = Math.max(
    0,
    reservation.guest_count - reservation.complimentary_guests,
  );

  return chargedGuests * reservation.price_per_person;
}

function serviceList(reservation: ExcelReservation) {
  const services: string[] = [];

  if (reservation.has_cake === 1) {
    services.push("Torta");
  }

  if (reservation.has_smoke === 1) {
    services.push("Dim / prskalice");
  }

  if (reservation.has_decoration === 1) {
    services.push("Dekoracija");
  }

  return services.join(", ");
}

export async function exportReservationsToExcel(
  reservations: ExcelReservation[],
  year: number,
  month: number,
) {
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;

  const monthlyReservations = reservations
    .filter((reservation) =>
      reservation.celebration_date.startsWith(monthPrefix),
    )
    .sort((first, second) => {
      const firstValue = `${first.celebration_date} ${first.start_time ?? "23:59"}`;

      const secondValue = `${second.celebration_date} ${second.start_time ?? "23:59"}`;

      return firstValue.localeCompare(secondValue);
    });

  const calendarRows: (string | number)[][] = [
    [`Kalendar proslava – ${monthNames[month - 1]} ${year}`],
    weekdayNames,
  ];

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  // JavaScript: nedelja = 0. Nama je ponedeljak prva kolona.
  const firstWeekday = (firstDay.getDay() + 6) % 7;

  let day = 1;

  for (let week = 0; week < 6; week += 1) {
    const weekRow: string[] = [];

    for (let weekday = 0; weekday < 7; weekday += 1) {
      if ((week === 0 && weekday < firstWeekday) || day > daysInMonth) {
        weekRow.push("");
        continue;
      }

      const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const dailyReservations = monthlyReservations.filter(
        (reservation) => reservation.celebration_date === dateString,
      );

      const reservationText = dailyReservations
        .map((reservation) => {
          const time = reservation.start_time ?? "Vreme nije uneto";

          return [
            `${time} – ${reservation.celebrant_name}`,
            `${reservation.celebration_type} · ${reservation.guest_count} gostiju`,
            reservation.status,
          ].join("\n");
        })
        .join("\n\n");

      weekRow.push(
        reservationText ? `${day}\n\n${reservationText}` : String(day),
      );

      day += 1;
    }

    calendarRows.push(weekRow);

    if (day > daysInMonth) {
      break;
    }
  }

  const calendarSheet = XLSX.utils.aoa_to_sheet(calendarRows);

  calendarSheet["!merges"] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: 6 },
    },
  ];

  calendarSheet["!cols"] = weekdayNames.map(() => ({
    wch: 24,
  }));

  calendarSheet["!rows"] = [
    { hpt: 28 },
    { hpt: 24 },
    ...calendarRows.slice(2).map(() => ({ hpt: 110 })),
  ];

  const detailRows = monthlyReservations.map((reservation) => {
    const chargedGuests = Math.max(
      0,
      reservation.guest_count - reservation.complimentary_guests,
    );

    return {
      Datum: reservation.celebration_date,
      Početak: reservation.start_time ?? "",
      Slavljenik: reservation.celebrant_name,
      "Vrsta proslave": reservation.celebration_type,
      Status: reservation.status,
      "Ko zakazuje": reservation.customer_name,
      Telefon: reservation.phone_number,
      "Broj gostiju": reservation.guest_count,
      "Gratis mesta": reservation.complimentary_guests,
      "Gostiju za naplatu": chargedGuests,
      "Gostiju koji poste": reservation.fasting_guests,
      "Cena po osobi": reservation.price_per_person,
      "Osnovna cena": calculateBasePrice(reservation),
      Jelovnik: reservation.menu ?? "",
      Muzika: reservation.music ?? "",
      "Dodatne usluge": serviceList(reservation),
      Napomena: reservation.notes ?? "",
    };
  });

  const detailsSheet = XLSX.utils.json_to_sheet(detailRows);

  detailsSheet["!cols"] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 24 },
    { wch: 20 },
    { wch: 14 },
    { wch: 24 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
    { wch: 18 },
    { wch: 40 },
    { wch: 28 },
    { wch: 28 },
    { wch: 45 },
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, calendarSheet, "Kalendar");
  XLSX.utils.book_append_sheet(workbook, detailsSheet, "Proslave");

  const workbookBase64 = XLSX.write(workbook, {
    type: "base64",
    bookType: "xlsx",
  });

  const fileName = `Emona-proslave-${year}-${String(month).padStart(2, "0")}.xlsx`;

  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, workbookBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const sharingAvailable = await Sharing.isAvailableAsync();

  if (!sharingAvailable) {
    throw new Error("Deljenje fajlova nije dostupno na ovom uređaju.");
  }

  await Sharing.shareAsync(fileUri, {
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: `Izvezi ${monthNames[month - 1]} ${year}`,
    UTI: "org.openxmlformats.spreadsheetml.sheet",
  });
}
