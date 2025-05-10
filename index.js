const venom = require('venom-bot');
const db = require('./db');
const { getBulanSekarang, hitungAPC, formatRupiah, getHeaderLaporan } = require('./utils');
const fetch = require('node-fetch');
require('dotenv').config();

const PREFIX = process.env.PREFIX || '#';

function checkWhitelist(id, callback) {
  db.get(`SELECT * FROM whitelist WHERE id = ?`, [id], (err, row) => {
    callback(!!row);
  });
}

function insertBarangAuto() {
  const data = [
    ["ABC123", "Barang Satu", 10000],
    ["XYZ789", "Barang Dua", 15000],
    ["LMN456", "Barang Tiga", 8000]
  ];
  data.forEach(([kode, nama, harga]) => {
    db.run(`INSERT OR IGNORE INTO barang VALUES (?, ?, ?)`, [kode, nama, harga]);
  });
}

function autoResetSalesIfNewMonth() {
  const currentMonth = getBulanSekarang();
  db.get(`SELECT COUNT(*) as total FROM sales WHERE bulan = ?`, [currentMonth], (err, row) => {
    if (row.total === 0) {
      for (let tgl = 1; tgl <= 31; tgl++) {
        db.run(`INSERT INTO sales (tanggal, sales, std, apc, bulan) VALUES (?, ?, ?, ?, ?)`, [
          tgl.toString(), 0, 0, 0, currentMonth
        ]);
      }
    }
  });
}

venom
  .create()
  .then(client => start(client))
  .catch(console.error);

function start(client) {
  insertBarangAuto();
  autoResetSalesIfNewMonth();

  client.onMessage(async message => {
    if (!message.body.startsWith(PREFIX)) return;
    const body = message.body.slice(PREFIX.length).trim();
    const args = body.split(' ');
    const command = args.shift().toLowerCase();

    const from = message.isGroupMsg ? message.chatId : message.from;
    checkWhitelist(from, allowed => {
      if (!allowed) return;

      if (command === 'barang') {
        db.all(`SELECT * FROM barang`, [], (err, rows) => {
          if (rows.length === 0) return client.sendText(from, 'Data barang kosong.');
          let text = '*Daftar Barang:*\n';
          rows.forEach(row => {
            text += `- ${row.kode}: ${row.nama} (${formatRupiah(row.harga)})\n`;
          });
          client.sendText(from, text);
        });
      }

      else if (command === 'barcode') {
        const text = args.join(' ');
        if (!text) return client.sendText(from, 'Format: #barcode KODE');
        const url = `https://barcodeapi.org/api/auto/${encodeURIComponent(text)}`;
        client.sendImage(from, url, 'barcode.jpg', `Barcode untuk: ${text}`);
      }

      else if (command === 'sales') {
        const [tgl, sales, std] = args;
        const tglInt = parseInt(tgl);
        const salesInt = parseInt(sales);
        const stdInt = parseInt(std);
        const apc = hitungAPC(salesInt, stdInt);
        const bulan = getBulanSekarang();

        db.run(`UPDATE sales SET sales = ?, std = ?, apc = ? WHERE tanggal = ? AND bulan = ?`, [salesInt, stdInt, apc, tglInt, bulan], function(err) {
          if (err) return client.sendText(from, 'Gagal input.');
          client.sendText(from, `Tersimpan: ${tgl}_${formatRupiah(salesInt)}_${stdInt}_${apc}`);
        });
      }

      else if (command === 'laporan') {
        const bulan = getBulanSekarang();
        db.all(`SELECT * FROM sales WHERE bulan = ? ORDER BY tanggal ASC`, [bulan], (err, rows) => {
          if (rows.length === 0) return client.sendText(from, 'Belum ada data.');
          let output = getHeaderLaporan() + '\n';
          rows.forEach(row => {
            const line = `${row.tanggal}_${formatRupiah(row.sales)}_${row.std}_${row.apc}`;
            output += line + '\n';
          });
          client.sendText(from, output.trim());
        });
      }

      else if (command === 'bulan') {
        db.all(`SELECT DISTINCT bulan FROM sales ORDER BY bulan DESC`, [], (err, rows) => {
          if (rows.length === 0) return client.sendText(from, 'Belum ada data.');
          const text = '*Laporan Bulanan Tersedia:*\n' + rows.map(r => '- ' + r.bulan).join('\n');
          client.sendText(from, text);
        });
      }

      else if (command === 'laporanbulan') {
        const bulan = args[0];
        if (!bulan) return client.sendText(from, 'Format: #laporanbulan YYYY-MM');
        db.all(`SELECT * FROM sales WHERE bulan = ? ORDER BY tanggal ASC`, [bulan], (err, rows) => {
          if (rows.length === 0) return client.sendText(from, 'Data tidak ditemukan.');
          let output = getHeaderLaporan() + '\n';
          rows.forEach(row => {
            const line = `${row.tanggal}_${formatRupiah(row.sales)}_${row.std}_${row.apc}`;
            output += line + '\n';
          });
          client.sendText(from, output.trim());
        });
      }

    });
  });
}
