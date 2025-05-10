const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/sales.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS barang (
    kode TEXT PRIMARY KEY,
    nama TEXT,
    harga INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT,
    sales INTEGER,
    std INTEGER,
    apc REAL,
    bulan TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS whitelist (
    id TEXT PRIMARY KEY,
    type TEXT
  )`);
});

module.exports = db;
