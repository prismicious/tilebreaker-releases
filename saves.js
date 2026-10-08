// The full game's browser saves, read and written the way the Godot web build
// keeps them, so they can be handed from the old public address to the gated
// one. Loaded by both ends of the hand-over: hosting/moved/ on the old origin
// and the gate's /__gate/carry-over page on the new one.
//
// Where the saves are. A Godot 4.3 web build mounts user:// at /userfs on
// Emscripten's IDBFS, which keeps one IndexedDB database named "/userfs",
// version 21, with one object store "FILE_DATA" and a "timestamp" index. Each
// key is a full path, each value {timestamp, mode} for a directory and
// {timestamp, mode, contents} for a file (see IDBFS in the bundle's index.js).
// Checkpoints also keep a synchronous copy in localStorage under keys that start
// "tilebreaker." (scripts/core/run_save_store.gd, pending_transmute_store.gd).
//
// What is the full game's. The demo was hosted on the same origin and keeps
// its files under a "demo-" prefix (DemoRules.storage_path), so a path under
// /userfs/demo- and a localStorage key naming a demo- file are the demo's and
// are never read, sent, written or deleted here.

(function () {
  "use strict";

  const DB_NAME = "/userfs";
  const DB_VERSION = 21;
  const STORE = "FILE_DATA";
  const ROOT = "/userfs/";
  const KEY_PREFIX = "tilebreaker.";

  function isFullGamePath(path) {
    return typeof path === "string" && path.startsWith(ROOT) && !path.startsWith(ROOT + "demo-");
  }

  function isFullGameKey(key) {
    return typeof key === "string" && key.startsWith(KEY_PREFIX) && !key.includes(":demo-");
  }

  function request(idbRequest) {
    return new Promise((resolve, reject) => {
      idbRequest.onsuccess = () => resolve(idbRequest.result);
      idbRequest.onerror = () => reject(idbRequest.error);
    });
  }

  // Opens the database exactly as Emscripten would, creating the store and the
  // index on first use, so the game finds what it expects when it boots.
  function open() {
    return new Promise((resolve, reject) => {
      const opening = indexedDB.open(DB_NAME, DB_VERSION);
      opening.onupgradeneeded = () => {
        const db = opening.result;
        const store = db.objectStoreNames.contains(STORE)
          ? opening.transaction.objectStore(STORE)
          : db.createObjectStore(STORE);
        if (!store.indexNames.contains("timestamp")) store.createIndex("timestamp", "timestamp", { unique: false });
      };
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error);
      opening.onblocked = () => reject(new Error("another tab of the game is holding its saves open"));
    });
  }

  // Whether this origin has a save database at all, asked without creating
  // one: indexedDB.open() on a name that does not exist makes it.
  async function databaseExists() {
    if (typeof indexedDB.databases !== "function") return true;
    const known = await indexedDB.databases();
    return known.some((db) => db.name === DB_NAME);
  }

  async function readEntries(db) {
    const store = db.transaction(STORE, "readonly").objectStore(STORE);
    const keys = await request(store.getAllKeys());
    const values = await request(store.getAll());
    const entries = [];
    keys.forEach((path, i) => {
      if (!isFullGamePath(path)) return;
      const value = values[i] || {};
      const entry = { path, mode: value.mode, timestamp: value.timestamp instanceof Date ? value.timestamp.getTime() : Number(value.timestamp) };
      if (value.contents) entry.contents = new Uint8Array(value.contents);
      entries.push(entry);
    });
    return entries;
  }

  function readStorage() {
    const kept = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (isFullGameKey(key)) kept[key] = localStorage.getItem(key);
    }
    return kept;
  }

  // Everything the full game stored on this origin, ready to post to another.
  async function collect() {
    const storage = readStorage();
    if (!(await databaseExists())) return { files: [], storage };
    const db = await open();
    try {
      return { files: await readEntries(db), storage };
    } finally {
      db.close();
    }
  }

  function hasProgress(saves) {
    return saves.files.some((entry) => entry.contents && entry.contents.length > 0) || Object.keys(saves.storage).length > 0;
  }

  // Refuses anything that is not the shape collect() produces, so a message
  // from the wrong page cannot write arbitrary records into the game's store.
  function validate(saves) {
    if (!saves || !Array.isArray(saves.files) || typeof saves.storage !== "object" || saves.storage === null) {
      throw new Error("the saves did not arrive in the expected shape");
    }
    for (const entry of saves.files) {
      if (!isFullGamePath(entry.path) || !Number.isFinite(entry.mode) || !Number.isFinite(entry.timestamp)) {
        throw new Error("a saved file had an unexpected name or shape");
      }
      if (entry.contents !== undefined && !(entry.contents instanceof Uint8Array)) {
        throw new Error("a saved file's contents were not bytes");
      }
    }
    for (const [key, value] of Object.entries(saves.storage)) {
      if (!isFullGameKey(key) || typeof value !== "string") throw new Error("a stored value had an unexpected key");
    }
    return saves;
  }

  // Replaces the full game's saves on this origin with [saves]. The demo's
  // files and keys are left exactly as they were.
  async function replace(saves) {
    validate(saves);
    const db = await open();
    try {
      const transaction = db.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      const existing = await request(store.getAllKeys());
      for (const path of existing) if (isFullGamePath(path)) store.delete(path);
      for (const entry of saves.files) {
        const value = { timestamp: new Date(entry.timestamp), mode: entry.mode };
        if (entry.contents !== undefined) value.contents = entry.contents;
        store.put(value, entry.path);
      }
      await new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || new Error("the save write was aborted"));
      });
    } finally {
      db.close();
    }
    for (const key of Object.keys(readStorage())) localStorage.removeItem(key);
    for (const [key, value] of Object.entries(saves.storage)) localStorage.setItem(key, value);
  }

  window.TilebreakerSaves = { collect, hasProgress, replace, validate };
})();
