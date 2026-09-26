import * as SQLite from "expo-sqlite";

/** The phone's local database (see store.ts). The web demo swaps in db.web.ts. */
export const sqlite = SQLite.openDatabaseSync("canton.db");
export const memoryDb = false;
