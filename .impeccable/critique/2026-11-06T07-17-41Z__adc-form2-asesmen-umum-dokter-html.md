---
target: Form 2 (ADC_Form2_Asesmen_Umum_Dokter.html)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
target_identity: "file:C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
target_fingerprint: "sha256:fd001a1eb06fb8c0f180430f194df41d10114c549c6edbc8e1961fdad195e745"
target_path: "C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
timestamp: 2026-11-06T07-17-41Z
slug: adc-form2-asesmen-umum-dokter-html
---
Method: dual-agent (A: design review agent · B: detector + browser agent). Target `www/ADC_Form2_Asesmen_Umum_Dokter.html` on the running hub, measured at 1024×768 and 375, not logged in.

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | WAJIB count, "Sekarang", stepper, done card strong; HUB chip degrades into "gagal: kunci salah. Lihat config.json…"; modal rail lacks aria-current. |
| 2 | Match System / Real World | 3 | ISO date in modal context strip; config/key/webhook plumbing shown to clinicians. |
| 3 | User Control and Freedom | 3 | ICD picker closes after one pick despite "boleh lebih dari satu". |
| 4 | Consistency and Standards | 2 | Modal checkboxes 13 px vs 17–20; sign-off wording differs between d8_status and done card; three numbering systems. |
| 5 | Error Prevention | 3 | #tdlg published with no name/RM ("RM —" plain). |
| 6 | Recognition Rather Than Recall | 3 | d8_dokter empty though d1_dokter filled; "+3 lagi" hides items. |
| 7 | Flexibility and Efficiency | 2 | 7 Pakai taps; ICD per code; 4–9 education ticks; no "hari ini"; menu no arrow keys. |
| 8 | Aesthetic and Minimalist Design | 3 | 254 px chrome before first field (313 kontrol); step 1 1446 px, IGA y≈1089; hair part 1 1901 px. |
| 9 | Error Recovery | 3 | Muat dialog says "tidak ada di hub" for a device-key error; publish failure still a native alert. |
| 10 | Help and Documentation | 2 | No Panduan link; kontrol mode explained only by a title tooltip. |
| **Total** | | **27/40** | **Acceptable** |

## Design Specificity Verdict

LLM: authored for ADC (4-factor treatment menu per trigger, Tahap 1–4/A–C with Oku regimen one tap away, IGA anchored at visit 1, hand-over rule); chrome generic.

Detector: 31 findings (exit 2, same set as run 5): tiny-text ×14 (real: .note/.callout/.pmctx/.band .rt at 11.5 px), wide-tracking ×9 (uppercase, 2 borderline .05em), low-contrast ×3 (1 intentional .lock opacity, 2 FP hover), side-tab ×2 (.zone/.band radius 14 + 4 px left border), tight-leading ×1 (intentional), repeated "wajib" ×1 (intentional), em-dash advisory.

Overlays: nested-cards on #alergi_box, cream palette on body — intentional. [Human] tab open; live server stopped; files unchanged.

## Overall Impression

Publish, toolbar and commit controls fixed since run 5 are now the strongest parts. Remaining: modals are not real dialogs, publish accepts no-RM, hub internals leak into copy.

## What's Working

- #sdlg/#tdlg: jump buttons, safe path filled, ink for the irreversible act, PIN-cancel re-enters.
- Saran protokol + "pilih pemicu dulu".
- WAJIB strip + #serah_now.

## Priority Issues

1. [P0] Program modals not accessible dialogs (no role/aria-modal, no focus move/trap/restore, .sev-card div onclick). Fix: dialog roles, focus rail on open, restore on close, shared trap, cards as <button aria-pressed>. Command: harden.
2. [P0] Publishing without RM is silent ("(nama belum diisi) · RM —" plain, published). Fix: first warning jumping to #rm when name/RM empty; Pasien KV .warn. Command: harden.
3. [P1] Hub plumbing leaks into clinician copy ("tidak ada di hub (kunci salah. Lihat config.json…)", chip, publish alert). Fix: branch on error class like __login__: "Tablet ini belum terdaftar di hub — minta admin mengatur kunci (Lainnya › Atur hub)", chip "belum terdaftar", 404-only "tidak ada di hub", publish failure into done card. Command: clarify.
4. [P1] Chrome/scroll budget at 1024: toolbar 72 + ctlbar 95 + rail 87 → first field y=392; IGA below fold; hobar +146; acne part 3 1342 px. Fix: modebar into toolbar, one-row strip, 56 px rail, one-line hobar, split modal part 3. Command: layout.
5. [P1] Three numbering systems (Langkah 1–6 / D0–D8,D4b,K1 / Bagian 1–4). Fix: drop D-codes from on-screen headings, cross-reference by rail label. Command: distill.
6. [P2] Size floors: .tg 32 px, .it.no spans not focusable, modal checkboxes 13 px, .rs-l 10 px, modal badges 11 px. Command: polish.
7. [P2] TTD dialog button row wraps (Tandatangani below/left of Batal). Fix: link full-width on wrap or "Atur hub…". Command: layout.

## Persona Red Flags

Jordan: "kunci salah. Lihat config.json" on first screen; no Panduan link; Terbitkan twice; "Simpan ke Rekam Medis" = txt + paste; D-codes vs Langkah.
Sam: modals without dialog semantics/focus; .sev-card and .it.no not focusable; 32 px toggle; strip 240 px at 200 %. Good: focus ring, live regions, no colour-only states.
Dr. Sari: 7 Pakai; ICD per code; 4–9 education ticks; no "hari ini"; retypes name/ID at every PIN; IGA/Diagnosis below fold.

## Minor Observations

- ISO date in #ctx_*; d8_dokter not prefilled; sign-off wording mismatch.
- Rail has no done state.
- "Pasien berikutnya" (destructive) is the filled primary of the success card.
- D5 "Harga: bagian depan." inside patient notes.
- Schedule rows 63–84 px → ~900 px before Terbitkan.
- Detector: .note/.callout/.pmctx/.band .rt → 12.5 px; drop card radius on .zone/.band.

## Questions to Consider

- Should setup be admin-only so the form speaks only "belum terdaftar / belum masuk / tersambung"?
- Per-step unmet counts instead of a sticky strip during the doctor's steps?
- Are education checkboxes a doctor task; one "sudah dijelaskan" if the patient sheet carries text + signature?
