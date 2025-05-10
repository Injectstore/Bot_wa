const moment = require('moment');

function getBulanSekarang() {
  return moment().format('YYYY-MM');
}

function hitungAPC(sales, std) {
  if (!std || std === 0) return 0;
  return parseFloat((sales / std).toFixed(2));
}

function formatRupiah(angka) {
  return angka.toLocaleString('id-ID');
}

function getHeaderLaporan(area = 'SNO', toko = 'TMAM Warakas 7') {
  return `*Laporan sales area ${area}*\n*${moment().format("MMMM YYYY")}*\n*${toko}*\n_______\nTGL_SALES_STD_APC`;
}

module.exports = {
  getBulanSekarang,
  hitungAPC,
  formatRupiah,
  getHeaderLaporan
};
