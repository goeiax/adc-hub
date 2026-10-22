'use strict';
/* Uji end-to-end ADC Hub: Form 1 -> hub -> Form 2 -> handoff berantai (awal + 2 kontrol).
   Jalan di SALINAN SEMENTARA (server.js + www/) di folder temp — data/ asli tidak tersentuh.
   Pakai:  node e2e-test.js        (Node 18+; jsdom dipasang otomatis ke folder temp, bukan ke repo)
   Jalankan  update-forms.bat  dulu bila form di ..\ baru diedit, supaya www/ ikut terbaru. */
const { spawn, execSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const SRC = __dirname;
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'adc-e2e-'));
const JS_DIR = path.join(os.tmpdir(), 'adc-e2e-jsdom');
if (!fs.existsSync(path.join(JS_DIR, 'node_modules', 'jsdom'))) {
  fs.mkdirSync(JS_DIR, { recursive: true });
  console.log('Memasang jsdom ke ' + JS_DIR + ' ...');
  execSync('npm init -y && npm i jsdom', { cwd: JS_DIR, stdio: 'ignore' });
}
const { JSDOM, VirtualConsole } = require(path.join(JS_DIR, 'node_modules', 'jsdom'));
fs.copyFileSync(path.join(SRC, 'server.js'), path.join(WORK, 'server.js'));
fs.cpSync(path.join(SRC, 'www'), path.join(WORK, 'www'), { recursive: true });
fs.writeFileSync(path.join(WORK, 'config.json'), JSON.stringify({ port: 3791, key: 'adc-test' }));
process.chdir(WORK);

const BASE = 'http://localhost:3791', KEY = 'adc-test', RM = 'RM-TEST-001';
const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  -> ' + (detail === undefined ? '' : JSON.stringify(detail)))); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 4000) { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await sleep(50); } return false; }

async function open(file, { key = KEY, log } = {}) {
  const dialogs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => dialogs.push({ type: 'jsdomError', msg: String(e.message).slice(0, 200) }));
  const dom = new JSDOM(fs.readFileSync(path.join('www', file), 'utf8'), { url: BASE + '/' + file, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.fetch = (u, o) => fetch(u, o);
      w.alert = m => dialogs.push({ type: 'alert', msg: String(m) });
      w.confirm = m => { dialogs.push({ type: 'confirm', msg: String(m) }); return true; };
      w.prompt = (m, d) => { dialogs.push({ type: 'prompt', msg: String(m) }); return w.__promptAns !== undefined ? w.__promptAns : d; };
      w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
      w.HTMLAnchorElement.prototype.click = function () { dialogs.push({ type: 'download', msg: this.download }); };
      w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = () => {};
      w.__popup = null;
      w.open = () => { const d = { html: '', open() {}, write(h) { d.html += h; }, close() {} }; w.__popup = { document: d }; return w.__popup; };
      try { w.localStorage.setItem('adc_hub_key', key); } catch (e) {}
    } });
  const w = dom.window;
  await until(() => typeof w.hubPing === 'function' && w._hubOn === true, 4000).catch(() => {});
  return { w, d: w.document, dialogs, dom };
}
const $ = (d, id) => d.getElementById(id);
function set(d, id, v) { const e = $(d, id); if (!e) throw new Error('id tidak ada: ' + id); e.value = v; e.dispatchEvent(new e.ownerDocument.defaultView.Event('input', { bubbles: true })); }
function chk(d, id, v = true) { const e = $(d, id); if (!e) throw new Error('id tidak ada: ' + id); e.checked = v; e.dispatchEvent(new e.ownerDocument.defaultView.Event('change', { bubbles: true })); }
function disk(p) { try { return JSON.parse(fs.readFileSync(path.join('data', RM, p), 'utf8')); } catch (e) { return null; } }
function muatRM(x, fn, rm) { x.w[fn](); const i = x.d.getElementById('mdlg_rm'); i.value = rm; x.d.getElementById('mdlg_ok').click(); }
const lastDlg = (s, t) => s.dialogs.filter(x => !t || x.type === t).slice(-1)[0];

(async () => {
  fs.rmSync('data', { recursive: true, force: true });
  const srv = spawn(process.execPath, ['server.js'], { cwd: WORK, stdio: 'ignore' });
  await sleep(800);
  try {
    /* ===== 0. hub dasar ===== */
    const ping = await (await fetch(BASE + '/api/ping')).json();
    check('hub: /api/ping', ping.ok === true);
    check('hub: tanpa kunci -> 401', (await fetch(BASE + '/api/pasien')).status === 401);
    check('hub: path traversal ditolak', [403, 404].includes((await fetch(BASE + '/..%2f..%2fserver.js')).status));
    check('hub: RM tak dikenal -> 404', (await fetch(BASE + '/api/pasien/NOPE', { headers: { 'X-ADC-Key': KEY } })).status === 404);

    /* ===== 1. FORM 1: isi + simpan intake ===== */
    const f1 = await open('ADC_Form1_Registrasi_Anamnesis_Pasien.html');
    check('F1: halaman termuat & hub tersambung', f1.w._hubOn === true, f1.dialogs.filter(x => x.type === 'jsdomError'));
    set(f1.d, 'p_nama', 'Pasien Uji Coba'); set(f1.d, 'rm', RM); set(f1.d, 'p_wa', '081234567890');
    set(f1.d, 'p_dokter', 'dr. Uji, Sp.DVE'); chk(f1.d, 'p_foto_ok'); set(f1.d, 'p_foto_area', 'Wajah');
    set(f1.d, 'p_bb', '58'); set(f1.d, 'p_tb', '160'); set(f1.d, 'alergi', 'Penisilin');
    f1.d.querySelectorAll('label.ack input').forEach(c => { c.checked = true; });
    { const pc = f1.d.querySelector('.prog[data-p=acne] input'); pc.checked = true; f1.w.tog('acne');
      const lok = [...f1.d.querySelectorAll('#d-acne label.opt')].find(l => l.textContent.trim() === 'Pipi'); lok.querySelector('input').checked = true; }
    { const labs = [...f1.d.querySelectorAll('.lab')].map(l => l.textContent.trim());
      check('F1: pertanyaan ganda dihapus (BB/TB di Slimming, Masih menyusui, Haid tidak teratur) & label onset rambut unik',
        !labs.includes('Berat badan sekarang') && !labs.includes('Tinggi badan') && !labs.includes('Masih menyusui?') &&
        !/Haid tidak teratur/.test(f1.d.getElementById('d-slimming').textContent) && labs.filter(l => l === 'Sejak kapan?').length === 1 && labs.includes('Rontok sejak kapan?'), labs.filter(l => /Sejak|Berat|menyusui/i.test(l))); }
    f1.w.simpanIntake();
    const c1 = lastDlg(f1, 'confirm');
    check('F1: dialog "belum lengkap" hanya soal tanda tangan (canvas tak ada di jsdom)', !c1 || /tanda tangan/i.test(c1.msg) && (c1.msg.match(/·/g) || []).length === 1, c1 && c1.msg);
    check('F1: unduhan cadangan dibuat', f1.dialogs.some(x => x.type === 'download' && /^Intake_/.test(x.msg)), f1.dialogs);
    await until(() => disk('intake.json'));
    const ik = disk('intake.json');
    check('hub: intake.json tersimpan per RM', ik && ik.doc === 'ADC-INTAKE' && ik.pasien.rm === RM);
    check('hub: field intake benar (nama, alergi, dokter, BB/TB)', ik && ik.pasien.nama === 'Pasien Uji Coba' && ik.kritis.alergi === 'Penisilin' && ik.penugasan.dokter === 'dr. Uji, Sp.DVE' && ik.pengukuran.bb === '58', ik && { p: ik.pasien, k: ik.kritis.alergi, pg: ik.pengukuran });
    check('F1: IMT terhitung', ik && ik.pengukuran.imt, ik && ik.pengukuran);

    /* simpan ulang -> versi lama diarsipkan */
    f1.w.simpanIntake(); await sleep(400);
    check('hub: intake ulang mengarsip versi lama', fs.readdirSync(path.join('data', RM)).some(f => /^intake_\d/.test(f)));

    /* ===== 2. FORM 2: muat intake via hub, isi, terbitkan handoff #1 ===== */
    const a = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
    check('F2: hub tersambung', a.w._hubOn === true);
    a.w.muatIntakeHub();
    check('F2: dialog Muat Form 1 punya kotak RM + tombol "Pilih berkas…"', a.d.getElementById('mdlg').classList.contains('on') && a.d.getElementById('mdlg_rm').value === '' && /Pilih berkas/.test(a.d.getElementById('mdlg_file').textContent));
    { let k = 0; a.w.HTMLInputElement.prototype.click = function () { if (this.id === '_intakefile') k++; }; a.d.getElementById('mdlg_file').click();
      check('F2: "Pilih berkas…" membuka pemilih berkas & menutup dialog', k === 1 && !a.d.getElementById('mdlg').classList.contains('on'), k); delete a.w.HTMLInputElement.prototype.click; }
    muatRM(a, 'muatIntakeHub', RM);
    await until(() => a.w._intake);
    check('F2: intake termuat dari hub', a.w._intake && a.w._intake.pasien.rm === RM, a.dialogs.slice(-2));
    check('F2: identitas terisi otomatis', $(a.d, 'p_nama').value === 'Pasien Uji Coba' && $(a.d, 'rm').value === RM && $(a.d, 'p_wa').value === '081234567890');
    check('F2: alergi & dokter terisi dari intake', $(a.d, 'alergi_flag').value === 'Penisilin' && $(a.d, 'd1_dokter').value === 'dr. Uji, Sp.DVE');
    check('F2 pasien baru: kotak isian alergi disembunyikan, alergi tampil di Ringkasan Form 1', $(a.d, 'alergi_box').style.display === 'none' && $(a.d, 'alergi_flag').value === 'Penisilin' && /Penisilin/.test($(a.d, 'intake_body').textContent), { box: $(a.d, 'alergi_box').style.display, al: $(a.d, 'alergi_flag').value });
    check('F2: Ringkasan menampilkan detail keluhan P4 dari Form 1', /Detail keluhan/.test($(a.d, 'intake_body').textContent), a.w._intake && (a.w._intake.seksi || []).map(s => s.kode));
    { const ik2 = JSON.parse(JSON.stringify(a.w._intake)); ik2.kritis.alergi = 'Sulfa'; a.w.applyIntake(ik2); }
    check('F2: kotak alergi disembunyikan bila Ringkasan Form 1 tampil (tidak dobel)', $(a.d, 'alergi_box').style.display === 'none' && $(a.d, 'intake_body').textContent.includes($(a.d, 'alergi_flag').value) && $(a.d, 'alergi_flag').value !== '', { box: $(a.d, 'alergi_box').style.display, alergi: $(a.d, 'alergi_flag').value });
    check('F2: muat ulang Form 1 yang dikoreksi menimpa alergi lama', $(a.d, 'alergi_flag').value === 'Sulfa' && /Sulfa/.test($(a.d, 'intake_body').textContent), $(a.d, 'alergi_flag').value);
    { const ik3 = JSON.parse(JSON.stringify(a.w._intake)); ik3.kritis.alergi = ''; ik3.kritis.alergi_nihil = true; a.w.applyIntake(ik3); }
    check('F2: Form 1 "tidak ada alergi" -> nihil, ringkasan menyebut Nihil', $(a.d, 'alergi_flag').value === '' && $(a.d, 'alergi_none').checked && /Nihil/.test($(a.d, 'intake_body').textContent));
    { const ik4 = JSON.parse(JSON.stringify(a.w._intake)); ik4.kritis.alergi = 'Penisilin'; ik4.kritis.alergi_nihil = false; a.w.applyIntake(ik4); }
    check('F2: ringkasan intake tampil', $(a.d, 'intake_box').style.display !== 'none');
    check('F2: mode awal', a.w._mode === 'awal');

    set(a.d, 'd2_dx', 'Acne vulgaris grade sedang'); set(a.d, 'd2_hasil', 'Temuan: papul rahang\nPenunjang: panel hormon'); a.d.querySelectorAll('#d1_tk input').forEach(c => { if (['Kombinasi', 'Sensitif'].includes(c.value)) { c.checked = true; c.dispatchEvent(new a.w.Event('change', { bubbles: true })); } });
    check('F2: tipe kulit pilihan ganda tergabung ke d1_tipekulit', $(a.d, 'd1_tipekulit').value === 'Kombinasi, Sensitif' && !a.d.querySelector('select#d1_tipekulit'), $(a.d, 'd1_tipekulit').value); a.w.setIGA('ac_iga', '3'); a.w.pickStage('acne', 1);
    check('F2: IGA 3 -> program Acne aktif', a.w.activeProgs().includes('acne'));
    const rxIn = a.d.querySelectorAll('#ovl_acne .rx-table tbody tr')[0].querySelectorAll('input');
    rxIn[0].value = 'Tretinoin 0,025%'; rxIn[1].value = 'Malam'; rxIn[2].value = 'Oles tipis'; rxIn[3].value = '8 minggu';
    set(a.d, 'd5_iv', a.d.querySelector('#d5_iv option:nth-child(2)') ? a.d.querySelector('#d5_iv option:nth-child(2)').value : '14');
    set(a.d, 'd5_start', '2026-10-05'); set(a.d, 'd7_remarks', 'Hindari matahari'); set(a.d, 'd8_by', 'Perawat Uji');
    set(a.d, 'd6_hindari', 'Hindari scrub');
    chk(a.d, 'd8_signoff'); set(a.d, 'd8_dokter', 'dr. Uji, Sp.DVE');
    a.w.updateReq();
    const miss = a.w.reqStatus().filter(x => !x.ok).map(x => x.label);
    check('F2 awal: bar wajib lengkap kecuali yang memang tak diisi', miss.length === 0, miss);
    a.w.generateSchedule();
    check('F2: jadwal ter-generate', (a.w._schedRows || []).length > 0, a.w.buildSchedule && a.w.buildSchedule());
    a.dialogs.length = 0;
    a.w.issueHandoff(); await sleep(500);
    check('F2: tidak ada dialog peringatan di handoff #1', !a.dialogs.some(x => x.type === 'confirm'), a.dialogs.filter(x => x.type === 'confirm'));
    check('F2: popup ringkasan handoff dibuat', a.w.__popup && /Ringkasan Handoff/.test(a.w.__popup.document.html));
    const h1 = disk('handoff_terakhir.json');
    check('hub: handoff #1 tersimpan', h1 && h1.doc === 'ADC-HANDOFF' && h1.kunjungan_ke === 1 && h1.riwayat.length === 0, h1 && { k: h1.kunjungan_ke });
    check('hub: isian program hanya dari tahap terpilih (tanpa baris default tahap lain)', h1 && (() => { const t = h1.program_detail.acne.isian.join(' | '); return /Tretinoin 0,025%/.test(t) && !/Isotretinoin|Spironolactone|Eritromisin|Excel V/.test(t); })(), h1 && h1.program_detail.acne.isian);
    check('hub: handoff memuat resep, IGA baseline=3, jadwal', h1 && h1.asesmen.resep.some(r => /Tretinoin/.test(r.obat)) && h1.program_detail.acne.iga_baseline === 3 && h1.program_detail.acne.iga === 3 && h1.jadwal.length > 0, h1 && { rx: h1.asesmen.resep, pd: h1.program_detail && h1.program_detail.acne && { b: h1.program_detail.acne.iga_baseline, i: h1.program_detail.acne.iga }, j: h1.jadwal.length });
    check('hub: handoff #1 derajat = rangkuman IGA', h1 && h1.asesmen.derajat === 'Acne IGA 3 · Sedang (Moderate)', h1 && h1.asesmen.derajat);
    check('hub: catatan klinis (temuan + penunjang) tersimpan di handoff', h1 && h1.asesmen.hasil === 'Temuan: papul rahang\nPenunjang: panel hormon', h1 && h1.asesmen.hasil);
    check('hub: resep hanya obat yang diisi dokter (baris contoh tidak ikut)', h1 && h1.asesmen.resep.length === 1 && !/Clindamycin|Sunscreen|Isotretinoin/.test(JSON.stringify(h1.asesmen.resep)), h1 && h1.asesmen.resep.map(r => r.obat));
    check('hub: D6 "Yang harus dihindari" tersimpan di handoff', h1 && h1.asesmen.hindari === 'Hindari scrub', h1 && h1.asesmen.hindari);
    check('hub: penerbitan sign-off tercatat', h1 && h1.penerbitan.signoff_dokter === true);

    /* ===== 3. KONTROL tanpa muat handoff -> harus diblok ===== */
    const b0 = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
    b0.w.setMode('kontrol'); set(b0.d, 'rm', RM); set(b0.d, 'p_nama', 'Pasien Uji Coba');
    b0.dialogs.length = 0; b0.w.issueHandoff(); await sleep(300);
    check('F2 kontrol tanpa handoff: penerbitan DIBLOK', /Tidak bisa diterbitkan/.test((lastDlg(b0, 'alert') || {}).msg || '') && !disk('handoff_terakhir.json').asesmen.__x && fs.readdirSync(path.join('data', RM)).filter(f => /^handoff_\d/.test(f)).length === 1);
    check('F2 tanpa Form 1: kotak alergi tampil & bisa diisi', $(b0.d, 'alergi_box').style.display !== 'none' && $(b0.d, 'alergi_flag').type !== 'hidden' && !$(b0.d, 'alergi_flag').readOnly);
    check('F2 kontrol: bar wajib menandai "Handoff dimuat" belum', b0.w.reqStatus().some(x => x.label === 'Handoff dimuat' && !x.ok));

    /* ===== 4. KONTROL #2: muat handoff via hub, IGA 1 (turun 2 = sukses) ===== */
    const b = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
    muatRM(b, 'muatHandoffHub', RM);
    await until(() => b.w._prevHandoff);
    check('F2: handoff dimuat dari hub -> mode kontrol', b.w._prevHandoff && b.w._mode === 'kontrol', b.dialogs.slice(-2));
    check('F2: identitas & alergi terisi dari handoff', $(b.d, 'p_nama').value === 'Pasien Uji Coba' && $(b.d, 'rm').value === RM && $(b.d, 'alergi_flag').value === 'Penisilin');
    check('F2: program Acne dikenali dari handoff', b.w.progsKunjungan().includes('acne'));
    const baru = b.w.reqStatus().filter(x => !x.ok).map(x => x.label);
    check('F2 kontrol: bar wajib menagih IGA/hasil/dokter/dll (belum diisi)', ['Dokter pemeriksa', 'Hasil vs kunjungan lalu', 'IGA Acne', 'Remarks berikutnya', 'Ritme kontrol', 'Sign-off dokter'].every(l => baru.includes(l)), baru);
    set(b.d, 'k1_dokter', 'dr. Pengganti, Sp.DVE'); set(b.d, 'k1_hasil', 'Lesi aktif berkurang');
    b.w.setIGA('ac_iga', '1');
    check('F2: IGA delta=2 & sukses', (() => { const g = b.w.igaData('acne'); return g && g.baseline === 3 && g.kini === 1 && g.delta === 2 && g.sukses === true; })(), b.w.igaData('acne'));
    check('F2: label arah otomatis', /Acne −2/.test($(b.d, 'k1_arah').value), $(b.d, 'k1_arah').value);
    set(b.d, 'k1_patuh', 'Patuh'); set(b.d, 'k1_es', 'Kulit kering ringan');
    set(b.d, 'd5_iv', '14'); set(b.d, 'd5_start', '2026-10-19'); set(b.d, 'd7_remarks', 'Lanjutkan'); set(b.d, 'd8_by', 'Perawat Uji'); chk(b.d, 'd8_signoff');
    b.w.updateReq();
    const miss2 = b.w.reqStatus().filter(x => !x.ok).map(x => x.label);
    check('F2 kontrol: bar wajib lengkap', miss2.length === 0, miss2);
    b.dialogs.length = 0; b.w.issueHandoff(); await sleep(500);
    const h2 = fs.existsSync(path.join('data', RM)) ? disk('handoff_terakhir.json') : null;
    check('hub: handoff #2 = kunjungan_ke 2, riwayat 1', h2 && h2.kunjungan_ke === 2 && h2.riwayat.length === 1, h2 && { k: h2.kunjungan_ke, r: h2.riwayat.length });
    check('hub: riwayat membawa kunjungan 1 (diagnosis, resep, temuan)', h2 && h2.riwayat[0] && h2.riwayat[0].kunjungan_ke === 1 && /Acne/.test(h2.riwayat[0].diagnosis || '') && /Tretinoin/.test(h2.riwayat[0].resep || '') && /tahap 1/.test(h2.riwayat[0].temuan_program || ''), h2 && h2.riwayat[0]);
    check('hub: evaluasi_kontrol.iga acne baseline 3 -> 1 sukses', h2 && h2.evaluasi_kontrol && h2.evaluasi_kontrol.iga && h2.evaluasi_kontrol.iga.acne && h2.evaluasi_kontrol.iga.acne.sukses === true && h2.evaluasi_kontrol.iga.acne.baseline === 3, h2 && h2.evaluasi_kontrol);
    check('hub: baseline IGA tetap 3 di program_detail (bukan 1)', h2 && h2.program_detail.acne.iga_baseline === 3 && h2.program_detail.acne.iga === 1, h2 && h2.program_detail.acne);
    check('hub: dokter pemeriksa kontrol = dokter pengganti (bukan pemilik lama)', h2 && h2.asesmen.dokter === 'dr. Pengganti, Sp.DVE', h2 && h2.asesmen.dokter);
    check('hub: jenis_kunjungan kontrol', h2 && h2.jenis_kunjungan === 'kontrol');
    check('hub: resep berjalan terbawa di kontrol (resep tidak hilang)', h2 && h2.asesmen.resep.length >= 1, h2 && h2.asesmen.resep);
    check('hub: kontrol mencatat apa yang dibawa (asesmen.dibawa)', h2 && Array.isArray(h2.asesmen.dibawa) && ['diagnosis', 'resep'].every(k => h2.asesmen.dibawa.includes(k)), h2 && h2.asesmen.dibawa);
    check('hub: kontrol membawa tahap program (tahap 1 tidak hilang)', h2 && h2.program_detail.acne.tahap == 1, h2 && h2.program_detail.acne);
    check('hub: kontrol tanpa buka form program -> isian dibawa dari handoff & tetap bersih', h2 && (() => { const t = h2.program_detail.acne.isian.join(' | '); return /Tretinoin 0,025%/.test(t) && !/Isotretinoin|Spironolactone/.test(t) && h2.asesmen.dibawa.includes('program_detail.acne'); })(), h2 && h2.program_detail.acne.isian);
    check('hub: kontrol membawa ciri menetap (tipe kulit) tapi BUKAN BB/TB/IMT lama', h1 && h2 && h1.asesmen.pemeriksaan.bb === '58' && h2.asesmen.pemeriksaan.tipe_kulit === 'Kombinasi, Sensitif' && !h2.asesmen.pemeriksaan.bb && !h2.asesmen.pemeriksaan.imt, h2 && h2.asesmen.pemeriksaan);
    check('hub: kontrol: derajat = IGA hari ini (tidak dibawa dari kunjungan lalu)', h2 && h2.asesmen.derajat === 'Acne IGA 1 · Hampir bersih (Almost clear)' && !h2.asesmen.dibawa.includes('derajat'), h2 && h2.asesmen.derajat);
    check('F2 kontrol: kotak alergi tampil (terisi dari handoff) & bisa diubah', $(b.d, 'alergi_box').style.display !== 'none' && $(b.d, 'alergi_flag').value === 'Penisilin');
    check('hub: pantangan dibawa ke kontrol & tampil di panel journey', h2 && h2.asesmen.hindari === 'Hindari scrub' && $(b.d, 'h_avoid').value === 'Hindari scrub', { h: h2 && h2.asesmen.hindari, panel: $(b.d, 'h_avoid').value });
    check('hub: alergi terbawa di kontrol', h2 && h2.asesmen.alergi === 'Penisilin', h2 && h2.asesmen.alergi);
    check('hub: diagnosis terbawa di kontrol', h2 && /Acne/.test(h2.asesmen.diagnosis || ''), h2 && h2.asesmen.diagnosis);

    /* ===== 5. KONTROL #3 (rantai) ===== */
    const c = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
    muatRM(c, 'muatHandoffHub', RM); await until(() => c.w._prevHandoff);
    check('F2: handoff #2 dimuat (kunjungan_ke 2)', c.w._prevHandoff && c.w._prevHandoff.kunjungan_ke === 2);
    check('F2: IGA baseline di kunjungan 3 masih 3', c.w.igaData('acne') === null || c.w._igaBaseline('acne') === 3, c.w._igaBaseline('acne'));
    set(c.d, 'k1_dokter', 'dr. Uji, Sp.DVE'); set(c.d, 'k1_hasil', 'Stabil'); c.w.setIGA('ac_iga', '0');
    set(c.d, 'd5_iv', '14'); set(c.d, 'd5_start', '2026-11-02'); set(c.d, 'd7_remarks', 'Selesai'); chk(c.d, 'd8_signoff');
    c.w.issueHandoff(); await sleep(500);
    const h3 = disk('handoff_terakhir.json');
    check('hub: handoff #3 = kunjungan_ke 3, riwayat 2 (urut)', h3 && h3.kunjungan_ke === 3 && h3.riwayat.length === 2 && h3.riwayat[0].kunjungan_ke === 1 && h3.riwayat[1].kunjungan_ke === 2, h3 && { k: h3.kunjungan_ke, r: h3.riwayat.map(x => x.kunjungan_ke) });
    check('hub: riwayat kunjungan 2 membawa evaluasi (IGA) agar tren tak hilang', h3 && h3.riwayat[1] && h3.riwayat[1].evaluasi && h3.riwayat[1].evaluasi.iga, h3 && h3.riwayat[1]);
    check('hub: riwayat kunjungan 2 membawa diagnosis & resep (rantai utuh)', h3 && /Acne/.test(h3.riwayat[1].diagnosis || '') && /Tretinoin/.test(h3.riwayat[1].resep || ''), h3 && h3.riwayat[1]);
    check('hub: baseline tetap 3 di kunjungan 3', h3 && h3.program_detail.acne.iga_baseline === 3 && h3.program_detail.acne.iga === 0 && h3.program_detail.acne.iga_delta === 3, h3 && h3.program_detail.acne);
    check('hub: 3 berkas handoff berstempel + 1 terakhir', fs.readdirSync(path.join('data', RM)).filter(f => /^handoff_\d/.test(f)).length === 3);
    const lst = await (await fetch(BASE + '/api/pasien', { headers: { 'X-ADC-Key': KEY } })).json();
    check('hub: daftar pasien menampilkan RM, nama, kunjungan 3, program', lst.pasien[0] && lst.pasien[0].rm === RM && lst.pasien[0].kunjungan_ke === 3 && /Acne/.test(lst.pasien[0].program), lst.pasien);

    /* ===== 5b. melasma & hair: isian hanya dari tahap terpilih, penilaian di luar blok tetap terekam ===== */
    const m = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
    set(m.d, 'p_nama', 'Uji Program Lain'); set(m.d, 'rm', 'RM-TEST-002');
    m.w.setIGA('me_iga', '2'); chk(m.d, 'me_foto_ok'); m.w.pickStage('melasma', 'P');
    chk(m.d, 'hr_foto_ok'); m.w.pickStage('hair', 1);
    check('F2: memilih tahap tidak mencentang apa pun otomatis (tanpa centang bawaan)', [...m.d.querySelectorAll('#ovl_acne input[type=checkbox], #ovl_melasma input[type=checkbox], #ovl_hair input[type=checkbox]')].every(c => !c.defaultChecked) && !m.d.querySelector('#hr_blk-1 input:checked') && !m.d.querySelector('#me_block-P input:checked'));
    m.d.querySelector('#hr_blk-1 input[type=checkbox]').checked = true;
    const pdm = m.w.buildHandoff().program_detail;
    check('F2: melasma & hair aktif', !!pdm.melasma && !!pdm.hair, Object.keys(pdm));
    check('F2 melasma: isian hanya blok P (tidak ada isi blok A/M)', (() => {
      const own = [...m.d.querySelectorAll('#ovl_melasma .stage-block:not(#me_block-P) input')].map(e => (e.value || '').trim()).filter(Boolean);
      const t = pdm.melasma.isian.join('|'); return pdm.melasma.isian.length > 0 && own.every(v => !t.includes(v) || [...m.d.querySelectorAll('#me_block-P input')].some(e => (e.value || '').trim() === v));
    })(), pdm.melasma && pdm.melasma.isian);
    check('F2 melasma: foto klinis (di luar blok) tetap terekam', pdm.melasma.isian.some(x => /pencahayaan/i.test(x)), pdm.melasma.isian);
    check('F2 hair: foto klinis (di luar blok) tetap terekam', pdm.hair.isian.some(x => /pencahayaan/i.test(x)), pdm.hair.isian);
    check('F2 hair: isian dari blok tahap 1, tidak ada label blok tahap 2/3', (() => {
      const lab = sel => [...m.d.querySelectorAll(sel + ' label')].map(l => l.textContent.trim()).filter(Boolean);
      const own = lab('#hr_blk-1'), other = lab('#hr_blk-2').concat(lab('#hr_blk-3')).filter(x => !own.includes(x));
      return own.some(x => pdm.hair.isian.includes(x)) && other.every(x => !pdm.hair.isian.includes(x)) && other.length > 0;
    })(), pdm.hair.isian);

    /* ===== 5c. Derajat (IGA) dipilih SEBELUM program -> dipakai program begitu aktif ===== */
    const g = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
    g.w.updateIgaCards();
    check('F2 derajat: kartu umum tampil sebelum ada program', $(g.d, 'igacard_umum').style.display !== 'none' && $(g.d, 'igacard_acne').style.display === 'none');
    g.w.setIGAUmum('d1_iga', '3');
    check('F2 derajat: pilih 3 sebelum program -> d2_derajat terisi, program belum aktif', /^IGA 3 · Sedang/.test($(g.d, 'd2_derajat').value) && !g.w.activeProgs().includes('acne'), $(g.d, 'd2_derajat').value);
    g.w.pickStage('acne', 1);
    check('F2 derajat: program Acne dipilih -> IGA acne = 3, nilai sementara dikosongkan, kartu umum hilang', $(g.d, 'ac_iga').value === '3' && $(g.d, 'd1_iga').value === '' && $(g.d, 'igacard_umum').style.display === 'none' && $(g.d, 'igacard_acne').style.display !== 'none', { ac: $(g.d, 'ac_iga').value, u: $(g.d, 'd1_iga').value });
    g.w.setIGA('ac_iga', '3');
    check('F2 derajat: ketuk ulang membatalkan skor program (tidak terisi lagi otomatis)', $(g.d, 'ac_iga').value === '', $(g.d, 'ac_iga').value);
    g.w.setIGA('ac_iga', '2');
    check('F2 derajat: d2_derajat dirangkum per program', $(g.d, 'd2_derajat').value === 'Acne IGA 2 · Ringan (Mild)' && g.w.buildHandoff().asesmen.derajat === 'Acne IGA 2 · Ringan (Mild)', $(g.d, 'd2_derajat').value);

    /* ===== 5d. regresi bug review 2026-10-09 ===== */
    { const h = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      h.w.setIGAUmum('d1_iga', '3'); h.w.pickStage('hair', 1);
      check('F2 derajat + Hair-Loss saja: nilai sementara dibuang, tidak masuk handoff', $(h.d, 'd1_iga').value === '' && h.w.buildHandoff().asesmen.derajat === '', h.w.buildHandoff().asesmen.derajat); }
    { const m2 = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      m2.w.setIGAUmum('d1_iga', '3');
      const cb = m2.d.querySelector('#ovl_melasma input[type=checkbox]'); cb.checked = true; m2.w.markProg('melasma');
      check('F2 derajat: menyentuh form Melasma (tanpa pilih tahap) TIDAK menyalin IGA', $(m2.d, 'me_iga').value === '' && $(m2.d, 'd1_iga').value === '3', { me: $(m2.d, 'me_iga').value });
      m2.w.pickStage('acne', 1);
      check('F2 derajat: dipakai program yang tahapnya dipilih (Acne)', $(m2.d, 'ac_iga').value === '3' && $(m2.d, 'me_iga').value === '' && $(m2.d, 'd1_iga').value === ''); }
    { const lo = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      lo.w.applyIntake({ doc: 'ADC-INTAKE', pasien: {}, kritis: { alergi: '', alergi_nihil: true }, penugasan: {}, pengukuran: {}, persetujuan: {} });
      lo.w._intake = null;
      lo.w.applyHandoff({ doc: 'ADC-HANDOFF', pasien: {}, asesmen: { alergi: 'Penisilin' } });
      check('F2: handoff beralergi menimpa "nihil" (tidak pernah keduanya)', $(lo.d, 'alergi_flag').value === 'Penisilin' && !$(lo.d, 'alergi_none').checked); }
    { const dl = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      let applied = 0; dl.w.applyIntake = () => { applied++; };
      let pending = null; dl.w.hubGetPasien = (rm, cb) => { pending = cb; };
      dl.w.muatIntakeHub(); dl.d.getElementById('mdlg_rm').value = RM; dl.d.getElementById('mdlg_ok').click(); dl.d.getElementById('mdlg_ok').click();
      dl.d.getElementById('mdlg_x').click();
      dl.w.muatHandoffHub();
      pending({ intake: { doc: 'ADC-INTAKE' } }, null);
      check('F2 dialog: Batal membatalkan — respons terlambat tidak memuat & tidak menutup dialog berikutnya', applied === 0 && dl.d.getElementById('mdlg').classList.contains('on'), { applied });
      dl.d.dispatchEvent(new dl.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      let escOk = !dl.d.getElementById('mdlg').classList.contains('on');
      dl.w.openProg('acne'); dl.d.dispatchEvent(new dl.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      check('F2 dialog: Esc menutup dialog, lalu tetap menutup form program (listener tidak bocor)', escOk && !dl.d.getElementById('ovl_acne').classList.contains('open')); }

    { const fm = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      fm.w.applyIntake({ doc: 'ADC-INTAKE', pasien: {}, kritis: { alergi_nihil: true }, penugasan: { foto_baseline: true, foto_area: 'Wajah' }, pengukuran: {}, persetujuan: {} });
      fm.w.pickStage('melasma', 'P');
      const fo = fm.w.metricStatus().find(m => m.label === 'Foto klinis Melasma');
      check('F2 Melasma: foto baseline dari Form 1 memenuhi syarat foto (tidak perlu dicentang ulang)', fo && fo.ok && !$(fm.d, 'me_foto_ok').checked && /Form 1/.test($(fm.d, 'me_foto_f1').textContent), fo); }

    { const pr = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      pr.w.applyIntake({ doc: 'ADC-INTAKE', pasien: { nama: 'Uji <b>X</b>', rm: 'RM-9' }, kritis: { alergi: 'Sulfa', keluhan: 'Jerawat' }, penugasan: { foto_baseline: true }, pengukuran: {}, persetujuan: { total: 2, disetujui: 2, tanda_tangan: { pasien: { nama: 'A', tanggal: '2026-10-10', gambar: 'data:image/png;base64,iVBORw0KGgo=' } } }, seksi: [{ kode: 'P4', isian: [{ k: 'Lokasi utama', v: 'Pipi' }] }] });
      set(pr.d, 'd2_dx', 'Acne vulgaris'); pr.w.pickStage('acne', 1);
      const el = pr.w._lembarCetak(), tx = el.textContent;
      check('Cetak: lembar 1 halaman memuat identitas, alergi, P4, diagnosis, program; nama di-escape', /Lembar Asesmen Dokter/.test(tx) && /Sulfa/.test(tx) && /Lokasi utama/.test(tx) && /Acne vulgaris/.test(tx) && /Tahap Ringan/.test(tx) && !el.querySelector('b b') && tx.includes('Uji <b>X</b>'), tx.slice(0, 200));
      check('F2: tanda tangan menampilkan titik tengah, bukan kode &middot;', !/&middot;/.test($(pr.d, 'intake_body').textContent) && /A · 2026-10-10/.test($(pr.d, 'intake_body').textContent)); }

    { const pg = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      const tick = (sel, txt) => { const l = [...pg.d.querySelectorAll(sel + ' label')].find(x => x.textContent.replace(/\s+/g, ' ').trim().startsWith(txt)); l.querySelector('input').checked = true; };
      pg.w.pickStage('acne', 2); pg.w.setIGA('ac_iga', '2');
      tick('#ovl_acne .ff-table', 'Kulit berminyak'); tick('#ovl_acne .ff-table', 'Metabolic Health'); tick('#ac_block-2', 'Excel V');
      tick('#ovl_acne .qline', 'Ya');
      pg.d.querySelector('#ovl_acne label.consent-item input').checked = true;
      pg.d.querySelector('#ovl_acne .tx-extra').value = 'Diet rendah GI';
      check('F2: treatment tambahan di tabel 4 faktor tersimpan di handoff (dulu hilang)', pg.w.buildHandoff().program_detail.acne.isian.includes('Faktor "Sebum berlebih" — treatment tambahan: Diet rendah GI'), pg.w.buildHandoff().program_detail.acne.isian.slice(-2));
      const box = pg.w._lembarCetak().querySelector('.ps-prog'), t = box.textContent;
      check('Cetak: program dikelompokkan (tahap, derajat, penyebab, rencana klinik, edukasi) tanpa jawaban Ya/Tidak',
        /Tahap Menengah–Berat/.test(t) && /Derajat hari ini: 2 · Ringan/.test(t) && /Penyebab yang ditemukan/.test(t) && /Sebum berlebih: kulit berminyak/.test(t) &&
        /Rencana perawatan di klinik/.test(t) && /Metabolic Health/.test(t) && /Excel V/.test(t) && /Sebum berlebih: Diet rendah GI/.test(t) &&
        /Sudah dijelaskan ke pasien/.test(t) && ![...box.querySelectorAll('li')].some(li => /^(Ya|Tidak)$/.test(li.textContent.trim())), t.slice(0, 300)); }

    /* ===== 5e. regresi review lembar cetak ===== */
    { /* kunjungan kontrol: tahap dari handoff, modal tak dibuka */
      const v1 = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      v1.w.pickStage('acne', 2); v1.w.setIGA('ac_iga', '3'); set(v1.d, 'rm', 'RM-K'); set(v1.d, 'd2_dx', 'Acne');
      const ho = v1.w.buildHandoff();
      const v2 = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      v2.w.applyHandoff(ho); v2.w.setIGA('ac_iga', '1');
      const t2 = v2.w._lembarCetak().textContent;
      check('Cetak kontrol: tahap dari handoff tampil & rencana dinyatakan dilanjutkan (bukan "belum ada tindakan")',
        /Tahap Menengah–Berat/.test(t2) && /Melanjutkan rencana perawatan/.test(t2) && !/Belum ada tindakan/.test(t2) && /awal 3 → membaik 2 tingkat/.test(t2), t2.slice(t2.indexOf('Program'), t2.indexOf('Program') + 260)); }
    { /* Hair: edukasi (tanpa .consent-item) & nama fase */
      const hh = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      hh.w.pickStage('hair', 1);
      const ed = [...hh.d.querySelectorAll('#ovl_hair .sec')].find(x => /Edukasi/.test((x.querySelector('.sech') || {}).textContent || ''));
      ed.querySelector('input[type=checkbox]').checked = true;
      const th = hh.w._lembarCetak().textContent;
      check('Cetak Hair: edukasi tercetak & nama fase (bukan "Tahap Fase")', /Sudah dijelaskan ke pasien/.test(th) && /Tipe kerontokan/.test(th) && /Fase 1 · Active Stimulation/.test(th) && !/Tahap Fase/.test(th), th.slice(th.indexOf('Hair'), th.indexOf('Hair') + 200)); }
    { /* singkatan tetap kapital; ritme tidak dicetak bila hanya durasi bawaan */
      const ab = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      ab.w.pickStage('acne', 1);
      const l = [...ab.d.querySelectorAll('#ovl_acne .ff-table label')].find(x => /Diet tinggi GI/.test(x.textContent)); l.querySelector('input').checked = true;
      const ta = ab.w._lembarCetak().textContent;
      check('Cetak: singkatan (GI) tetap kapital; ritme kosong tidak dicetak "3 bulan"', /diet tinggi GI/.test(ta) && !/Ritme kontrol/.test(ta), ta.slice(ta.indexOf('Penyebab'), ta.indexOf('Penyebab') + 120)); }
    { /* tanda tangan dari berkas intake: hanya data:image, tidak bisa menyisipkan atribut */
      const xs = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      xs.w.applyIntake({ doc: 'ADC-INTAKE', pasien: {}, kritis: {}, penugasan: {}, pengukuran: {}, persetujuan: { total: 1, disetujui: 1, tanda_tangan: { pasien: { nama: 'Z', gambar: 'x" onerror="window.__xss=1' } } } });
      check('Keamanan: tanda tangan bukan data:image ditolak (tidak ada <img onerror>)', !xs.d.querySelector('#intake_body img') && !xs.d.querySelector('[onerror]') && !xs.w.__xss); }

    /* ===== 6. offline-first: kunci salah / hub mati ===== */
    const bad = await open('ADC_Form2_Asesmen_Umum_Dokter.html', { key: 'salah' });
    muatRM(bad, 'muatIntakeHub', RM); await sleep(500);
    check('F2 kunci salah: tidak crash, dialog tetap terbuka & menyarankan pilih berkas', bad.d.getElementById('mdlg').classList.contains('on') && /tidak ada di hub.*Pilih berkas/.test(bad.d.getElementById('mdlg_msg').textContent), bad.d.getElementById('mdlg_msg').textContent);
    const before = fs.readdirSync(path.join('data', RM)).length;
    const f1b = await open('ADC_Form1_Registrasi_Anamnesis_Pasien.html', { key: 'salah' });
    set(f1b.d, 'p_nama', 'Offline'); set(f1b.d, 'rm', 'RM-TEST-OFF'); f1b.w.simpanIntake(); await sleep(500);
    check('F1 kunci salah: berkas unduhan tetap dibuat; hub menolak (tak ada data baru)', f1b.dialogs.some(x => x.type === 'download') && !fs.existsSync(path.join('data', 'RM-TEST-OFF')) && fs.readdirSync(path.join('data', RM)).length === before);
    srv.kill(); await sleep(400);
    const off = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
    check('F2 hub mati: halaman tetap termuat', !!off.w.issueHandoff && off.w._hubOn === false);
    set(off.d, 'p_nama', 'Offline'); set(off.d, 'rm', 'RM-OFF'); set(off.d, 'd2_dx', 'x'); chk(off.d, 'd8_signoff'); chk(off.d, 'alergi_none');
    let threw = null; try { off.w.issueHandoff(); } catch (e) { threw = e; }
    check('F2 hub mati: terbitkan handoff tetap jalan (popup/JSON cadangan)', !threw && off.w.__popup && /Ringkasan Handoff/.test(off.w.__popup.document.html), threw && String(threw));
    let klik = 0; off.w.HTMLInputElement.prototype.click = function () { if (this.id === '_handofffile') klik++; };
    off.w.muatHandoffHub();
    check('F2 hub mati: "Muat Handoff" jatuh ke pemilih berkas', klik === 1, klik);
  } catch (e) { console.log('ERROR TEST:', e.stack); results.push({ name: 'harness', ok: false, detail: String(e) }); }
  finally { try { srv.kill(); } catch (e) {} }
  const gagal = results.filter(r => !r.ok);
  console.log('\n' + (results.length - gagal.length) + '/' + results.length + ' lulus');
  try { fs.rmSync(WORK, { recursive: true, force: true }); } catch (e) {}
  process.exit(gagal.length ? 1 : 0);
})();
