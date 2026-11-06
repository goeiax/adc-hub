---
target: Form 2 (ADC_Form2_Asesmen_Umum_Dokter.html)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
target_fingerprint: "sha256:6728b4108db768febceb47f0a3c9296a0de258d9cc2fa98ea06b8974176d75e5"
target_path: "C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
timestamp: 2026-11-06T12-39-33Z
slug: adc-form2-asesmen-umum-dokter-html
---
Method: dual-agent (A: design review agent · B: detector + browser agent). Target `www/ADC_Form2_Asesmen_Umum_Dokter.html` on the running hub, 1024×768 and 375, not logged in, tablet key unregistered.

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Modal IGA mirror says "belum dinilai" after IGA set in D1 until a stage is picked. |
| 2 | Match System / Real World | 3 | Three date formats (ISO in #ctx_acne, locale in done card, dd/mm inputs); "di-generate", "Sign-off dicentang". |
| 3 | User Control and Freedom | 3 | Terbitkan reachable from Lainnya on any step, above Reset. |
| 4 | Consistency and Standards | 2 | Dialog footers differ (#mdlg/#ldlg row vs #sdlg/#tdlg stacked); hair phase cards div onclick; Pakai ragged x. |
| 5 | Error Prevention | 3 | #tdlg commit below the fold (P0); sign-off PIN dialog on unregistered tablet. |
| 6 | Recognition Rather Than Recall | 3 | "Muat Form 1" only in toolbar; Fitzpatrick/Tipe kulit groups unnamed for SR. |
| 7 | Flexibility and Efficiency | 3 | IGA straddles the fold; 6 steps + 5-part modal. |
| 8 | Aesthetic and Minimalist Design | 3 | Chrome 196 px (311 kontrol); "Sensitif" wraps the skin-type row. |
| 9 | Error Recovery | 3 | PIN failure on bad key shows raw server text. |
| 10 | Help and Documentation | 2 | Panduan link in #mdlg_msg is 52×14 px. |
| **Total** | | **28/40** | **Good** |

## Design Specificity Verdict

LLM: authored for ADC (4-factor menu, Tahap 1–4, Saran rows = Oku regimen, hub-by-RM, IGA baseline, SleekFlow); chrome generic.

Detector: 19 (was 31): side-tab ×2 intentional, low-contrast ×1 (locked zone opacity), tight-leading ×1 (label lock), tiny-text ×4 (print meta + one overlay cell, minor), wide-tracking ×9 (uppercase; one sentence-case .05em in hair modal), repeated "wajib" ×1 FP, em-dash advisory.

Overlays: cream palette only (brand). [Human] tab open; live server stopped; files unchanged.

## Overall Impression

25 → 28. No native dialog, no missing accessible name, no sub-44 commit control, no false hub promise left. New: the publish dialog grew (identity warning + hub line) to 776 px in a fixed backdrop that cannot scroll — commit button below the fold at 1024×768.

## What's Working

- #tdlg tells the truth before commit (async Hub line, Daftarkan tablet button, "Terbitkan tanpa hub").
- Protocol one-tap default (Saran rows, Pakai 65×44, mirror updates).
- Dialog & focus discipline (8 labelled dialogs, trap, Escape, restore, 2 px ring).

## Priority Issues

1. [P0] #tdlg 460×776 at y=92 in `.mdlg-bg` (fixed, no overflow): "Kembali & lengkapi" y=752–796, "Terbitkan…" y=804–848 at 768. Fix: `.mdlg-bg{overflow:auto}`; `.mdlg.sdlg{max-height:calc(100vh - 12vh - 16px);display:flex;flex-direction:column}` with `.miss{overflow:auto;flex:1}` and `.mdlg-b` pinned; same for #sdlg. Command: harden.
2. [P1] IGA straddles the fold: #d2_dx y=694, IGA buttons 739–814; Fitz/Tipe row 273–420 ("Sensitif" wraps), .d1h 36 px. Fix: findings block first, profile row second; 5 skin-type chips on one line; drop .d1h band; IGA fully visible by y≤720. Command: layout.
3. [P1] Sign-off PIN dead end on unregistered tablet: signoffTTD → _ldlg('ttd'); cancel → "centang lagi untuk memasukkan PIN". Fix: _hubSiap first; on kunci/jaringan keep tick, #d8_ttd "Tablet belum terdaftar — sign-off dicatat tanpa PIN" + Daftarkan tablet action; reuse _terbitHubSt logic. Command: harden.
4. [P2] Inconsistencies: ISO date in #ctx_acne (use _tglID); program line doubles the name ("Acne — Acne IGA 3"); dialog footers (#sdlg/#tdlg stacked left vs row right); Pakai ragged x (two cells / flex). Command: polish.
5. [P2] Hair modal: phase cards div.s onclick (not focusable, no aria-pressed); rail .pn 11 px / 10.5 phone; 2301 px tall, no Ya/Tidak pattern. Fix: buttons with aria-pressed, 12 px eyebrow, split part 1. Command: audit.
6. [P3] Kontrol: #hobar pushes rail to y=246, K1 at y=868; fix: K1 above D1 or D1 read-only strip; hobar one 56 px line. Command: layout.

## Persona Red Flags

Jordan: no Muat cue in step 1; "belum terdaftar" unexplained until failure; PIN asks for an ID; modal "IGA belum dinilai"; WAJIB denominator moves.
Sam: Fitz/Tipe groups unnamed; hair cards not focusable; 634 px chrome at 200 %; #tdlg commit off-screen. Good: ring, trap, Escape, restore, labelled dialogs, main landmark, no duplicate ids.
Dr. Sari: scroll for IGA and Lanjut; PIN dead end; "4 peringatan" + 5 blocks reads as wrong; default focus "Kembali & lengkapi" sends to step 1.

## Minor Observations

- #alergi_flag placeholder clipped at 390 px; #d5_iv/#d5_start 5 px misaligned.
- One Pakai click left its Saran row visible in the reviewer's walk (suite passes) — recheck pairing in browser.
- Expanded WAJIB strip 148 px; toggle has three labels.
- Lainnya: Terbitkan two rows above Reset; focus not moved into menu.
- Dimmed kontrol rail step still clickable.
- Pop-up-blocked note will be the norm on tablets; make "Buka ringkasan" primary.
- Detector: sentence-case .05em in hair modal; print-only 11 px meta.

## Questions to Consider

- Merge steps 1–2 so Diagnosis/IGA top the first screen?
- Declare "sign-off tanpa PIN" up front on an unregistered tablet instead of attempting a PIN?
- Why does Terbitkan live in Lainnya on every doctor step?
