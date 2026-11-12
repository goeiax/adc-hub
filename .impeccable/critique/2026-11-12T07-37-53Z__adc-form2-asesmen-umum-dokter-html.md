---
target: Form 2 Asesmen Umum Dokter
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
target_fingerprint: "sha256:328340689590f40a4ec199b392f62ccb5e4785b58846a06d15181bd9087cc8eb"
target_path: "C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
timestamp: 2026-11-12T07-37-53Z
slug: adc-form2-asesmen-umum-dokter-html
---
Method: dual-agent (A: design review sub-agent · B: detector + browser sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Step rail is not sticky; on long steps only the WAJIB bar says where you are |
| 2 | Match System / Real World | 3 | "Muat" confirms a dialog titled "Buka asesmen tersimpan"; "Pasien berikutnya" asks "Reset semua isian formulir?" |
| 3 | User Control and Freedom | 2 | Cancelling Reset still wipes the doctor's PIN signature stamp |
| 4 | Consistency and Standards | 2 | Three "selected" looks in one modal; native confirm/alert beside custom dialogs |
| 5 | Error Prevention | 3 | Schedule lock is mouse-only; empty "Resep & prosedur" part invites skipping |
| 6 | Recognition Rather Than Recall | 3 | Several "go to langkah N" hints are plain text, not links |
| 7 | Flexibility and Efficiency | 2 | First-visit IGA now costs step 2 → step 3 → modal → back |
| 8 | Aesthetic and Minimalist Design | 3 | Truncated placeholders; two "Dokter pemeriksa" fields in kontrol step 2 |
| 9 | Error Recovery | 3 | Reopen's "form changed" warning is the last line of a long alert |
| 10 | Help and Documentation | 2 | Empty modal part and dead Derajat hint have no in-place cue |
| **Total** | | **26/40** | **Solid, with avoidable friction** |

## Design Specificity Verdict

**LLM assessment.** Clearly authored for this clinic: the 4-factor acne table, Tahap cards, IGA with "Baseline kunjungan ini", the SEKARANG line, the warm Archivo/terracotta system with typed text in blue. Weak spots are generic rather than wrong: native confirm()/alert() in the newest flows (reset, reopen) and a done card that is a row of equal buttons. Moving IGA into the program form is right for the protocol but left three selection idioms and a dead hint box behind.

**Deterministic scan.** 18 CLI findings (exit 2) plus 2 from the in-page overlay. Intentional or false positive: side-tab ×2 (`.zone` 4px left border), low-contrast ×1 (text on a dark header misread as on white), repeated "wajib" ×1, cream palette banner, em-dash advisory (93). Real against the project's own floors: tiny-text ×4 (11px on screen: `span.req`, `span.lb`, `span.pn`, all `th`, `span.k`, `span.rn` 11.5px, `span.sk` 10.5px) and wide-tracking 0.05em ×4 on sentence-case hints in `#ovl_hair`. Overlay-only: nested-cards on `#alergi_box` in step 1. Measured: no horizontal overflow on steps 1–6; main-form targets pass 44px via their labels; **4–5 `input.ln` text inputs in the acne modal are 38px tall**.

**Visual overlays.** The overlay ran in a temporary tab that was closed afterwards; no overlay remains visible. Console reported 2 anti-patterns (nested-cards on `#alergi_box`, cream palette).

## Overall Impression

The form still reads as a purpose-built clinical tool, and the hand-over step is its best moment. This week's additions outran their finishing: a Reset that destroys the signature even when cancelled, a blank modal part, a locked zone the keyboard can still operate, and an IGA flow that sends the doctor elsewhere without a link. The biggest opportunity is to finish the IGA-in-program move properly.

## What's Working

- **Step 6 hand-over block** (`#serah_now`, `#serah_ringkas`, lock message with jump link): states the blocker, who owns it, and where to fix it.
- **Step-2 IGA mirror** with "Baseline kunjungan ini" and "Ubah di form program ›": one source of truth, reachable, focus returns correctly.
- **Contrast and target discipline is real** in the main form: nothing under 4.5:1 and nothing under 44px found outside the items listed below.

## Priority Issues

- **[P1] Cancelling "Reset form…" discards the doctor's signature stamp.** `resetForm()` clears `_ttd`, `_ttdTakBisa`, the `#d8_ttd` status and `_isian` before the `confirm()`. Confirmed live. A mis-tap then Cancel leaves a ticked sign-off with no PIN stamp and no message. Fix: confirm first; better, use the existing dialog pattern naming patient and RM. Suggested command: /impeccable harden
- **[P1] Acne "Bagian 4 · Resep & prosedur" is blank until a Tahap is picked.** The part is 59px of nav buttons. A doctor who jumps there concludes there is nothing to prescribe. Fix: empty state "Pilih tahap dulu di Bagian 3" with a button; same for melasma. Suggested command: /impeccable onboard
- **[P2] Three "selected" looks in one modal.** Checkbox and radio chips are cream with terracotta border; the IGA selection is a solid terracotta block, the same colour as the "advance" buttons. Fix: decide one rule and make IGA a deliberate, non-button-looking exception or bring it in line. Suggested command: /impeccable polish
- **[P2] Schedule lock is mouse-only.** `#sched_zone.lock` is `pointer-events:none; opacity:.45` but every control inside is still focusable and operable by keyboard, with no `inert`/`aria-disabled`; 45% opacity also breaks the contrast floor. Fix: set `inert` in `gateSched()` and tie the lock message with `aria-describedby`. Suggested command: /impeccable harden
- **[P2] First-visit IGA dead end and faint read-only scale.** With no program the Derajat box is plain text pointing to step 3 with no link, and it is wrong for diagnoses without an IGA program. After grading, unselected mirror grades sit at 55% opacity, about 2.3:1. Inside the modal, IGA comes after three Ya/Tidak questions. Fix: make the hint a button to step 3, reword when no IGA program applies, show unselected grades at full contrast, and move IGA to the top of section B or the modal. Suggested command: /impeccable layout
- **[P3] Text under 12px and inputs under 44px.** On-screen 11px: `span.req`, `span.lb`, `span.pn`, all `th`, `span.k`; 11.5px `span.rn`; 10.5px `span.sk`; `.mdlg-l` 11px. `input.ln` in modals is 38px. Detector and design review agree. Suggested command: /impeccable typeset

## Persona Red Flags

**Hurried doctor.** IGA at a first visit is now step 3 → open modal → pass section A → tap; the old one-tap place shows a non-clickable hint. Blank "Resep & prosedur" if Tahap is skipped. ICD-10 and "Buat lembar Informed Consent" are filled brown buttons competing with the terracotta advance button. The rail scrolls away on long steps.

**First-week nurse.** The done card ends with "Pasien berikutnya" → "Reset semua isian formulir?", and Cancel loses the signature state. The file note assumes she knows what a JSON file and the Downloads folder are. "Buka asesmen tersimpan" opens only the latest publish and does not say so; its confirm button says "Muat". Reopen ends in a long native alert whose key sentence is last.

**Keyboard / screen-reader user.** Locked schedule zone is focusable and unannounced. Mirror grades are five disabled buttons; a plain text value would read better. Thin heading structure in step 2. No skip link past toolbar, WAJIB bar and rail.

## Minor Observations

- Diagnosis and "Instruksi kontrol" placeholders are cut off at 1024.
- Program card says TERISI after only an IGA tap; "IGA 3 · tahap belum dipilih" would be truer.
- WAJIB denominator changes as you go (0/6 → 2/7 → 1/8).
- Step 6 summary repeats "isi di langkah 4 ›" twice.
- NeoSoft note says "kolom" where staff would say "isian".
- Kontrol rail step 3 is dimmed "dilewati" but still an enabled button.
- "Unduh JSON" on the done card duplicates the automatic download.
- `#alergi_box` reads as a card inside a card in step 1 (overlay finding).

## Questions to Consider

- If IGA is the number the program is judged by, why is it the fourth thing in the modal's first part?
- Does step 3 "Program" still deserve to be a step, when the cards already appear in step 2 in kontrol mode?
- The published record now exists in three places (hub, auto-downloaded file, NeoSoft paste). Which one does the nurse believe is "the record", and does the done card tell her?
