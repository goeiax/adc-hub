---
target: Form 2 Asesmen Umum Dokter
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
target_fingerprint: "sha256:50e9820a7b4ac1d6bbab84966b16795e00aebc23aafaf7b7d362470e1ea8da28"
target_path: "C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
timestamp: 2026-11-12T08-11-39Z
slug: adc-form2-asesmen-umum-dokter-html
---
Method: dual-agent (A: design review sub-agent · B: detector + browser sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Kontrol rail's skipped step is a live button that silently goes elsewhere |
| 2 | Match System / Real World | 3 | Acne stage names reuse grade words ("Ringan", "Menengah–Berat") beside IGA; English leftovers |
| 3 | User Control and Freedom | 3 | Reset is confirmable, but the guard could be bypassed on a nameless form (fixed after this run) |
| 4 | Consistency and Standards | 3 | Four edge treatments for "selected" in one modal; destructive confirm wears advance terracotta |
| 5 | Error Prevention | 3 | Reset guard looked at only four fields |
| 6 | Recognition Rather Than Recall | 3 | Nurse summary prints "Acne · Menengah–Berat" without "Tahap 2" |
| 7 | Flexibility and Efficiency | 2 | Focus dropped on every Lanjut; one "Pakai" per Rx row; no accelerators |
| 8 | Aesthetic and Minimalist Design | 3 | Hair part 1 is 2144 px with 53 controls |
| 9 | Error Recovery | 3 | Locked-zone content at 1.9:1 cannot be previewed |
| 10 | Help and Documentation | 3 | No contextual help where IGA maps to Tahap |
| **Total** | | **29/40** | **Good; remaining friction is vocabulary and keyboard flow** |

## Design Specificity Verdict

**LLM assessment.** Clearly ADC's own instrument: 4-factor gating, Tahap-driven Rx, IGA baseline mirror, the nurse's "Sekarang" line. Specificity weakens where stage names collide with grade words and where "selected" still has four edge dialects in one modal. The imported Hair modal reads like a different product.

**Deterministic scan.** 17 CLI findings (was 18; the low-contrast false positive is gone). Remaining: side-tab ×2 (intentional), tiny-text ×4 (static 11px declarations; rendered scan finds 0 visible text under 12px on all six steps and every program part), wide-tracking 0.08em ×5 (intentional), 0.05em ×4 (real minor, `#ovl_hair` hints), repeated "wajib" (false positive), em-dash advisory. Overlay: nested-cards on `#alergi_box`, cream palette (intentional). Measured: no horizontal overflow; all modal text inputs ≥44px; Diagnosis top 478 and IGA card bottom 606 inside the 768 fold; rail buttons 68px; `#sched_zone` inert and refuses focus; Reset dialog keeps `_ttd`; selected IGA contrast 5.78:1 (numeral) and 15.21:1 (label).

**Visual overlays.** Ran in a temporary tab, closed afterwards.

## Overall Impression

All six fixes from run 10 hold. The form now meets its own size and contrast floors on screen. What remains is mostly language (stage versus grade words), keyboard flow between steps, and the flat ending after publish.

## What's Working

- Hand-over and publish review dialogs turn unmet requirements into navigation and say truthfully what will be saved.
- The floors are met: zero sub-44 targets and zero sub-12px text across six steps and three modals.
- Protocol-shaped disclosure: 4-factor gating, stage-driven Rx with "Pakai", the new empty state.

## Priority Issues

- **[P1] Reset bypassed its own confirmation on a nameless form.** `resetForm()` treated the form as empty unless name, RM, diagnosis or catatan was filled. Fixed immediately after this run: the guard now reads every control, stage and signature. Suggested command: /impeccable harden
- **[P1] Acne stage names reuse grade words.** "Tahap 1 Ringan / Tahap 2 Menengah–Berat" beside "IGA 2 Ringan / 3 Sedang / 4 Berat"; the nurse summary shows "Acne · Menengah–Berat" next to "IGA Acne 3". Needs the doctors' wording. Suggested command: /impeccable clarify
- **[P2] Focus is dropped on every step change.** After "Lanjut ›" focus falls to body; `goStep()` never moves focus or announces. Suggested command: /impeccable harden
- **[P2] Locked and skipped states are visual only.** `#sched_zone.lock` at opacity .45 (1.9–2.9:1), `#sched_lock` has no role; kontrol `#rb2` is dimmed but live and unlabelled. Suggested command: /impeccable harden
- **[P3] "Selected" still has four edge dialects in one modal.** Fill is unified; border colour, weight and radius differ across `.ck`, `.rbopt.on`, IGA `.on`, `.sev-card.active`. Suggested command: /impeccable polish

## Persona Red Flags

**Hurried doctor.** Can walk past an empty Rx part on a primary button; maps IGA to Tahap unaided; one "Pakai" per Rx line.

**First-week nurse.** Lands on a greyed step 6; sees "Acne · Menengah–Berat" beside "IGA 3"; "Terbitkan Handoff" is below the fold; the done card has four near-equal buttons including "Unduh JSON".

**Keyboard / screen-reader user.** Focus falls to body after every Lanjut; lock reason not announced; mirror exposes five dead buttons; "dilewati" exists only as CSS content; focus ring about 2.9:1.

## Minor Observations

- Kontrol `.handoff .hh .s` is 11px uppercase.
- Acne part 5 letters jump from E to G.
- Mixed language: "Greatly increased", "Ter-reserve", "REMARKS", "belum di-generate".
- "BAGIAN n DARI 5" repeats on every tab.
- "Unduh JSON" is developer vocabulary on a clinician's success card.
- `pmGo()` with a string part number blanks the modal (fixed after this run).

## Questions to Consider

- Why does the form not propose the Tahap from IGA plus the 4-factor ticks and ask the doctor to confirm, as "Risiko bekas" already does?
- Should step 6 after publish become a single receipt screen with one primary action?
- Does the nurse need the doctor's six-step rail at all, or a three-item checklist of her own?
