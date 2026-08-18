import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const celebrationTypes = [
  "Svadba",
  "Veridba",
  "Rođendan",
  "Godišnjica",
  "Krštenje",
  "Proslava rođenja",
  "Porodično okupljanje",
  "Matura / diploma",
  "Bebina zabava",
  "Drugo",
];

const reservationStatuses = ["Upit", "Rezervisano", "Potvrđeno"];
const startTimeOptions = Array.from({ length: 28 }, (_, index) => {
  const totalMinutes = 10 * 60 + index * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});
type ReservationRow = {
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

function getLocalDateString() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toNumber(value: string) {
  return Number(value.replace(",", ".")) || 0;
}

function formatDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("sr-Latn-RS", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function NewReservationScreen() {
  const router = useRouter();
  const database = useSQLiteContext();

  const params = useLocalSearchParams<{
    date?: string;
    id?: string;
  }>();

  const parsedReservationId = params.id ? Number(params.id) : Number.NaN;

  const isEditMode =
    Number.isInteger(parsedReservationId) && parsedReservationId > 0;

  const reservationId = isEditMode ? parsedReservationId : null;

  const initialDate =
    typeof params.date === "string" ? params.date : getLocalDateString();

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [startTime, setStartTime] = useState("18:00");

  const [celebrantName, setCelebrantName] = useState("");

  const [customerName, setCustomerName] = useState("");

  const [phoneNumber, setPhoneNumber] = useState("");

  const [celebrationType, setCelebrationType] = useState("Rođendan");

  const [status, setStatus] = useState("Upit");

  const [guestCount, setGuestCount] = useState("5");

  const [complimentaryGuests, setComplimentaryGuests] = useState("0");

  const [fastingGuests, setFastingGuests] = useState("0");

  const [pricePerPerson, setPricePerPerson] = useState("");

  const [menu, setMenu] = useState("");
  const [music, setMusic] = useState("");

  const [hasCake, setHasCake] = useState(false);

  const [hasSmoke, setHasSmoke] = useState(false);

  const [hasDecoration, setHasDecoration] = useState(false);

  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(isEditMode);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditMode || reservationId === null) {
      return;
    }

    async function loadReservation() {
      try {
        setIsLoading(true);

        const reservation = await database.getFirstAsync<ReservationRow>(
          `
              SELECT
                id,
                celebration_date,
                start_time,
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
              WHERE id = ?
            `,
          [reservationId],
        );

        if (!reservation) {
          Alert.alert("Greška", "Rezervacija nije pronađena.", [
            {
              text: "U redu",
              onPress: () => router.back(),
            },
          ]);

          return;
        }

        setSelectedDate(reservation.celebration_date);
        setStartTime(reservation.start_time ?? "18:00");

        setCelebrantName(reservation.celebrant_name);

        setCustomerName(reservation.customer_name);

        setPhoneNumber(reservation.phone_number);

        setCelebrationType(reservation.celebration_type);

        setStatus(reservation.status);

        setGuestCount(String(reservation.guest_count));

        setComplimentaryGuests(String(reservation.complimentary_guests));

        setFastingGuests(String(reservation.fasting_guests));

        setPricePerPerson(String(reservation.price_per_person));

        setMenu(reservation.menu ?? "");
        setMusic(reservation.music ?? "");

        setHasCake(reservation.has_cake === 1);

        setHasSmoke(reservation.has_smoke === 1);

        setHasDecoration(reservation.has_decoration === 1);

        setNotes(reservation.notes ?? "");
      } catch (error) {
        console.error("Greška pri učitavanju rezervacije:", error);

        Alert.alert("Greška", "Podaci rezervacije nisu učitani.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadReservation();
  }, [database, isEditMode, reservationId, router]);

  const calculation = useMemo(() => {
    const guests = toNumber(guestCount);

    const complimentary = toNumber(complimentaryGuests);

    const price = toNumber(pricePerPerson);

    const chargedGuests = Math.max(0, guests - complimentary);

    const basePrice = chargedGuests * price;

    return {
      chargedGuests,
      basePrice,
    };
  }, [guestCount, complimentaryGuests, pricePerPerson]);

  async function handleSave() {
    const guests = toNumber(guestCount);

    const complimentary = toNumber(complimentaryGuests);

    const fasting = toNumber(fastingGuests);

    const price = toNumber(pricePerPerson);

    if (!celebrantName.trim()) {
      Alert.alert("Nedostaje podatak", "Unesite ko proslavlja.");

      return;
    }

    if (!customerName.trim()) {
      Alert.alert("Nedostaje podatak", "Unesite ime osobe koja zakazuje.");

      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert("Nedostaje podatak", "Unesite broj telefona.");

      return;
    }

    if (guests <= 0) {
      Alert.alert("Neispravan unos", "Broj gostiju mora biti veći od nule.");

      return;
    }

    if (complimentary < 0) {
      Alert.alert(
        "Neispravan unos",
        "Broj gratis mesta ne može biti negativan.",
      );

      return;
    }

    if (complimentary > guests) {
      Alert.alert(
        "Neispravan unos",
        "Broj gratis mesta ne može biti veći od broja gostiju.",
      );

      return;
    }

    if (fasting < 0) {
      Alert.alert(
        "Neispravan unos",
        "Broj gostiju koji poste ne može biti negativan.",
      );

      return;
    }

    if (fasting > guests) {
      Alert.alert(
        "Neispravan unos",
        "Broj gostiju koji poste ne može biti veći od ukupnog broja gostiju.",
      );

      return;
    }

    if (price < 0) {
      Alert.alert("Neispravan unos", "Cena po osobi ne može biti negativna.");

      return;
    }

    try {
      setIsSaving(true);

      if (isEditMode && reservationId !== null) {
        await database.runAsync(
          `
            UPDATE reservations
            SET
              start_time = ?,
              celebrant_name = ?,
              customer_name = ?,
              phone_number = ?,
              celebration_type = ?,
              status = ?,
              guest_count = ?,
              complimentary_guests = ?,
              fasting_guests = ?,
              price_per_person = ?,
              menu = ?,
              music = ?,
              has_cake = ?,
              has_smoke = ?,
              has_decoration = ?,
              notes = ?,
              updated_at = ?
            WHERE id = ?
          `,
          [
            startTime,
            celebrantName.trim(),
            customerName.trim(),
            phoneNumber.trim(),
            celebrationType,
            status,
            guests,
            complimentary,
            fasting,
            price,
            menu.trim(),
            music.trim(),
            hasCake ? 1 : 0,
            hasSmoke ? 1 : 0,
            hasDecoration ? 1 : 0,
            notes.trim(),
            new Date().toISOString(),
            reservationId,
          ],
        );

        console.log("Izmenjena rezervacija, ID:", reservationId);
      } else {
        const result = await database.runAsync(
          `
              INSERT INTO reservations (
                celebration_date,
                start_time,
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
                notes,
                created_at
              )
              VALUES (
                  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                  ?, ?, ?, ?, ?, ?, ?, ?
                      )
            `,
          [
            selectedDate,
            startTime,
            celebrantName.trim(),
            customerName.trim(),
            phoneNumber.trim(),
            celebrationType,
            status,
            guests,
            complimentary,
            fasting,
            price,
            menu.trim(),
            music.trim(),
            hasCake ? 1 : 0,
            hasSmoke ? 1 : 0,
            hasDecoration ? 1 : 0,
            notes.trim(),
            new Date().toISOString(),
          ],
        );

        console.log("Sačuvana rezervacija, ID:", result.lastInsertRowId);
      }

      Alert.alert(
        isEditMode ? "Rezervacija je izmenjena" : "Rezervacija je sačuvana",

        isEditMode
          ? "Izmene su uspešno sačuvane."
          : "Podaci su uspešno upisani u lokalnu bazu.",

        [
          {
            text: "U redu",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      console.error("Greška prilikom čuvanja:", error);

      Alert.alert(
        "Greška",
        isEditMode ? "Izmene nisu sačuvane." : "Rezervacija nije sačuvana.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Izmena rezervacije",
          }}
        />

        <SafeAreaView
          style={styles.loadingContainer}
          edges={["left", "right", "bottom"]}
        >
          <ActivityIndicator size="large" color="#6d3b7c" />

          <Text style={styles.loadingText}>Učitavanje rezervacije...</Text>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditMode ? "Izmena rezervacije" : "Nova rezervacija",
        }}
      />

      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.dateCard}>
              <Text style={styles.dateLabel}>Datum proslave</Text>

              <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
            </View>

            <View style={styles.timeCard}>
              <View style={styles.timeHeader}>
                <Text style={styles.timeLabel}>Početak proslave</Text>
                <Text style={styles.selectedTime}>{startTime}</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timeRuler}
              >
                {startTimeOptions.map((time) => {
                  const selected = startTime === time;

                  return (
                    <Pressable
                      key={time}
                      style={[
                        styles.timeOption,
                        selected && styles.selectedTimeOption,
                      ]}
                      onPress={() => setStartTime(time)}
                    >
                      <View
                        style={[
                          styles.timeTick,
                          selected && styles.selectedTimeTick,
                        ]}
                      />

                      <Text
                        style={[
                          styles.timeOptionText,
                          selected && styles.selectedTimeOptionText,
                        ]}
                      >
                        {time}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <Section title="Osnovni podaci">
              <Field
                label="Ko proslavlja *"
                value={celebrantName}
                onChangeText={setCelebrantName}
                placeholder="Na primer: Ana i Marko"
              />

              <Field
                label="Ko zakazuje *"
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Ime i prezime"
              />

              <Field
                label="Broj telefona *"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="06..."
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Vrsta proslave</Text>

              <View style={styles.chipContainer}>
                {celebrationTypes.map((type) => (
                  <ChoiceChip
                    key={type}
                    label={type}
                    selected={celebrationType === type}
                    onPress={() => setCelebrationType(type)}
                  />
                ))}
              </View>

              <Text style={styles.label}>Status</Text>

              <View style={styles.chipContainer}>
                {reservationStatuses.map((item) => (
                  <ChoiceChip
                    key={item}
                    label={item}
                    selected={status === item}
                    onPress={() => setStatus(item)}
                  />
                ))}
              </View>
            </Section>

            <Section title="Gosti i cena">
              <View style={styles.twoColumns}>
                <View style={styles.column}>
                  <Field
                    label="Broj gostiju *"
                    value={guestCount}
                    onChangeText={setGuestCount}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                </View>

                <View style={styles.column}>
                  <Field
                    label="Gratis mesta"
                    value={complimentaryGuests}
                    onChangeText={setComplimentaryGuests}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                </View>
              </View>

              <View style={styles.twoColumns}>
                <View style={styles.column}>
                  <Field
                    label="Gostiju koji poste"
                    value={fastingGuests}
                    onChangeText={setFastingGuests}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                </View>

                <View style={styles.column}>
                  <Field
                    label="Cena po osobi"
                    value={pricePerPerson}
                    onChangeText={setPricePerPerson}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                </View>
              </View>

              <View style={styles.calculationCard}>
                <CalculationRow
                  label="Gostiju za naplatu"
                  value={String(calculation.chargedGuests)}
                />

                <CalculationRow
                  label="Osnovna cena"
                  value={`${calculation.basePrice.toLocaleString("sr-RS")} RSD`}
                  emphasized
                />
              </View>
            </Section>

            <Section title="Organizacija proslave">
              <Field
                label="Jelovnik"
                value={menu}
                onChangeText={setMenu}
                placeholder="Dogovoreni meni i posebni zahtevi"
                multiline
              />

              <Field
                label="Muzika"
                value={music}
                onChangeText={setMusic}
                placeholder="Bend, DJ ili druga muzika"
              />

              <SwitchRow
                label="Torta"
                value={hasCake}
                onValueChange={setHasCake}
              />

              <SwitchRow
                label="Dim, prskalice ili slično"
                value={hasSmoke}
                onValueChange={setHasSmoke}
              />

              <SwitchRow
                label="Dekoracija"
                value={hasDecoration}
                onValueChange={setHasDecoration}
              />
            </Section>

            <Section title="Napomena">
              <Field
                label="Dodatni dogovor"
                value={notes}
                onChangeText={setNotes}
                placeholder="Sve ostale informacije o proslavi"
                multiline
              />
            </Section>

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.saveButtonPressed,
                isSaving && styles.disabledButton,
              ]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={styles.saveButtonText}>
                {isSaving
                  ? "Čuvanje..."
                  : isEditMode
                    ? "Sačuvaj izmene"
                    : "Sačuvaj rezervaciju"}
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

type SectionProps = {
  title: string;
  children: ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {children}
    </View>
  );
}

type FieldProps = {
  label: string;
  value: string;

  onChangeText: (value: string) => void;

  placeholder?: string;

  keyboardType?: "default" | "number-pad" | "phone-pad";

  multiline?: boolean;
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#a59da7"
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

type ChoiceChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function ChoiceChip({ label, selected, onPress }: ChoiceChipProps) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.selectedChip]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.selectedChipText]}>
        {label}
      </Text>
    </Pressable>
  );
}

type SwitchRowProps = {
  label: string;
  value: boolean;

  onValueChange: (value: boolean) => void;
};

function SwitchRow({ label, value, onValueChange }: SwitchRowProps) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: "#d8d2da",
          true: "#b98cc5",
        }}
        thumbColor={value ? "#6d3b7c" : "#ffffff"}
      />
    </View>
  );
}

type CalculationRowProps = {
  label: string;
  value: string;
  emphasized?: boolean;
};

function CalculationRow({
  label,
  value,
  emphasized = false,
}: CalculationRowProps) {
  return (
    <View style={styles.calculationRow}>
      <Text style={styles.calculationLabel}>{label}</Text>

      <Text
        style={[styles.calculationValue, emphasized && styles.emphasizedValue]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: "#f7f4f8",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7f4f8",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6c6370",
  },

  container: {
    padding: 16,
    paddingBottom: 30,
  },

  dateCard: {
    padding: 16,
    backgroundColor: "#eadfec",
    borderRadius: 14,
  },

  dateLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    color: "#765d7c",
  },

  dateText: {
    marginTop: 4,
    fontSize: 19,
    fontWeight: "700",
    color: "#35213b",
    textTransform: "capitalize",
  },
  timeCard: {
    marginTop: 12,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    elevation: 2,
  },

  timeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },

  timeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#514654",
  },

  selectedTime: {
    fontSize: 22,
    fontWeight: "700",
    color: "#6d3b7c",
  },

  timeRuler: {
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 2,
  },

  timeOption: {
    width: 68,
    alignItems: "center",
    paddingVertical: 7,
    marginHorizontal: 2,
    borderRadius: 12,
  },

  selectedTimeOption: {
    backgroundColor: "#6d3b7c",
  },

  timeTick: {
    width: 2,
    height: 10,
    marginBottom: 5,
    backgroundColor: "#c8bdcb",
    borderRadius: 1,
  },

  selectedTimeTick: {
    height: 15,
    backgroundColor: "#ffffff",
  },

  timeOptionText: {
    fontSize: 13,
    color: "#675b6a",
  },

  selectedTimeOptionText: {
    fontWeight: "700",
    color: "#ffffff",
  },
  section: {
    marginTop: 18,
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    elevation: 2,
  },

  sectionTitle: {
    marginBottom: 16,
    fontSize: 20,
    fontWeight: "700",
    color: "#4a2853",
  },

  field: {
    marginBottom: 15,
  },

  label: {
    marginBottom: 7,
    fontSize: 14,
    fontWeight: "600",
    color: "#514654",
  },

  input: {
    minHeight: 48,
    paddingHorizontal: 13,
    backgroundColor: "#faf8fb",
    borderWidth: 1,
    borderColor: "#ded7e0",
    borderRadius: 11,
    fontSize: 16,
    color: "#2e2730",
  },

  multilineInput: {
    minHeight: 100,
    paddingTop: 13,
  },

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 15,
  },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#f2edf3",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd4df",
  },

  selectedChip: {
    backgroundColor: "#6d3b7c",
    borderColor: "#6d3b7c",
  },

  chipText: {
    fontSize: 14,
    color: "#594d5c",
  },

  selectedChipText: {
    fontWeight: "600",
    color: "#ffffff",
  },

  twoColumns: {
    flexDirection: "row",
    gap: 12,
  },

  column: {
    flex: 1,
  },

  calculationCard: {
    padding: 14,
    backgroundColor: "#f1e9f3",
    borderRadius: 12,
  },

  calculationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },

  calculationLabel: {
    fontSize: 15,
    color: "#66596a",
  },

  calculationValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#35213b",
  },

  emphasizedValue: {
    color: "#6d3b7c",
    fontSize: 18,
  },

  switchRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eee9ef",
  },

  switchLabel: {
    flex: 1,
    paddingRight: 12,
    fontSize: 16,
    color: "#443947",
  },

  saveButton: {
    marginTop: 22,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6d3b7c",
    borderRadius: 14,
  },

  saveButtonPressed: {
    backgroundColor: "#542d61",
  },

  disabledButton: {
    opacity: 0.6,
  },

  saveButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
  },
});
