/* ============================================================================
   pengguna.js — kelola pengguna hub (users.json) dari baris perintah
   Pakai (di folder adc-hub):
     node tools/pengguna.js daftar
     node tools/pengguna.js tambah <id> "<Nama lengkap>" <peran> <pin>   peran: admin | dokter | perawat | cs
     node tools/pengguna.js pin <id> <pin-baru>
     node tools/pengguna.js nonaktif <id>   |   aktif <id>
   PIN 4–8 digit. PIN tidak pernah disimpan — hanya hash scrypt-nya.
   ============================================================================ */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const P = path.join(__dirname, '..', 'users.json');
const PERAN = ['admin', 'dokter', 'perawat', 'cs'];
const baca = () => { try { return JSON.parse(fs.readFileSync(P, 'utf8')); } catch (e) { return { users: [] }; } };
const tulis = (u) => fs.writeFileSync(P, JSON.stringify(u, null, 2));
const hash = (pin, salt) => crypto.scryptSync(String(pin), salt, 32).toString('hex');
const [cmd, id, a, b, c] = process.argv.slice(2);
const u = baca();
const cari = () => { const x = u.users.find(x => x.id === String(id || '').toLowerCase()); if (!x) { console.error('pengguna tidak ada:', id); process.exit(1); } return x; };
switch (cmd) {
  case 'daftar':
    if (!u.users.length) console.log('(belum ada pengguna — jalankan server sekali untuk membuat admin)');
    u.users.forEach(x => console.log((x.aktif ? '  ' : 'X ') + x.id.padEnd(12) + x.peran.padEnd(9) + x.nama));
    break;
  case 'tambah': {
    if (!id || !a || !PERAN.includes(b) || !/^\d{4,8}$/.test(String(c || ''))) { console.error('pakai: tambah <id> "<Nama>" <' + PERAN.join('|') + '> <pin 4-8 digit>'); process.exit(1); }
    const salt = crypto.randomBytes(8).toString('hex');
    u.users = u.users.filter(x => x.id !== id.toLowerCase()).concat([{ id: id.toLowerCase(), nama: a, peran: b, salt, hash: hash(c, salt), aktif: true, dibuat: new Date().toISOString() }]);
    tulis(u); console.log('tersimpan:', id.toLowerCase(), b, a); break;
  }
  case 'pin': {
    if (!/^\d{4,8}$/.test(String(a || ''))) { console.error('pin 4-8 digit'); process.exit(1); }
    const x = cari(); x.salt = crypto.randomBytes(8).toString('hex'); x.hash = hash(a, x.salt); tulis(u); console.log('PIN diganti:', x.id); break;
  }
  case 'nonaktif': { const x = cari(); x.aktif = false; tulis(u); console.log('dinonaktifkan:', x.id); break; }
  case 'aktif': { const x = cari(); x.aktif = true; tulis(u); console.log('diaktifkan:', x.id); break; }
  default: console.log('perintah: daftar | tambah | pin | nonaktif | aktif');
}
