---
target: Form 2 (ADC_Form2_Asesmen_Umum_Dokter.html)
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
target_fingerprint: "sha256:2c3a5eeeffb20062c709060dcef86aeb0244c8aaffb90262cf664462ce3abac1"
target_path: "C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
timestamp: 2026-11-06T09-22-19Z
slug: adc-form2-asesmen-umum-dokter-html
---
Method: dual-agent (A: design review agent · B: detector + browser agent). Target `www/ADC_Form2_Asesmen_Umum_Dokter.html` on the running hub, measured at 1024×768 and 375, not logged in.

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | HUB chip "belum masuk" at load vs "belum terdaftar" after publish; IGA no aria-pressed; d8_status truncates. |
| 2 | Match System / Real World | 3 | Step 0 heading promises a handoff summary for new patients; ISO date in modal context strip. |
| 3 | User Control and Freedom | 3 | Escape keeps state; no "sudah diterbitkan" state after publish. |
| 4 | Consistency and Standards | 2 | Radios share the checkbox square glyph; hair modal 11 px labels; ICD dialog no accessible name. |
| 5 | Error Prevention | 3 | Publish dialog Hub line says "disimpan ke hub" on a device without a key. |
| 6 | Recognition Rather Than Recall | 3 | Doctor name typed twice; IGA names in tooltips only. |
| 7 | Flexibility and Efficiency | 2 | Step 2 1353 px, acne Rx part 1432 px; ID + PIN per patient. |
| 8 | Aesthetic and Minimalist Design | 2 | Rx part 79 inputs; empty 4th program-grid column; sticky strip 148 px with lihat semua in kontrol. |
| 9 | Error Recovery | 3 | Actionable hub copy; done card does not take focus. |
| 10 | Help and Documentation | 1 | No Panduan link. |
| **Total** | | **25/40** | **Acceptable** |

## Design Specificity Verdict

LLM: protocol-specific body (4-factor table, Tahap ladder, Saran rows, single IGA, hand-over rule) in a generic shell; hair modal still looks imported.

Detector: 21 findings (was 31 two runs ago): tiny-text ×4 (.prog .psub, .hubchip span 11 px), wide-tracking ×9 (uppercase; 2 borderline .05em), low-contrast ×3 (1 intentional .lock opacity; 1 REAL: .icdbtn:hover resolves --accent #C97A5E = 3.3:1, use --accent-act), side-tab ×2 (.zone 4 px + 14 px radius), tight-leading ×1, repeated "wajib" ×1, em-dash advisory.

Overlays: nested-cards on #alergi_box, cream palette. [Human] tab open; live server stopped; files unchanged.

## Overall Impression

Run 6's seven fixes hold (keyboard modal model, review dialogs, clinician wording named as strengths; no native dialog or sub-44 control hit). Deeper walk exposed: modal inputs have no accessible names (worsened by data-ph placeholders), publish dialog's Hub line is false without a key. Biggest opportunity: name every input, truthful hub readiness.

## What's Working

- #sdlg/#tdlg review-before-commit.
- Protocol at the point of entry (Pakai, stage cards, Risiko bekas, IGA mirror, pregnancy bands).
- Modal keyboard model (Tab/Shift+Tab trapped, Escape keeps data, aria-current, 44 px targets).

## Priority Issues

1. [P0] 161 modal + 15 main-form text inputs without label/aria-label (#d2_dx, #alergi_flag, #icd_q, D5 cells, Rx .td-input); #icdlg no accessible name; IGA/.progbtn no aria-pressed; no h1/h2; #hubchip span onclick. Fix: .lab spans → <label for>; aria-label per .td-input from th + row at init; aria-labelledby on #icdlg; aria-pressed; .sec as h2; chip as button. Command: harden.
2. [P1] #tdlg Hub line checks reachability only ("tersambung — handoff disimpan ke hub" on a keyless device, then ✗). Fix: readiness = reachable && key ok && session; else warn line "HUB · belum terdaftar — handoff hanya akan diunduh" with jump to hubSetup/hubLogin; _hubChipGagal single source for chip. Command: clarify.
3. [P1] Step 2: Diagnosis y=971, IGA y=1016 at 768 (doctor/Fitzpatrick/skin-type rows 122 px each); acne Rx part 1432 px, 79 inputs. Fix: one row for doctor+Fitzpatrick+skin type; Saran rows + one blank row per table; sub-tabs prosedur/oles/minum. Command: layout.
4. [P2] Radios drawn as squares; hair modal 11 px labels/unlabeled inputs; modal .ln/.td-input no focus ring. Fix: round radio glyph; acne chip system in hair; drop outline:none. Command: polish.
5. [P2] #d8_dokter empty though #d1_dokter filled; ID + PIN per patient. Fix: prefill from D1/_hubUser; remember last ID; focus PIN. Command: optimize.
6. [P3] No Panduan link; step 0 heading; nurse buttons 1/2/3 unexplained; empty prog-grid column; "Harga: bagian depan.". Command: onboard.

## Persona Red Flags

Jordan: blank handoff step; chip looks like a badge; "minta admin" dead end; WAJIB denominator 6→7→8; IGA vs Tahap scales unexplained; no Panduan link.
Sam: P0; 11–12 px functional text; at 375 a step-4 row nowrap → 420 px document, acne overlay scrolls sideways, sticky strip 295 px.
Dr. Sari: Diagnosis/IGA below fold; name twice; ID+PIN per patient; 5-part modal with 1432 px Rx part; Terbitkan at y≈1100; print two taps deep.

## Minor Observations

- Tooltips invisible on touch; Terbitkan also in Lainnya; done card does not take focus; rail no done state while editing.
- Detector: .icdbtn:hover → --accent-act; .psub/.hubchip span → 12 px; drop radius on .zone.
- CSS override layering with !important chains in modals.

## Questions to Consider

- Why does the doctor type their name at all with PIN login; why the ID per patient?
- Pre-apply the protocol and let the doctor edit/remove lines instead of accepting Saran rows?
- Is a six-step wizard right for a 15-minute consult; one sheet for steps 2–5 with the wizard only for hand-over?
