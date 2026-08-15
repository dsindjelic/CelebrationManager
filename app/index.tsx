import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Calendar, DateData, LocaleConfig } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";

import ReservationModal, {
  ReservationModalData,
} from "../components/ReservationModal";

LocaleConfig.locales.sr = {
  monthNames: [
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
  ],

  monthNamesShort: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Maj",
    "Jun",
    "Jul",
    "Avg",
    "Sep",
    "Okt",
    "Nov",
    "Dec",
  ],

  dayNames: [
    "Nedelja",
    "Ponedeljak",
    "Utorak",
    "Sreda",
    "Četvrtak",
    "Petak",
    "Subota",
  ],

  dayNamesShort: ["Ned", "Pon", "Uto", "Sre", "Čet", "Pet", "Sub"],

  today: "Danas",
};

LocaleConfig.defaultLocale = "sr";

type Reservation = ReservationModalData;

const statusColors: Record<string, string> = {
  Upit: "#f5a313",
  Rezervisano: "#2087c9",
  Potvrđeno: "#159b69",
};

function getLocalDateString() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatSelectedDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("sr-Latn-RS", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function calculateBasePrice(reservation: Reservation) {
  const chargedGuests = Math.max(
    0,
    reservation.guest_count - reservation.complimentary_guests,
  );

  return chargedGuests * reservation.price_per_person;
}

export default function HomeScreen() {
  const router = useRouter();
  const database = useSQLiteContext();

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());

  const [reservations, setReservations] = useState<Reservation[]>([]);

  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);

  const loadReservations = useCallback(async () => {
    try {
      const rows = await database.getAllAsync<Reservation>(
        `
    SELECT
      id,
      celebration_date,
      celebrant_name,
      customer_name,
      phone_number,
      celebration_type,
      status,
      guest_count,
      complimentary_guests,
      fasting_guests,
      price_per_person,
      menu,
      music,
      has_cake,
      has_smoke,
      has_decoration,
      notes
    FROM reservations
    ORDER BY celebration_date, id
  `,
      );

      setReservations(rows);

      console.log("Učitano rezervacija:", rows.length);
    } catch (error) {
      console.error("Greška prilikom učitavanja rezervacija:", error);
    }
  }, [database]);

  useFocusEffect(
    useCallback(() => {
      void loadReservations();
    }, [loadReservations]),
  );

  const selectedDateReservations = useMemo(
    () =>
      reservations.filter(
        (reservation) => reservation.celebration_date === selectedDate,
      ),
    [reservations, selectedDate],
  );

  const dateSummary = useMemo(() => {
    const summary: Record<
      string,
      {
        status: string;
        count: number;
      }
    > = {};

    const priority: Record<string, number> = {
      Upit: 1,
      Rezervisano: 2,
      Potvrđeno: 3,
    };

    for (const reservation of reservations) {
      const date = reservation.celebration_date;

      if (!summary[date]) {
        summary[date] = {
          status: reservation.status,
          count: 1,
        };

        continue;
      }

      summary[date].count += 1;

      const currentPriority = priority[summary[date].status] ?? 0;

      const newPriority = priority[reservation.status] ?? 0;

      if (newPriority > currentPriority) {
        summary[date].status = reservation.status;
      }
    }

    return summary;
  }, [reservations]);

  function handleDayPress(day: DateData) {
    setSelectedDate(day.dateString);
  }

  function handleNewReservation() {
    router.push({
      pathname: "/reservation/new",
      params: {
        date: selectedDate,
      },
    });
  }

  async function handleConfirmReservation(reservation: Reservation) {
    try {
      await database.runAsync(
        `
          UPDATE reservations
          SET
            status = ?,
            updated_at = ?
          WHERE id = ?
        `,
        ["Potvrđeno", new Date().toISOString(), reservation.id],
      );

      setSelectedReservation(null);

      await loadReservations();
    } catch (error) {
      console.error("Greška pri potvrđivanju rezervacije:", error);

      Alert.alert("Greška", "Status rezervacije nije promenjen.");
    }
  }

  function handleDeleteReservation(reservation: Reservation) {
    Alert.alert(
      "Brisanje rezervacije",
      `Da li sigurno želite da obrišete rezervaciju „${reservation.celebrant_name}“?`,
      [
        {
          text: "Odustani",
          style: "cancel",
        },
        {
          text: "Obriši",
          style: "destructive",

          onPress: async () => {
            try {
              await database.runAsync(
                `
                  DELETE FROM reservations
                  WHERE id = ?
                `,
                [reservation.id],
              );

              setSelectedReservation(null);

              await loadReservations();
            } catch (error) {
              console.error("Greška pri brisanju rezervacije:", error);

              Alert.alert("Greška", "Rezervacija nije obrisana.");
            }
          },
        },
      ],
    );
  }

  function handleEditReservation(reservation: Reservation) {
    setSelectedReservation(null);

    router.push({
      pathname: "/reservation/new",
      params: {
        id: String(reservation.id),
        date: reservation.celebration_date,
      },
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text style={styles.title}>Rezervacije sale</Text>

          <Text style={styles.subtitle}>
            Izaberite datum da pregledate ili dodate rezervaciju.
          </Text>
        </View>

        <View style={styles.calendarCard}>
          <Calendar
            current={selectedDate}
            firstDay={1}
            enableSwipeMonths
            onDayPress={handleDayPress}
            dayComponent={({ date, state }) => {
              if (!date) {
                return null;
              }

              const dateString = date.dateString;

              const summary = dateSummary[dateString];

              const isSelected = dateString === selectedDate;

              const isToday = dateString === getLocalDateString();

              const isDisabled = state === "disabled";

              const statusColor = summary
                ? (statusColors[summary.status] ?? "#777777")
                : undefined;

              const circleColor =
                statusColor ?? (isSelected ? "#7e3788" : "transparent");

              const hasColoredCircle = Boolean(statusColor) || isSelected;

              return (
                <Pressable
                  style={styles.dayContainer}
                  onPress={() => handleDayPress(date)}
                  disabled={isDisabled}
                >
                  <View
                    style={[
                      styles.dayCircle,

                      {
                        backgroundColor: circleColor,
                      },

                      isToday && !hasColoredCircle && styles.todayCircle,

                      isSelected && statusColor && styles.selectedStatusCircle,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,

                        hasColoredCircle && styles.coloredDayText,

                        isDisabled && styles.disabledDayText,

                        isToday && !hasColoredCircle && styles.todayDayText,
                      ]}
                    >
                      {date.day}
                    </Text>

                    {summary && summary.count > 1 && (
                      <View style={styles.reservationCount}>
                        <Text style={styles.reservationCountText}>
                          {summary.count}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            }}
            theme={{
              calendarBackground: "#ffffff",
              backgroundColor: "#ffffff",

              textSectionTitleColor: "#7e3788",
              textSectionTitleDisabledColor: "#c9c2cc",

              arrowColor: "#7e3788",
              monthTextColor: "#35213b",

              textMonthFontSize: 20,
              textMonthFontWeight: "700",

              textDayHeaderFontSize: 13,
              textDayHeaderFontWeight: "600",
            }}
          />
        </View>

        <View style={styles.legend}>
          <LegendItem color={statusColors.Upit} label="Upit" />

          <LegendItem color={statusColors.Rezervisano} label="Rezervisano" />

          <LegendItem color={statusColors.Potvrđeno} label="Potvrđeno" />
        </View>

        <View style={styles.selectedDateCard}>
          <Text style={styles.selectedDateLabel}>Izabrani datum</Text>

          <Text style={styles.selectedDateText}>
            {formatSelectedDate(selectedDate)}
          </Text>

          {selectedDateReservations.length === 0 ? (
            <Text style={styles.noReservations}>
              Za ovaj datum trenutno nema evidentiranih rezervacija.
            </Text>
          ) : (
            <View style={styles.reservationList}>
              {selectedDateReservations.map((reservation) => (
                <Pressable
                  key={reservation.id}
                  style={({ pressed }) => [
                    styles.reservationCard,
                    pressed && styles.reservationCardPressed,
                  ]}
                  onPress={() => setSelectedReservation(reservation)}
                >
                  <View style={styles.reservationHeader}>
                    <View style={styles.reservationTitleContainer}>
                      <Text style={styles.reservationTitle}>
                        {reservation.celebrant_name}
                      </Text>

                      <Text style={styles.reservationType}>
                        {reservation.celebration_type}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            statusColors[reservation.status] ?? "#777777",
                        },
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>
                        {reservation.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.reservationInfo}>
                    Zakazao/la: {reservation.customer_name}
                  </Text>

                  <Text style={styles.reservationInfo}>
                    Telefon: {reservation.phone_number}
                  </Text>

                  <Text style={styles.reservationInfo}>
                    Gosti: {reservation.guest_count}
                    {reservation.complimentary_guests > 0
                      ? ` · gratis: ${reservation.complimentary_guests}`
                      : ""}
                  </Text>

                  {reservation.fasting_guests > 0 && (
                    <Text style={styles.reservationInfo}>
                      Gostiju koji poste: {reservation.fasting_guests}
                    </Text>
                  )}

                  <Text style={styles.reservationPrice}>
                    Osnovna cena:{" "}
                    {calculateBasePrice(reservation).toLocaleString("sr-RS")}{" "}
                    RSD
                  </Text>

                  <Text style={styles.openDetailsText}>
                    Dodirnite za detalje
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
          onPress={handleNewReservation}
        >
          <Text style={styles.addButtonText}>＋ Nova rezervacija</Text>
        </Pressable>
      </ScrollView>

      <ReservationModal
        visible={selectedReservation !== null}
        reservation={selectedReservation}
        onClose={() => setSelectedReservation(null)}
        onConfirm={handleConfirmReservation}
        onDelete={handleDeleteReservation}
        onEdit={handleEditReservation}
      />
    </SafeAreaView>
  );
}

type LegendItemProps = {
  color: string;
  label: string;
};

function LegendItem({ color, label }: LegendItemProps) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          {
            backgroundColor: color,
          },
        ]}
      />

      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f4f8",
  },

  container: {
    flexGrow: 1,
    padding: 18,
    paddingBottom: 24,
  },

  intro: {
    marginBottom: 18,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#35213b",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 23,
    color: "#6c6370",
  },

  calendarCard: {
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderRadius: 18,

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  dayContainer: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  dayCircle: {
    position: "relative",
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
  },

  dayText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#35213b",
  },

  coloredDayText: {
    fontWeight: "700",
    color: "#ffffff",
  },

  disabledDayText: {
    color: "#cfc8d1",
  },

  todayCircle: {
    borderWidth: 2,
    borderColor: "#a254b5",
  },

  todayDayText: {
    fontWeight: "700",
    color: "#8b3da0",
  },

  selectedStatusCircle: {
    borderWidth: 3,
    borderColor: "#4b2055",
  },

  reservationCount: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#35213b",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#ffffff",
  },

  reservationCountText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ffffff",
  },

  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 14,
    paddingHorizontal: 4,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  legendDot: {
    width: 9,
    height: 9,
    marginRight: 6,
    borderRadius: 5,
  },

  legendText: {
    fontSize: 13,
    color: "#675b6a",
  },

  selectedDateCard: {
    marginTop: 18,
    padding: 18,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderLeftWidth: 5,
    borderLeftColor: "#7e3788",
  },

  selectedDateLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    color: "#8b7e8f",
  },

  selectedDateText: {
    marginTop: 5,
    fontSize: 18,
    fontWeight: "700",
    color: "#35213b",
    textTransform: "capitalize",
  },

  noReservations: {
    marginTop: 9,
    fontSize: 15,
    lineHeight: 21,
    color: "#746b77",
  },

  reservationList: {
    marginTop: 14,
    gap: 12,
  },

  reservationCard: {
    padding: 14,
    backgroundColor: "#f8f4f9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5dce7",
  },

  reservationCardPressed: {
    opacity: 0.7,
  },

  reservationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  reservationTitleContainer: {
    flex: 1,
  },

  reservationTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#35213b",
  },

  reservationType: {
    marginTop: 3,
    fontSize: 14,
    color: "#776a7a",
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },

  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },

  reservationInfo: {
    marginTop: 7,
    fontSize: 14,
    color: "#5e5261",
  },

  reservationPrice: {
    marginTop: 9,
    fontSize: 15,
    fontWeight: "700",
    color: "#7e3788",
  },

  openDetailsText: {
    marginTop: 10,
    fontSize: 12,
    color: "#89798d",
  },

  addButton: {
    marginTop: 18,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7e3788",
    borderRadius: 14,
  },

  addButtonPressed: {
    backgroundColor: "#5f2868",
  },

  addButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
  },
});
