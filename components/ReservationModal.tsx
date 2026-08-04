import {
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
  celebrant_name: string;
  customer_name: string;
  phone_number: string;

  celebration_type: string;
  status: string;

  guest_count: number;
  complimentary_guests: number;
  fasting_guests: number;
  price_per_person: number;
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

export default function ReservationModal({
  visible,
  reservation,
  onClose,
  onEdit,
  onConfirm,
  onDelete,
}: ReservationModalProps) {
  if (!reservation) {
    return null;
  }

  const chargedGuests = Math.max(
    0,
    reservation.guest_count - reservation.complimentary_guests,
  );

  const basePrice = chargedGuests * reservation.price_per_person;

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

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status</Text>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{reservation.status}</Text>
              </View>
            </View>

            <View style={styles.details}>
              <DetailRow
                label="Ko zakazuje"
                value={reservation.customer_name}
              />

              <DetailRow label="Telefon" value={reservation.phone_number} />

              <DetailRow
                label="Broj gostiju"
                value={String(reservation.guest_count)}
              />

              <DetailRow
                label="Gratis mesta"
                value={String(reservation.complimentary_guests)}
              />

              <DetailRow
                label="Gostiju za naplatu"
                value={String(chargedGuests)}
              />

              <DetailRow
                label="Gostiju koji poste"
                value={String(reservation.fasting_guests)}
              />

              <DetailRow
                label="Cena po osobi"
                value={`${formatPrice(reservation.price_per_person)} RSD`}
              />
            </View>

            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Osnovna vrednost</Text>

              <Text style={styles.totalValue}>
                {formatPrice(basePrice)} RSD
              </Text>
            </View>

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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },

  modalCard: {
    maxHeight: "88%",
    backgroundColor: "#ffffff",
    borderRadius: 22,
    overflow: "hidden",
  },

  content: {
    padding: 20,
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
    marginTop: 20,
  },

  statusLabel: {
    fontSize: 15,
    color: "#716574",
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#6d3b7c",
    borderRadius: 14,
  },

  statusText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },

  details: {
    marginTop: 18,
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
