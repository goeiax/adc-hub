/* ============================================================================
   NEOSOFT EXPLORER — penjelajah skema BACA-SAJA (jalankan di PC klinik)
   ----------------------------------------------------------------------------
   Tujuan: memetakan struktur database NeoSoft supaya kita tahu tabel & kolom
   pasien yang benar SEBELUM menulis query di hub. Skrip ini HANYA membaca
   (SELECT / SHOW / INFORMATION_SCHEMA) — tidak pernah menulis apa pun.

   Pasang & jalankan (di folder adc-hub, di PC klinik):
     1. Instal Node.js LTS bila belum.
     2. Salin neosoft.json.example -> neosoft.json, isi password.
     3. npm install mysql2
     4. node neosoft-explore.js  >  neosoft-skema.txt
     5. Buka neosoft-skema.txt, kirim isinya ke Claude.
        (Ada SATU baris contoh data pasien asli di tiap tabel kandidat —
         boleh sensor nama/nomor pasien itu sebelum mengirim; struktur kolom
         yang penting, bukan nilainya.)

   Tidak menemukan mysql2? Jalankan `npm install mysql2` dulu di folder ini.
   ============================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

let cfg;
try { cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'neosoft.json'), 'utf8')); }
catch (e) {
  console.error('Tidak menemukan neosoft.json. Salin neosoft.json.example -> neosoft.json lalu isi password.');
  process.exit(1);
}
let mysql;
try { mysql = require('mysql2/promise'); }
catch (e) {
  console.error('Modul mysql2 belum terpasang. Jalankan:  npm install mysql2');
  process.exit(1);
}

/* kata kunci untuk menebak tabel/kolom yang berhubungan dengan pasien */
const PETUNJUK_TABEL = ['patient', 'pasien', 'member', 'customer', 'pelanggan', 'rm', 'medical', 'rekam'];
const PETUNJUK_KOLOM = ['rm', 'mrn', 'nama', 'name', 'lahir', 'birth', 'dob', 'phone', 'hp', 'wa',
                        'telp', 'gender', 'kelamin', 'sex', 'alamat', 'address', 'email'];

function skor(nama, petunjuk) {
  const n = String(nama).toLowerCase();
  return petunjuk.reduce((s, k) => s + (n.includes(k) ? 1 : 0), 0);
}

(async () => {
  const conn = await mysql.createConnection({
    host: cfg.host, port: cfg.port || 3306, user: cfg.user, password: cfg.password,
    database: cfg.database || undefined, connectTimeout: 10000
  });
  console.log('=== NEOSOFT EXPLORER (baca-saja) ===');
  console.log('Terhubung ke', cfg.host + ':' + (cfg.port || 3306), 'sebagai', cfg.user);

  const [[ver]] = await conn.query('SELECT VERSION() v');
  console.log('MySQL:', ver.v);
  try {
    const [g] = await conn.query('SHOW GRANTS');
    console.log('\n--- HAK AKSES (pastikan hanya SELECT) ---');
    g.forEach(r => console.log('  ' + Object.values(r)[0]));
  } catch (e) { console.log('  (grants tidak terbaca: ' + e.message + ')'); }

  /* daftar tabel + jumlah baris dari INFORMATION_SCHEMA (tanpa memindai data) */
  const [tabs] = await conn.query(
    `SELECT TABLE_SCHEMA s, TABLE_NAME t, TABLE_ROWS n
       FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE='BASE TABLE'
        AND TABLE_SCHEMA NOT IN ('mysql','information_schema','performance_schema','sys')
      ORDER BY TABLE_SCHEMA, TABLE_NAME`);
  console.log('\n--- ' + tabs.length + ' TABEL TERLIHAT ---');

  /* peringkat kandidat tabel pasien */
  const ranked = tabs.map(r => ({ ...r, sc: skor(r.t, PETUNJUK_TABEL) }))
                     .sort((a, b) => b.sc - a.sc || (b.n || 0) - (a.n || 0));
  const kandidat = ranked.filter(r => r.sc > 0).slice(0, 8);
  const lain = ranked.filter(r => r.sc === 0).slice(0, 40);
  console.log('Kandidat tabel pasien (skor tertinggi):');
  kandidat.forEach(r => console.log(`   [${r.s}].${r.t}  ~${r.n || '?'} baris  (skor ${r.sc})`));
  console.log('Tabel lain (contoh): ' + lain.map(r => r.t).join(', '));

  /* untuk tiap kandidat: kolom + 1 baris contoh (nilai dipangkas) */
  for (const r of kandidat) {
    console.log('\n=================================================');
    console.log(`TABEL  [${r.s}].${r.t}`);
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME c, DATA_TYPE d, COLUMN_KEY k
         FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION`, [r.s, r.t]);
    console.log('Kolom:');
    cols.forEach(c => {
      const tandai = skor(c.c, PETUNJUK_KOLOM) ? '  <== relevan' : '';
      console.log(`   ${c.c}  (${c.d}${c.k ? ', ' + c.k : ''})${tandai}`);
    });
    try {
      const [rows] = await conn.query('SELECT * FROM ??.?? LIMIT 1', [r.s, r.t]);
      if (rows.length) {
        console.log('Contoh 1 baris (pangkas 40 char; SENSOR sebelum mengirim bila perlu):');
        for (const [k, v] of Object.entries(rows[0])) {
          const val = v === null ? 'NULL' : String(v).slice(0, 40);
          console.log(`   ${k} = ${val}`);
        }
      } else console.log('   (tabel kosong)');
    } catch (e) { console.log('   (tidak bisa mengambil contoh: ' + e.message + ')'); }
  }

  await conn.end();
  console.log('\n=== SELESAI. Kirim isi berkas ini ke Claude untuk memetakan query. ===');
})().catch(e => { console.error('GAGAL:', e.code || '', e.message); process.exit(1); });
