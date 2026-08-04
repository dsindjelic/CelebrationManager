import { SQLiteDatabase } from "expo-sqlite";

export async function initializeDatabase(database: SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      celebration_date TEXT NOT NULL,
      celebrant_name TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      phone_number TEXT NOT NULL,

      celebration_type TEXT NOT NULL,
      status TEXT NOT NULL,

      guest_count INTEGER NOT NULL DEFAULT 0,
      complimentary_guests INTEGER NOT NULL DEFAULT 0,
      fasting_guests INTEGER NOT NULL DEFAULT 0,
      price_per_person INTEGER NOT NULL DEFAULT 0,

      menu TEXT,
      music TEXT,

      has_cake INTEGER NOT NULL DEFAULT 0,
      has_smoke INTEGER NOT NULL DEFAULT 0,
      has_decoration INTEGER NOT NULL DEFAULT 0,

      notes TEXT,

      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE INDEX IF NOT EXISTS
      idx_reservations_celebration_date
      ON reservations (celebration_date);
  `);

  console.log("SQLite baza je inicijalizovana.");
}
