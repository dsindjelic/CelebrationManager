import { SQLiteDatabase } from "expo-sqlite";

type TableColumn = {
  name: string;
};

export async function initializeDatabase(database: SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      celebration_date TEXT NOT NULL,
      start_time TEXT,

      celebrant_name TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      phone_number TEXT NOT NULL,

      celebration_type TEXT NOT NULL,
      status TEXT NOT NULL,

      guest_count INTEGER NOT NULL DEFAULT 0,
      complimentary_guests INTEGER NOT NULL DEFAULT 0,
      fasting_guests INTEGER NOT NULL DEFAULT 0,
      price_per_person INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'RSD',

      menu TEXT,
      music TEXT,

      has_cake INTEGER NOT NULL DEFAULT 0,
      has_smoke INTEGER NOT NULL DEFAULT 0,
      has_decoration INTEGER NOT NULL DEFAULT 0,

      has_white_tablecloths INTEGER NOT NULL DEFAULT 0,
      has_black_tablecloths INTEGER NOT NULL DEFAULT 0,

      table_layout_image_uri TEXT,

      notes TEXT,

      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE INDEX IF NOT EXISTS
      idx_reservations_celebration_date
      ON reservations (celebration_date);
  `);

  /*
   * CREATE TABLE IF NOT EXISTS ne dodaje nove kolone u već
   * postojeću bazu. Zato proveravamo postojeću strukturu.
   */
  const columns = await database.getAllAsync<TableColumn>(
    "PRAGMA table_info(reservations);",
  );

  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has("start_time")) {
    await database.execAsync(`
      ALTER TABLE reservations
      ADD COLUMN start_time TEXT;
    `);

    console.log("Dodata je kolona start_time.");
  }

  if (!columnNames.has("has_white_tablecloths")) {
    await database.execAsync(`
      ALTER TABLE reservations
      ADD COLUMN has_white_tablecloths INTEGER NOT NULL DEFAULT 0;
    `);

    console.log("Dodata je kolona has_white_tablecloths.");
  }

  if (!columnNames.has("has_black_tablecloths")) {
    await database.execAsync(`
      ALTER TABLE reservations
      ADD COLUMN has_black_tablecloths INTEGER NOT NULL DEFAULT 0;
    `);

    console.log("Dodata je kolona has_black_tablecloths.");
  }

  if (!columnNames.has("table_layout_image_uri")) {
    await database.execAsync(`
      ALTER TABLE reservations
      ADD COLUMN table_layout_image_uri TEXT;
    `);

    console.log("Dodata je kolona table_layout_image_uri.");
  }
  if (!columnNames.has("currency")) {
    await database.execAsync(`
    ALTER TABLE reservations
    ADD COLUMN currency TEXT NOT NULL DEFAULT 'RSD';
  `);

    console.log("Dodata je kolona currency.");
  }
  console.log("SQLite baza je inicijalizovana.");
}
