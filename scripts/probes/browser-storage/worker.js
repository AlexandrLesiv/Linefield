/* Synthetic fixture only: SQL is fixed by trusted scenario code, never app/UI input. */
importScripts("/vendor/sqlite3.js");
const ready = sqlite3InitModule({ print: () => {}, printErr: (...args) => console.error(...args) });
let database;
let release;
function query(sql) {
  return database.exec({ sql, rowMode: "array", returnValue: "resultRows" });
}
async function dispatch(message) {
  const sqlite = await ready;
  if (message.kind === "open") {
    return new Promise((resolve, reject) => {
      navigator.locks
        .request(message.lock, { ifAvailable: true }, async (lock) => {
          if (!lock) {
            resolve({ admitted: false });
            return;
          }
          try {
            database = new sqlite.oo1.OpfsDb(message.file, "c");
            query("PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;");
            const pragmas = [
              query("PRAGMA journal_mode;"),
              query("PRAGMA synchronous;"),
              query("PRAGMA foreign_keys;"),
            ];
            const held = new Promise((done) => {
              release = done;
            });
            resolve({
              admitted: true,
              pragmas,
              version: query("SELECT sqlite_version(), sqlite_source_id()"),
            });
            await held;
          } catch (error) {
            reject(error);
          }
        })
        .catch(reject);
    });
  }
  if (message.kind === "sql") return query(message.sql);
  if (message.kind === "close") {
    database.close();
    database = undefined;
    release();
    return "closed";
  }
  if (message.kind === "catalog") {
    return navigator.locks.request("probe:catalog", async () => {
      database = new sqlite.oo1.OpfsDb("/catalog.sqlite", "c");
      query("PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;");
      query("CREATE TABLE IF NOT EXISTS entries(id INTEGER PRIMARY KEY);");
      query(`BEGIN; INSERT INTO entries VALUES(${message.value}); COMMIT;`);
      const rows = query("SELECT id FROM entries ORDER BY id;");
      database.close();
      database = undefined;
      return rows;
    });
  }
  throw new Error("Unknown fixture command");
}
onmessage = async ({ data }) => {
  try {
    postMessage({ id: data.id, value: await dispatch(data) });
  } catch (error) {
    postMessage({ id: data.id, error: String(error) });
  }
};
