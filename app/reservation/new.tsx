import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
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
  fasting_guests: number;
  price_per_person: number;
  currency: string;
  menu: string | null;
  has_smoke: number;
  has_sparklers: number;

  has_white_tablecloths: number;
  has_black_tablecloths: number;

  table_layout_image_uri: string | null;

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

  const [customerName, setCustomerName] = useState("");

  const [phoneNumber, setPhoneNumber] = useState("");

  const [celebrationType, setCelebrationType] = useState("Rođendan");

  const [status, setStatus] = useState("Upit");

  const [guestCount, setGuestCount] = useState("5");

  const [fastingGuests, setFastingGuests] = useState("0");

  const [pricePerPerson, setPricePerPerson] = useState("");
  const [currency, setCurrency] = useState("RSD");
  const [menu, setMenu] = useState("");

  const [hasSmoke, setHasSmoke] = useState(false);
  const [hasSparklers, setHasSparklers] = useState(false);

  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(isEditMode);

  const [isSaving, setIsSaving] = useState(false);
  const [hasWhiteTablecloths, setHasWhiteTablecloths] = useState(false);

  const [hasBlackTablecloths, setHasBlackTablecloths] = useState(false);

  const [tableLayoutImageUri, setTableLayoutImageUri] = useState<string | null>(
    null,
  );

  const [isImageOpen, setIsImageOpen] = useState(false);
  const [isSelectingImage, setIsSelectingImage] = useState(false);
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
      fasting_guests,
      price_per_person,
      currency,
      menu,
      has_smoke,
      has_sparklers,
      has_white_tablecloths,
      has_black_tablecloths,
      table_layout_image_uri,
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

        setCustomerName(
          reservation.customer_name || reservation.celebrant_name,
        );

        setPhoneNumber(reservation.phone_number);
        setCelebrationType(reservation.celebration_type);
        setStatus(reservation.status);

        setGuestCount(String(reservation.guest_count));
        setFastingGuests(String(reservation.fasting_guests));
        setPricePerPerson(String(reservation.price_per_person));
        setCurrency(reservation.currency ?? "RSD");
        setMenu(reservation.menu ?? "");
        setHasSmoke(reservation.has_smoke === 1);
        setHasSparklers(reservation.has_sparklers === 1);

        setHasWhiteTablecloths(reservation.has_white_tablecloths === 1);

        setHasBlackTablecloths(reservation.has_black_tablecloths === 1);

        setTableLayoutImageUri(reservation.table_layout_image_uri ?? null);

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
    const price = toNumber(pricePerPerson);

    return {
      basePrice: guests * price,
    };
  }, [guestCount, pricePerPerson]);
  async function saveImagePermanently(sourceUri: string) {
    const directory = `${FileSystem.documentDirectory}table-layouts`;

    await FileSystem.makeDirectoryAsync(directory, {
      intermediates: true,
    });

    const extensionPart = sourceUri
      .split(".")
      .pop()
      ?.split("?")[0]
      .toLowerCase();

    const allowedExtensions = ["jpg", "jpeg", "png", "heic", "webp"];

    const extension =
      extensionPart && allowedExtensions.includes(extensionPart)
        ? extensionPart
        : "jpg";

    const destination = `${directory}/skica-${Date.now()}.${extension}`;

    await FileSystem.copyAsync({
      from: sourceUri,
      to: destination,
    });

    return destination;
  }

  async function handleImageSelection(source: "camera" | "gallery") {
    try {
      setIsSelectingImage(true);

      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {
          Alert.alert("Nema dozvole", "Potrebno je dozvoliti pristup kameri.");

          return;
        }
      } else {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            "Nema dozvole",
            "Potrebno je dozvoliti pristup galeriji.",
          );

          return;
        }
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              allowsEditing: false,
              quality: 0.8,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              allowsEditing: false,
              quality: 0.8,
            });

      if (result.canceled || !result.assets[0]?.uri) {
        return;
      }

      const permanentUri = await saveImagePermanently(result.assets[0].uri);

      setTableLayoutImageUri(permanentUri);
    } catch (error) {
      console.error("Greška pri dodavanju skice:", error);

      Alert.alert("Greška", "Slika skice nije dodata.");
    } finally {
      setIsSelectingImage(false);
    }
  }
  async function handleSave() {
    const guests = toNumber(guestCount);

    const fasting = toNumber(fastingGuests);

    const price = toNumber(pricePerPerson);

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
      complimentary_guests = 0,
      fasting_guests = ?,
      price_per_person = ?,
      currency = ?,
      menu = ?,
      music = NULL,
      has_cake = 0,
      has_smoke = ?,
      has_sparklers = ?,
      has_decoration = 0,
      has_white_tablecloths = ?,
      has_black_tablecloths = ?,
      table_layout_image_uri = ?,
      notes = ?,
      updated_at = ?
    WHERE id = ?
  `,
          [
            startTime,
            customerName.trim(),
            customerName.trim(),
            phoneNumber.trim(),
            celebrationType,
            status,
            guests,
            fasting,
            price,
            currency,
            menu.trim(),
            hasSmoke ? 1 : 0,
            hasSparklers ? 1 : 0,
            hasWhiteTablecloths ? 1 : 0,
            hasBlackTablecloths ? 1 : 0,
            tableLayoutImageUri,
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
      currency,
      menu,
      music,
      has_cake,
      has_smoke,
      has_sparklers,
      has_decoration,
      has_white_tablecloths,
      has_black_tablecloths,
      table_layout_image_uri,
      notes,
      created_at
    )
    VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?,
      NULL, 0, ?, ?, 0, ?, ?, ?, ?, ?
    )
  `,
          [
            selectedDate,
            startTime,
            customerName.trim(),
            customerName.trim(),
            phoneNumber.trim(),
            celebrationType,
            status,
            guests,
            fasting,
            price,
            currency,
            menu.trim(),
            hasSmoke ? 1 : 0,
            hasSparklers ? 1 : 0,
            hasWhiteTablecloths ? 1 : 0,
            hasBlackTablecloths ? 1 : 0,
            tableLayoutImageUri,
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
                label="Ime i prezime osobe koja zakazuje *"
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
                    placeholder="5"
                  />
                </View>

                <View style={styles.column}>
                  <Field
                    label="Gostiju koji poste"
                    value={fastingGuests}
                    onChangeText={setFastingGuests}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                </View>
              </View>

              <Field
                label="Cena po osobi"
                value={pricePerPerson}
                onChangeText={setPricePerPerson}
                keyboardType="number-pad"
                placeholder="0"
              />
              <Text style={styles.label}>Valuta</Text>

              <View style={styles.chipContainer}>
                <ChoiceChip
                  label="Dinar (RSD)"
                  selected={currency === "RSD"}
                  onPress={() => setCurrency("RSD")}
                />

                <ChoiceChip
                  label="Evro (EUR)"
                  selected={currency === "EUR"}
                  onPress={() => setCurrency("EUR")}
                />
              </View>
              <View style={styles.calculationCard}>
                <CalculationRow
                  label="Osnovna cena"
                  value={`${calculation.basePrice.toLocaleString("sr-RS")} ${
                    currency === "EUR" ? "€" : "RSD"
                  }`}
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

              <SwitchRow
                label="Dim"
                value={hasSmoke}
                onValueChange={setHasSmoke}
              />

              <SwitchRow
                label="Prskalice"
                value={hasSparklers}
                onValueChange={setHasSparklers}
              />
              <SwitchRow
                label="Beli stolnjaci"
                value={hasWhiteTablecloths}
                onValueChange={setHasWhiteTablecloths}
              />

              <SwitchRow
                label="Crni stolnjaci"
                value={hasBlackTablecloths}
                onValueChange={setHasBlackTablecloths}
              />
            </Section>
            <Section title="Skica rasporeda stolova">
              {tableLayoutImageUri ? (
                <>
                  <Pressable onPress={() => setIsImageOpen(true)}>
                    <Image
                      source={{ uri: tableLayoutImageUri }}
                      style={styles.layoutImage}
                      resizeMode="cover"
                    />
                  </Pressable>

                  <View style={styles.imageButtonRow}>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => setIsImageOpen(true)}
                    >
                      <Text style={styles.secondaryButtonText}>Otvori</Text>
                    </Pressable>

                    <Pressable
                      style={styles.removeImageButton}
                      onPress={() => setTableLayoutImageUri(null)}
                    >
                      <Text style={styles.removeImageButtonText}>Ukloni</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <Text style={styles.noImageText}>Skica još nije dodata.</Text>
              )}

              <Pressable
                style={styles.imageActionButton}
                onPress={() => handleImageSelection("camera")}
                disabled={isSelectingImage}
              >
                <Text style={styles.imageActionButtonText}>
                  Fotografiši skicu
                </Text>
              </Pressable>

              <Pressable
                style={styles.imageActionButtonSecondary}
                onPress={() => handleImageSelection("gallery")}
                disabled={isSelectingImage}
              >
                <Text style={styles.imageActionButtonSecondaryText}>
                  Izaberi iz galerije
                </Text>
              </Pressable>
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

      <Modal
        visible={isImageOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsImageOpen(false)}
      >
        <View style={styles.imageModalOverlay}>
          <Pressable
            style={styles.imageModalClose}
            onPress={() => setIsImageOpen(false)}
          >
            <Text style={styles.imageModalCloseText}>×</Text>
          </Pressable>

          {tableLayoutImageUri && (
            <Image
              source={{ uri: tableLayoutImageUri }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
  imageModalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.92)",
  },

  imageModalClose: {
    position: "absolute",
    top: 45,
    right: 20,
    zIndex: 2,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 22,
  },

  imageModalCloseText: {
    marginTop: -3,
    fontSize: 32,
    color: "#ffffff",
  },

  fullImage: {
    width: "94%",
    height: "84%",
  },
  layoutImage: {
    width: "100%",
    height: 230,
    backgroundColor: "#f1edf2",
    borderRadius: 12,
  },

  imageButtonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },

  secondaryButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eee4f0",
    borderRadius: 10,
  },

  secondaryButtonText: {
    fontWeight: "700",
    color: "#6d3b7c",
  },

  removeImageButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff1f1",
    borderRadius: 10,
  },

  removeImageButtonText: {
    fontWeight: "700",
    color: "#b64040",
  },

  noImageText: {
    marginBottom: 12,
    fontSize: 14,
    color: "#817584",
  },

  imageActionButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6d3b7c",
    borderRadius: 11,
  },

  imageActionButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },

  imageActionButtonSecondary: {
    minHeight: 48,
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#6d3b7c",
    borderRadius: 11,
  },

  imageActionButtonSecondaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6d3b7c",
  },
});
