# CLAUDE.md — ADC Hub / Skin Quality Program forms

Clinical forms + companion server for Aesthetic Derma Centre (Bandung) — Skin Quality
Program (Acne, Hiperpigmentasi/Melasma, Hair-Loss). Owner: Alex. UI language: Bahasa
Indonesia (all form/patient text). Code comments: Indonesian is fine.

## Layout & source of truth
- **Form sources live one level up** in `../` (the Marketing folder):
  `../ADC_Form1_Registrasi_Anamnesis_Pasien.html` (nurse+patient intake, new patients only),
  `../ADC_Form2_Asesmen_Umum_Dokter.html` (doctor assessment, contains program modals),
  `../ADC_Panduan_Pengisian_Form.html` (how-to guide — ALL instructional text lives here, not in forms).
- `www/` holds **copies** served by the hub. Edit the `../` sources, then sync with
  `update-forms.bat` (or `push.bat`, which syncs + commits + pushes). Never edit `www/` directly.
- `server.js` — zero-dependency Node stdlib server (port 3777): serves `www/`, stores
  intake/handoff per No. RM under `data/<RM>/`. Key in `config.json` (header `X-ADC-Key`).
- `neosoft-explore.js` — read-only NeoSoft Cube DB schema explorer (needs `npm i mysql2`
  + local `neosoft.json`). Run on clinic PC only.
- Launch Claude Code from here with the parent added: `claude --add-dir ..`

## Hard rules
- **NEVER commit** `data/` (patient records), `config.json`, `neosoft.json`, `neosoft-skema.txt` (.gitignore covers them — keep it that way).
- **NeoSoft DB is read-only.** SELECT only. Never write to the live NeoSoft database. Never put DB credentials in any committed file.
- **Restyle ≠ relogic.** When changing look/layout, keep every `id` and JS function intact. Engines read fields by id/label: `buildIntake()` (F1), `applyIntake()`, `applyHandoff()`, `buildHandoff()`, `reqStatus()`, `igaData()` (F2).
- Forms are **offline-first**: hub calls are optional and wrapped in try/catch; downloaded JSON files remain the backup in every path. Don't make the hub mandatory.
- No instruction text inside forms (moved to the Panduan). Patient-facing text in Form 1 stays.
- User-entered text renders blue (`--ink-fill:#1F4E9C`).

## Data contracts (JSON)
- `ADC-INTAKE v1` (Form 1 → Form 2): `pasien{nama,rm,wa,tanggal,…}`, `kritis{alergi,…,flags}`, `penugasan{dokter,foto_baseline,foto_area}`, `pengukuran{bb,tb,imt}`, `persetujuan{…,tanda_tangan}`.
- `ADC-HANDOFF v1` (Form 2, every visit): `asesmen{dokter,diagnosis,pemeriksaan{…},resep[],…}`, `program_detail{acne|melasma|hair}`, `jadwal[]`, `riwayat[]` (cumulative — newest handoff carries the whole history), `kunjungan_ke`, `penerbitan{signoff_dokter,…}`.
- IGA (FDA 0–4) entered once in Form 2 D1 via buttons (hidden inputs `ac_iga`/`me_iga`); modals show read-only mirrors. Success = IGA ≤1 AND drop ≥2 from baseline (`iga_baseline` anchored at visit 1, carried in handoff).

## Form 2 structure (current)
Steps: 0 Handoff & riwayat (D0 incl. patient identity) · 1 Pemeriksaan & diagnosis (D1 + IGA panel; K1 in kontrol mode) · 2 Program (D2, hidden & skipped in kontrol mode) · 3 Resep & jadwal (D3, D4, D4b) · 4 Rekomendasi & sign-off (D5–D7).
Kontrol mode = `body.mode-kontrol` (`.vis-awal` hidden, `.vis-kontrol` shown); issuing a handoff is blocked until the previous handoff is loaded (`hoBelumDimuat()`), unless `ho_absen` is checked (audit-flagged).

## Known gotchas (each bit us before)
- **Dual-role CSS classes**: `.sec`, `.row`, `.opt`, `.f`, `.ck` mean different things in main form vs. the Hair-Loss modal (`#ovl_hair`, imported markup). Any global style change must be checked for leakage into `#ovl_hair`.
- Grid span classes differ per file (`.k4` exists in Form 2, not Form 1). Check definitions in the target file.
- Avoid `border` shorthand with `var()` where tests run in jsdom — use longhands.
- Editing markup: delete exact element ranges (balanced-div scan), never broad regex — an earlier edit silently deleted the Acne program card.

## Testing
No browser in the sandbox; tests use jsdom (`npm i jsdom css-tree` in a temp dir). Standard checks after every change: CSS parse (skip `<style>` blocks containing `'+`), `node --check` on extracted scripts, duplicate-id scan, plus a functional run through the real click paths (save intake → load in F2 → IGA → issue handoff → reload as kontrol). For hub tests, start `node server.js` and run the test in the same shell session.

Automated end-to-end: `node e2e-test.js` (104 checks; runs on a temp copy of `server.js` + `www/`, jsdom auto-installed to temp, real `data/` untouched). Run `update-forms.bat` first so `www/` is current. Covers F1 → hub → F2 → handoff #1 → two chained kontrol handoffs, hub auth/path guards, offline fallbacks. Not covered: signature canvas, print/popup layout, real tablets.
Kontrol handoffs carry diagnosis/pemeriksaan (tipe kulit, Fitzpatrick)/resep/program tahap forward from the loaded handoff when empty today (`_bawaKontrol()`, listed in `asesmen.dibawa`); values entered today always win.

D1 data rules (2026-10-08/09): allergy is entered in Form 1 for new patients (Form 2 hides the editable box when an intake is loaded; shown in Ringkasan), but is editable in Form 2 when no intake is loaded (kontrol). `d2_derajat` is computed from IGA (`_derajatTeks()`), not typed; a Derajat chosen before any program (`d1_iga`) is applied only when a program STAGE is picked (or the program is in the handoff). `d2_hasil` = "Catatan klinis" (temuan + penunjang); `d1_umum` is a hidden legacy field.

## Open items
- Clinic trial run (one fake patient end-to-end on clinic tablets) — not yet done.
- NeoSoft: run `neosoft-explore.js` on clinic PC, then build `GET /api/neosoft/:rm` (read identity by RM) + form pre-fill.
- GitHub: `goeiax/adc-hub` (private) exists; `main` pushed and tracking `origin/main`.
- IGA memo awaiting doctor ratification; Dr. Kamelia hair-loss answers pending.
- **Resep → dropdown (waiting on Alex's lists, requested 2026-10-08).** In every Form 2 program Rx table (8 `.rx-table`s across Acne/Melasma/Hair: "Cream / obat oles" and "Obat minum (oral)"), the drug column must become a dropdown the doctor picks from, default empty — not pre-filled text. Alex will upload the ADC cream list and oral-drug list. Interim fix done 2026-10-09: the pre-filled drug names were turned into placeholders, so `collectRx()` records only rows the doctor actually types (previously every row of the chosen stage, incl. Isotretinoin / Spironolactone, was recorded as prescribed). Keep the `.rx-table tbody tr` → 4 inputs shape (or update `collectRx()`/`_progDetail()`), and keep Jadwal/Cara/Durasi editable.
- Full session history: Obsidian vault `Sessions/2026-07-08 ADC Skin Quality Program Session.md`.
