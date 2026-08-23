import { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type ReservationModalData = {
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
  currency?: string | null;

  menu: string | null;
  music: string | null;

  has_cake: number;
  has_smoke: number;
  has_sparklers?: number;
  has_decoration: number;

  has_white_tablecloths?: number;
  has_black_tablecloths?: number;
  table_layout_image_uri?: string | null;

  notes: string | null;
};

type ReservationModalProps = {
  visible: boolean;
  reservation: ReservationModalData | null;

  onClose: () => void;
  onEdit: (reservation: ReservationModalData) => void;
  onConfirm: (reservation: ReservationModalData) => void;
  onDelete: (reservation: ReservationModalData) => void;
};

function formatPrice(value: number) {
  return value.toLocaleString("sr-RS");
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("sr-RS", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getStatusColor(status: string) {
  switch (status) {
    case "Upit":
      return "#f5a000";

    case "Rezervisano":
      return "#1685bd";

    case "Potvrđeno":
      return "#159963";

    default:
      return "#6d3b7c";
  }
}

export default function ReservationModal({
  visible,
  reservation,
  onClose,
  onEdit,
  onConfirm,
  onDelete,
}: ReservationModalProps) {
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setShowAll(false);
  }, [visible, reservation?.id]);

  if (!reservation) {
    return null;
  }

  const basePrice = reservation.guest_count * reservation.price_per_person;
  const currency = reservation.currency === "EUR" ? "EUR" : "RSD";

  const hasAdditionalServices =
    reservation.has_smoke === 1 ||
    reservation.has_sparklers === 1 ||
    reservation.has_white_tablecloths === 1 ||
    reservation.has_black_tablecloths === 1;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {/* HEADER */}

            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>{reservation.celebrant_name}</Text>

                <Text style={styles.subtitle}>
                  {reservation.celebration_type}
                </Text>
              </View>

              <Pressable style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            {/* STATUS */}

            <View style={styles.statusRow}>
              <Text style={styles.dateText}>
                {formatDate(reservation.celebration_date)}
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: getStatusColor(reservation.status),
                  },
                ]}
              >
                <Text style={styles.statusText}>{reservation.status}</Text>
              </View>
            </View>

            {/* OSNOVNI PODACI */}

            <SectionTitle title="Osnovni podaci" />

            <View style={styles.details}>
              <DetailRow
                label="Ko zakazuje"
                value={reservation.customer_name}
              />

              <DetailRow label="Telefon" value={reservation.phone_number} />

              <DetailRow
                label="Početak"
                value={reservation.start_time ?? "Nije uneto"}
              />

              <DetailRow
                label="Broj gostiju"
                value={String(reservation.guest_count)}
              />

              <DetailRow
                label="Cena po osobi"
                value={`${formatPrice(reservation.price_per_person)} ${currency}`}
              />
            </View>

            {/* CENA */}

            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Osnovna vrednost proslave</Text>

              <Text style={styles.totalValue}>
                {formatPrice(basePrice)} {currency}
              </Text>

              <Text style={styles.totalExplanation}>
                {reservation.guest_count} ×{" "}
                {formatPrice(reservation.price_per_person)} {currency}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.showAllButton,
                pressed && styles.showAllButtonPressed,
              ]}
              onPress={() => setShowAll((current) => !current)}
            >
              <Text style={styles.showAllButtonText}>
                {showAll ? "Prikaži manje ▲" : "Prikaži sve ▼"}
              </Text>
            </Pressable>

            {showAll && (
              <View style={styles.expandedContent}>
                <SectionTitle title="Detalji proslave" />

                <View style={styles.details}>
                  <DetailRow
                    label="Vrsta proslave"
                    value={reservation.celebration_type}
                  />

                  <DetailRow
                    label="Gostiju koji poste"
                    value={String(reservation.fasting_guests)}
                  />
                </View>

                {!!reservation.menu?.trim() && (
                  <InfoCard title="Jelovnik" value={reservation.menu} />
                )}

                <Text style={styles.additionalTitle}>
                  Organizacija proslave
                </Text>

                {hasAdditionalServices ? (
                  <View style={styles.serviceContainer}>
                    {reservation.has_smoke === 1 && (
                      <ServiceBadge label="Dim" />
                    )}

                    {reservation.has_sparklers === 1 && (
                      <ServiceBadge label="Prskalice" />
                    )}

                    {reservation.has_white_tablecloths === 1 && (
                      <ServiceBadge label="Beli stolnjaci" />
                    )}

                    {reservation.has_black_tablecloths === 1 && (
                      <ServiceBadge label="Crni stolnjaci" />
                    )}
                  </View>
                ) : (
                  <Text style={styles.noServicesText}>
                    Nema izabranih dodatnih opcija.
                  </Text>
                )}

                {!!reservation.table_layout_image_uri && (
                  <>
                    <SectionTitle title="Skica stolova" />
                    <Image
                      source={{ uri: reservation.table_layout_image_uri }}
                      style={styles.tableLayoutImage}
                      resizeMode="contain"
                    />
                  </>
                )}

                {!!reservation.notes?.trim() && (
                  <>
                    <SectionTitle title="Napomena" />
                    <View style={styles.notesCard}>
                      <Text style={styles.notesText}>{reservation.notes}</Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* POTVRĐENO */}

            {reservation.status === "Potvrđeno" && (
              <View style={styles.confirmedCard}>
                <Text style={styles.confirmedText}>
                  ✓ Rezervacija je potvrđena
                </Text>
              </View>
            )}

            {/* DUGMAD */}

            {reservation.status !== "Potvrđeno" && (
              <Pressable
                style={styles.confirmButton}
                onPress={() => onConfirm(reservation)}
              >
                <Text style={styles.confirmButtonText}>
                  ✓ Potvrdi rezervaciju
                </Text>
              </Pressable>
            )}

            <Pressable
              style={styles.editButton}
              onPress={() => onEdit(reservation)}
            >
              <Text style={styles.editButtonText}>Izmeni rezervaciju</Text>
            </Pressable>

            <Pressable
              style={styles.deleteButton}
              onPress={() => onDelete(reservation)}
            >
              <Text style={styles.deleteButtonText}>Obriši rezervaciju</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

type SectionTitleProps = {
  title: string;
};

function SectionTitle({ title }: SectionTitleProps) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

type InfoCardProps = {
  title: string;
  value: string;
};

function InfoCard({ title, value }: InfoCardProps) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

type ServiceBadgeProps = {
  label: string;
};

function ServiceBadge({ label }: ServiceBadgeProps) {
  return (
    <View style={styles.serviceBadge}>
      <Text style={styles.serviceBadgeText}>✓ {label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },

  modalCard: {
    maxHeight: "90%",
    backgroundColor: "#ffffff",
    borderRadius: 22,
    overflow: "hidden",
  },

  content: {
    padding: 20,
    paddingBottom: 26,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  titleContainer: {
    flex: 1,
    paddingRight: 12,
  },

  title: {
    fontSize: 23,
    fontWeight: "700",
    color: "#35213b",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: "#756978",
  },

  closeButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1ebf2",
    borderRadius: 19,
  },

  closeButtonText: {
    marginTop: -3,
    fontSize: 28,
    color: "#5f5062",
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 20,
  },

  dateText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#5f5062",
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },

  statusText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },

  sectionTitle: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: "700",
    color: "#54275e",
  },

  details: {
    borderTopWidth: 1,
    borderTopColor: "#eee8ef",
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#eee8ef",
  },

  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: "#786d7b",
  },

  detailValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 15,
    fontWeight: "600",
    color: "#3e3341",
  },

  totalCard: {
    marginTop: 18,
    padding: 16,
    backgroundColor: "#f0e7f2",
    borderRadius: 14,
  },

  totalLabel: {
    fontSize: 14,
    color: "#756079",
  },

  totalValue: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: "700",
    color: "#6d3b7c",
  },

  totalExplanation: {
    marginTop: 4,
    fontSize: 13,
    color: "#87758b",
  },

  showAllButton: {
    minHeight: 46,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#7e3788",
    borderRadius: 12,
  },

  showAllButtonPressed: {
    backgroundColor: "#f3eaf5",
  },

  showAllButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#7e3788",
  },

  expandedContent: {
    paddingBottom: 2,
  },

  infoCard: {
    marginTop: 8,
    padding: 14,
    backgroundColor: "#f8f5f9",
    borderRadius: 12,
  },

  infoTitle: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#756079",
  },

  infoValue: {
    fontSize: 15,
    lineHeight: 21,
    color: "#3e3341",
  },

  additionalTitle: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "700",
    color: "#665869",
  },

  serviceContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  serviceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#e6f5ec",
    borderRadius: 18,
  },

  serviceBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#258356",
  },

  noServicesText: {
    paddingVertical: 4,
    fontSize: 14,
    color: "#8b808e",
  },

  tableLayoutImage: {
    width: "100%",
    height: 230,
    backgroundColor: "#f8f5f9",
    borderWidth: 1,
    borderColor: "#e5dce7",
    borderRadius: 12,
  },

  notesCard: {
    padding: 14,
    backgroundColor: "#fff8e8",
    borderLeftWidth: 4,
    borderLeftColor: "#e6a23c",
    borderRadius: 10,
  },

  notesText: {
    fontSize: 15,
    lineHeight: 21,
    color: "#4b414d",
  },

  confirmedCard: {
    marginTop: 22,
    padding: 14,
    alignItems: "center",
    backgroundColor: "#e7f5ed",
    borderRadius: 13,
  },

  confirmedText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#258356",
  },

  confirmButton: {
    minHeight: 52,
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3c9b67",
    borderRadius: 13,
  },

  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },

  editButton: {
    minHeight: 52,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6d3b7c",
    borderRadius: 13,
  },

  editButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },

  deleteButton: {
    minHeight: 48,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff4f4",
    borderWidth: 1,
    borderColor: "#d65b5b",
    borderRadius: 13,
  },

  deleteButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#b63f3f",
  },
});
