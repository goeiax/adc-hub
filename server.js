/* ============================================================================
   ADC HUB — companion server untuk Skin Quality Program (Tahap 1)
   ----------------------------------------------------------------------------
   Tujuan: intake & handoff tidak lagi berpindah lewat unduh/unggah berkas
   secara manual — form menyimpan dan memuat lewat jaringan klinik, dengan
   No. RM sebagai kunci. Unduhan berkas di form TETAP jalan sebagai cadangan.

   Sengaja TANPA dependensi (Node stdlib murni):
   - tidak ada `npm install` yang bisa gagal di PC klinik,
   - penyimpanan = folder per pasien berisi JSON, bisa diperiksa/di-backup
     dengan mata telanjang (copy folder `data/` = backup lengkap),
   - satu berkas ini + Node LTS = seluruh instalasi.

   Jalankan:  node server.js         (atau klik dua kali start.bat)
   Uji:       http://localhost:3777/api/ping
   Kunci:     ganti KEY di config.json (dibuat otomatis saat pertama jalan).
   Webhook:   isi "webhook" di config.json dengan URL Make.com → semua form memakainya otomatis.
   NeoSoft Cube tetap sumber kebenaran utk jadwal/kasir/RM resmi; hub hanya
   memegang data klinis program. Integrasi vendor (Tahap 2) menempel di sini.
   ============================================================================ */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const CFGP = path.join(ROOT, 'config.json');

/* ---- konfigurasi (dibuat otomatis) ---- */
let CFG = { port: 3777, key: '', webhook: '' };   // webhook = URL Make.com (opsional) → dibagikan ke semua form
try { CFG = Object.assign(CFG, JSON.parse(fs.readFileSync(CFGP, 'utf8'))); }
catch (e) {
  CFG.key = 'adc-' + crypto.randomBytes(4).toString('hex');
  fs.writeFileSync(CFGP, JSON.stringify(CFG, null, 2));
}
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

/* ---- util ---- */
function aman(rm) { // RM -> nama folder yang aman
  const s = String(rm || '').trim().replace(/[^A-Za-z0-9_.-]/g, '_');
  if (!s || s === '.' || s === '..') return null;
  return s.slice(0, 64);
}
function dirRM(rm) { return path.join(DATA, aman(rm)); }
function bacaJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; } }
function kirim(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-ADC-Key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Private-Network': 'true'
  });
  res.end(body);
}
function stampe() { // stempel waktu utk nama berkas riwayat
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/* ---- ekstraksi RM dari payload (skema ADC-INTAKE / ADC-HANDOFF v1) ---- */
function rmDari(o) {
  if (!o) return null;
  return (o.pasien && o.pasien.rm) || o.rm || null;
}

/* ---- handler ---- */
/* ---- penyajian form (www/) — tablet cukup buka http://IP-PC:3777/ ----
   Satu salinan form untuk semua perangkat (tidak ada versi berbeda-beda), dan
   karena form & API satu origin, tidak ada urusan CORS / private-network. */
const WWW = path.join(ROOT, 'www');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
               '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };
function sajikan(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel === '/' || rel === '') rel = '/index.html';
  const abs = path.normalize(path.join(WWW, rel));
  if (!abs.startsWith(WWW + path.sep) && abs !== WWW) { res.writeHead(403); return res.end('dilarang'); }
  const ext = path.extname(abs).toLowerCase();
  if (!MIME[ext] || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) { res.writeHead(404); return res.end('tidak ada'); }
  res.writeHead(200, { 'Content-Type': MIME[ext], 'Cache-Control': 'no-cache' });
  fs.createReadStream(abs).pipe(res);
}

const server = http.createServer((req, res) => {
  const t0 = Date.now();
  res.on('finish', () => console.log(new Date().toISOString().slice(11, 19), req.method, req.url, res.statusCode, (Date.now() - t0) + 'ms'));
  if (req.method === 'OPTIONS') return kirim(res, 204, {});
  const u = new URL(req.url, 'http://x');
  const parts = u.pathname.split('/').filter(Boolean); // ['api', ...]

  if (parts[0] !== 'api') return sajikan(req, res, u.pathname);

  /* ping tidak butuh kunci — dipakai form untuk deteksi hub */
  if (parts[1] === 'ping') return kirim(res, 200, { ok: true, app: 'adc-hub', versi: 1, webhook: CFG.webhook || '' });

  if ((req.headers['x-adc-key'] || '') !== CFG.key)
    return kirim(res, 401, { error: 'kunci salah. Lihat config.json di folder adc-hub.' });

  /* GET /api/pasien -> daftar ringkas */
  if (req.method === 'GET' && parts[1] === 'pasien' && !parts[2]) {
    const out = [];
    for (const d of fs.readdirSync(DATA)) {
      /* lewati berkas nyasar (desktop.ini, Thumbs.db) — hanya folder pasien */
      if (!fs.statSync(path.join(DATA, d)).isDirectory()) continue;
      const ik = bacaJSON(path.join(DATA, d, 'intake.json'));
      const ho = bacaJSON(path.join(DATA, d, 'handoff_terakhir.json'));
      out.push({
        rm: d,
        nama: (ik && ik.pasien && ik.pasien.nama) || (ho && ho.pasien && ho.pasien.nama) || '',
        kunjungan_ke: (ho && ho.kunjungan_ke) || (ik ? 0 : null),
        program: (ho && ho.asesmen && ho.asesmen.program) || '',
        diperbarui: (ho && ho.diterbitkan) || (ik && ik.diterbitkan) || ''
      });
    }
    out.sort((a, b) => String(b.diperbarui).localeCompare(String(a.diperbarui)));
    return kirim(res, 200, { pasien: out });
  }

  /* GET /api/pasien/:rm -> paket lengkap utk form */
  if (req.method === 'GET' && parts[1] === 'pasien' && parts[2]) {
    const rm = aman(decodeURIComponent(parts[2]));
    if (!rm) return kirim(res, 400, { error: 'RM tidak valid' });
    const dir = dirRM(rm);
    if (!fs.existsSync(dir)) return kirim(res, 404, { error: 'RM ' + rm + ' belum ada di hub' });
    const riwayat = fs.readdirSync(dir).filter(f => /^handoff_\d/.test(f)).sort();
    return kirim(res, 200, {
      rm,
      intake: bacaJSON(path.join(dir, 'intake.json')),
      handoff_terakhir: bacaJSON(path.join(dir, 'handoff_terakhir.json')),
      handoff_terakhir_slimming: bacaJSON(path.join(dir, 'handoff_terakhir_slimming.json')),
      jumlah_handoff: riwayat.length
    });
  }

  /* POST /api/intake | /api/handoff — body = JSON persis keluaran form */
  if (req.method === 'POST' && (parts[1] === 'intake' || parts[1] === 'handoff')) {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 8e6) req.destroy(); });
    req.on('end', () => {
      let o; try { o = JSON.parse(raw); } catch (e) { return kirim(res, 400, { error: 'JSON rusak' }); }
      const jenis = parts[1];
      const dokOK = jenis === 'intake' ? o.doc === 'ADC-INTAKE' : o.doc === 'ADC-HANDOFF';
      if (!dokOK) return kirim(res, 400, { error: 'doc bukan ' + (jenis === 'intake' ? 'ADC-INTAKE' : 'ADC-HANDOFF') });
      const rm = aman(rmDari(o));
      if (!rm) return kirim(res, 400, { error: 'No. RM kosong — isi RM dulu di form' });
      const dir = dirRM(rm);
      fs.mkdirSync(dir, { recursive: true });
      if (jenis === 'intake') {
        /* intake terbaru menimpa; versi lama diarsip dengan stempel waktu */
        const lama = path.join(dir, 'intake.json');
        if (fs.existsSync(lama)) fs.copyFileSync(lama, path.join(dir, 'intake_' + stampe() + '.json'));
        fs.writeFileSync(lama, JSON.stringify(o, null, 1));
      } else {
        /* SEMUA handoff disimpan (jejak audit) + penunjuk "terakhir" */
        /* Slimming (Sp.GK) punya rantai sendiri — jangan menimpa handoff Skin Quality RM yang sama */
        const slim = /^ADC-SLIMMING/i.test(o.sumber || '');
        fs.writeFileSync(path.join(dir, (slim ? 'handoffslim_' : 'handoff_') + stampe() + '.json'), JSON.stringify(o, null, 1));
        fs.writeFileSync(path.join(dir, slim ? 'handoff_terakhir_slimming.json' : 'handoff_terakhir.json'), JSON.stringify(o, null, 1));
      }
      return kirim(res, 200, { ok: true, rm, jenis });
    });
    return;
  }

  return kirim(res, 404, { error: 'rute tidak dikenal' });
});

server.listen(CFG.port, () => {
  console.log('==============================================');
  console.log(' ADC HUB berjalan');
  console.log('   URL   : http://localhost:' + CFG.port);
  console.log('   Kunci : ' + CFG.key + '   (config.json)');
  console.log('   Data  : ' + DATA);
  console.log('   Form   : http://localhost:' + CFG.port + '/   (buka dari tablet: http://IP-PC-ini:' + CFG.port + '/)');
  console.log(' Biarkan jendela ini terbuka selama klinik buka.');
  console.log('==============================================');
});
