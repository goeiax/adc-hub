/* ============================================================================
   produk-ke-form.js — daftar produk ADC (Med Ex + OTC) → pilihan resep di Form 2
   ----------------------------------------------------------------------------
   Sumber kebenaran: ../../ADC_Data_Produk_MedEx_OTC.xlsx (sheet MED_EX & OTC).
   Skrip ini membaca xlsx tanpa dependensi (unzip + regex), merapikan kategori,
   lalu menyuntikkan `var ADC_PRODUK=[...]` ke ../../ADC_Form2_Asesmen_Umum_Dokter.html
   di antara penanda PRODUK-START / PRODUK-END. Jalankan lagi setiap daftar berubah,
   lalu update-forms.bat.

   Pakai:  node tools/produk-ke-form.js          (suntik)
           node tools/produk-ke-form.js --dry    (hanya tampilkan ringkasan)
   ============================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const XLSX = path.join(ROOT, 'ADC_Data_Produk_MedEx_OTC.xlsx');
const FORM = path.join(ROOT, 'ADC_Form2_Asesmen_Umum_Dokter.html');
const DRY = process.argv.includes('--dry');

/* ---- baca xlsx ---- */
const get = (p) => execSync(`unzip -p "${XLSX}" ${p}`, { maxBuffer: 50e6 }).toString('utf8');
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const ss = [...get('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => unesc([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => t[1]).join('')));
const sheets = [...get('xl/workbook.xml').matchAll(/<sheet name="([^"]+)" sheetId="(\d+)"/g)].map(m => ({ name: unesc(m[1]), id: m[2] }));
const col = (ref) => { const l = ref.match(/[A-Z]+/)[0]; let n = 0; for (const ch of l) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
function rowsOf(id) {
  const xml = get(`xl/worksheets/sheet${id}.xml`), rows = [];
  for (const r of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    for (const c of r[1].matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[2] || '', inner = c[3] || '';
      const vm = inner.match(/<v>([\s\S]*?)<\/v>/), im = inner.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/);
      let v = '';
      if (/t="s"/.test(attrs) && vm) v = ss[+vm[1]] || ''; else if (im) v = unesc(im[1]); else if (vm) v = unesc(vm[1]);
      cells[col(c[1])] = v.replace(/\s+/g, ' ').trim();
    }
    rows.push(cells);
  }
  return rows;
}

/* ---- kategori yang dipakai form (urutan = urutan tab di pemilih) ---- */
const KAT = ['Acne', 'Brightening / flek', 'Retinoid malam', 'Antibiotik topikal', 'Pelembab / barrier', 'Sunscreen', 'Pembersih / toner', 'Anti-redness / repair', 'Hair', 'Anti-aging', 'Body / intimate', 'Lainnya'];
function kategori(nama, bahan, katAsli) {
  const n = nama, b = bahan, k = (katAsli || '').toLowerCase();
  const t = (n + ' ' + b).toLowerCase();
  if (/antibiotik/.test(k) || /nadifloxacin|metronidazole 1%|clindamycin phosphate 1%/i.test(b)) return 'Antibiotik topikal';
  if (/^(adc )?night cream [abc]\b|night gel|benzopalene|racikan malam 2|night cream 5|premium night cream/i.test(n) || /^tretinoin 0[.,]\d+%$|^adapalene/i.test(b.trim())) return /acne|night gel|benzo|racikan malam 2/i.test(n) ? 'Acne' : 'Retinoid malam';
  if (/acne/.test(k) || /acne|effaclar|papulex|teen ?derm alpha|sebium|cerave sa/i.test(n)) return 'Acne';
  if (/hair|shampoo|bioxsine/i.test(n) || /hair/.test(k)) return 'Hair';
  if (/sunscreen|spf|uv |uv\+|photoderm|heliocare|anthelios|suncut|uve\+|post-peel calming|zinc tinted|hybrid/i.test(n)) return 'Sunscreen';
  if (/wash|cleanser|toner|micellar|cleansing|scrub|thermal spring|teen derm aqua|gel moussant|syndet/i.test(n)) return 'Pembersih / toner';
  if (/anti-redness|skin repair/.test(k) || /redness|memar|soothing|inflam|post laser|post facial|ruboril|cicaplast|cica/i.test(n)) return 'Anti-redness / repair';
  if (/underarm|intimate|body/i.test(n) || /body|intimate/.test(k)) return 'Body / intimate';
  if (/brght|bright/.test(k) || /bright|pigment|radiance|whitening|glow|premium sensitive|dc 10|day cream 20|racikan dokter \(aza|racikan malam$|mela |neotone|dermacept|cystamine|cysteamine|txa|tranex|dark spot|vit ?c/i.test(n)) return 'Brightening / flek';
  if (/hydrat|moistur|repair cream|ultra dry|lipikar|baume|skinsterol|sensibio|atoderm|pro ad|barrier|hyalu/i.test(n) || /hydrat|^h$/.test(k)) return 'Pelembab / barrier';
  if (/anti-aging|anti aging/.test(k) || /peptide|retinal|retinol|endocare|geneskin|hydrogel|eye|smoothing lotion|home peeling|glyco a|tensage/i.test(n)) return 'Anti-aging';
  return 'Lainnya';
}
/* "Pagi dan Malam, pelembab" -> jadwal "Pagi dan Malam", cara "pelembab" */
function pisahCara(c) {
  if (!c) return { jadwal: '', cara: '' };
  const m = c.match(/^((?:pagi|malam|siang|sore|\d+[-–]?\d* ?(?:x|kali) ?(?:sehari|per ?hari|seminggu|permingu|perminggu))[^,]*?)(?:,\s*|\s*$)([\s\S]*)$/i);
  if (m) return { jadwal: m[1].trim().replace(/\s+$/, ''), cara: (m[2] || '').trim() };
  return { jadwal: '', cara: c.trim() };
}

/* ---- gabungkan baris lanjutan (nama kosong = bahan tambahan produk sebelumnya) ---- */
const produk = [];
for (const sh of sheets) {
  const rows = rowsOf(sh.id);
  const hdr = rows.find(r => r.some(x => /^Nama Barang$/i.test(x || '')));
  const ix = (lbl) => hdr.findIndex(x => new RegExp('^' + lbl + '$', 'i').test(x || ''));
  const iN = ix('Nama Barang'), iB = ix('Ingredient'), iK = ix('Kategori'), iC = ix('Cara Pakai'), iCode = ix('Code'), iBrand = ix('Brand'), iQ = ix('Qty'), iG = ix('Kegunaan');
  let last = null;
  for (const r of rows.slice(rows.indexOf(hdr) + 1)) {
    const nama = (r[iN] || '').trim();
    if (!nama) { if (last && r[iB]) last.bahan += ' + ' + r[iB]; continue; }
    last = { nama, bahan: r[iB] || '', katAsli: r[iK] || '', cara: r[iC] || '', kode: iCode >= 0 ? (r[iCode] || '') : '', brand: iBrand >= 0 ? (r[iBrand] || '') : '', qty: iQ >= 0 ? (r[iQ] || '') : '', guna: iG >= 0 ? (r[iG] || '') : '', sumber: /MED/i.test(sh.name) ? 'MedEx' : 'OTC' };
    produk.push(last);
  }
}
const out = produk.map(p => {
  const pc = pisahCara(p.cara);
  return { n: p.nama, b: p.bahan, k: kategori(p.nama, p.bahan, p.katAsli), s: p.sumber, j: pc.jadwal, c: pc.cara, q: p.qty, g: p.guna };
});
/* ringkasan */
const cnt = {}; out.forEach(p => { cnt[p.k] = (cnt[p.k] || 0) + 1; });
console.log('produk:', out.length, '(MedEx', out.filter(p => p.s === 'MedEx').length, '· OTC', out.filter(p => p.s === 'OTC').length + ')');
KAT.forEach(k => { if (cnt[k]) console.log(String(cnt[k]).padStart(4), k); });
if (DRY) { KAT.forEach(k => { console.log('\n== ' + k); out.filter(p => p.k === k).forEach(p => console.log('  ' + p.s.padEnd(5) + ' ' + p.n + '  [' + p.b.slice(0, 50) + ']' + (p.j ? '  j=' + p.j : '') + (p.c ? '  c=' + p.c.slice(0, 40) : ''))); }); process.exit(0); }

/* ---- suntik ke Form 2 ---- */
const START = '/* PRODUK-START (dibuat tools/produk-ke-form.js dari ADC_Data_Produk_MedEx_OTC.xlsx — jangan edit manual) */';
const END = '/* PRODUK-END */';
const blok = START + '\nvar ADC_PRODUK_KAT=' + JSON.stringify(KAT) + ';\nvar ADC_PRODUK=' + JSON.stringify(out).replace(/<\//g, '<\\/') + ';\n' + END;
let html = fs.readFileSync(FORM, 'utf8');
const scriptAt = html.indexOf('<script>');
if (scriptAt < 0) throw new Error('<script> tidak ditemukan');
/* buang blok lama di mana pun (termasuk bila pernah salah tempat di dalam <style>) */
while (html.includes(START)) {
  const i = html.indexOf(START), j = html.indexOf(END, i) + END.length;
  html = html.slice(0, i) + html.slice(j).replace(/^\n/, '');
}
/* penanda yang sama ada juga di CSS — cari HANYA di dalam blok <script> */
const anchor = '/* ===== PROGRAM MODALS ===== */';
const k = html.indexOf(anchor, html.indexOf('<script>'));
if (k < 0) throw new Error('anchor PROGRAM MODALS di dalam <script> tidak ditemukan');
html = html.slice(0, k) + blok + '\n' + html.slice(k);
fs.writeFileSync(FORM, html);
console.log('disuntik ke', path.basename(FORM), '— lalu jalankan update-forms.bat');
