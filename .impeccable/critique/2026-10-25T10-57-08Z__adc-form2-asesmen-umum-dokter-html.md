---
target: Form 2 (ADC_Form2_Asesmen_Umum_Dokter.html)
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
target_fingerprint: "sha256:0bd3b95fdf63a73e9a9518bbaa5c7f93d87f450f2e24c93248a64521b928134a"
target_path: "C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
timestamp: 2026-10-25T10-57-08Z
slug: adc-form2-asesmen-umum-dokter-html
---
Method: dual-agent (A: design review sub-agent · B: detector + browser sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | At scan time the WAJIB/mode strip (sticky top:0, z 9) slid under the equally sticky toolbar (z 10, 91 px) on every scroll, so the "always visible" strip was invisible exactly when needed. Fixed right after the scan: toolbar is now static. Sign-off status line and hub chip are good |
| 2 | Match System / Real World | 4 | Visit order, clinical Bahasa, IGA tiles. "Webhook Make.com" URL field and the "TER-RESERVE" chip sit in the nurse's clinical step |
| 3 | User Control and Freedom | 3 | Every dialog closes on Escape with a working focus trap and single-dialog rule; no draft persistence; cancelling the PIN leaves "Asesmen selesai" ticked with only a grey status line |
| 4 | Consistency and Standards | 3 | The new modal wizard added competing primaries: part navigation (terracotta) next to the footer's filled "Cetak program ini" and black "Tutup & simpan", and part 3 shows two close controls; primary colour semantics split between terracotta and ink |
| 5 | Error Prevention | 3 | Pregnancy chain is now end-to-end (modal chip, bands above every Rx table, live row tags, D3 band, D7 skrining); schedule lock links to the field. Weak spot: the hand-over review keeps "Serahkan" as the filled primary even with six unmet items |
| 6 | Recognition Rather Than Recall | 3 | ICD picker pre-filtered, stage tiles summarised, 4-factor empty state cue; long Oku placeholders truncate at this width exactly where the dose is; WAJIB chips name the field but not the step |
| 7 | Flexibility and Efficiency | 3 | Rail jumps, "+N lagi" toggle, review jump buttons, stage defaults; "Kontrol tiap" has no default while "Durasi" silently defaults to 3 |
| 8 | Aesthetic and Minimalist Design | 3 | Print residue gone, D5 caption single, Melinda note moved; instruction prose remains in the kontrol hard-stop text, the D0 baseline-photo message, the D5 disclaimer and the consent preamble |
| 9 | Error Recovery | 3 | Review dialog turns unmet items into jump buttons; publish checklist is still a native confirm() wall |
| 10 | Help and Documentation | 3 | Deliberately in the Panduan; no link to it from the toolbar or Lainnya menu |
| **Total** | | **30/40** | **Good** |

Scoring note: the independent reviewer's own table summed to 26, scoring Match 3, Aesthetic 2 and Help 2 for conditions that were unchanged since run 1 (where they scored 4, 3 and 3); those are held at baseline so the trend stays like-for-like. Visibility drops 3 → 2 because the reviewer measured a real defect the earlier runs missed; with the fix now shipped, the live state scores 31. Consistency stays 3 despite the modal footer duplication because the rest of the form became more consistent (one dialog idiom, one toolbar primary).

## Design Specificity Verdict

**LLM assessment:** Protocol-specific, visually a calm well-made tool, which is the right register for Operate mode. Unmistakably ADC: D-numbered sections, the 4-factor Oku table, IGA tiles with the baseline anchor, Oku placeholders, "Serahkan ke perawat", the pregnancy bands. One typeface throughout (both font roles resolve to Archivo), so hierarchy is carried by size, tracking and caps. It does not need to be more expressive; it needs to stay legible under pressure.

**Deterministic scan:** 36 findings (down from 252 at run 1 and run 2). 14 tiny-text at 11–11.5 px (uppercase labels, badges, stage descriptions, "opsional" markers), 10 wide-tracking on uppercase labels and headers, 7 low-contrast, 2 side-tab, 1 tight leading, 1 repeated "wajib", 1 em-dash advisory. Of the 7 low-contrast: the locked schedule zone at 45 % opacity (intentional), the modal hints at 80–85 % opacity (a cascade miss on my side, fixed right after the scan), two green status texts 0.04 short, and two `:hover` pairs the detector could not locate in source. Placeholders are no longer flagged. Live per step at 1024 px: 3, 5, 2, 6, 2, 8 findings, two of them constant chrome (the 9.5 px HUB sub-label, also fixed after the scan, and the cream brand canvas).

False positives: cream canvas is the brand; nested-cards on tables, notes, the allergy box and the IGA card; the locked zone; "wajib" badges; em-dashes; wide-tracking on uppercase labels; the overlay's own badge text flagged as occlusion.

**Visual overlays:** injection succeeded; overlays were rendered on step 1 and all six steps plus the three Acne modal parts were counted through the detector API. The evidence tab is left open in the browser pane.

Where A and B agree: tiny uppercase labels and the modal hint contrast. B saw nothing structural. A found the sticky-bar collision, the review-dialog hierarchy and the ticked-but-unsigned state, none of which a detector can see.

## Overall Impression

The clinic flow is now coherent: brief, examine, program in three parts, prescribe with the pregnancy flag at the fingertips, sign with a PIN, review, hand over, publish. The two things that still undercut it are both about the strongest affordance pointing the wrong way: "Serahkan" is filled even when six items are missing, and a cancelled PIN leaves a ticked sign-off box. Fix those and the modal footer duplication and the form reads as finished.

## What's Working

1. **The pregnancy safety chain** from modal chip to Rx band to row tag to D3 band to D7 skrining, each naming the drug.
2. **The IGA panel**: large numeral tiles with plain labels, one tap, mirrored read-only in the modal.
3. **The hand-over design**: the review dialog turns unmet requirements into jump buttons and step 6 is visibly the nurse's; "device changes hands once" is legible in the UI.

## Priority Issues

1. **[P0] Sticky WAJIB strip hidden under the sticky toolbar on scroll** — measured at scan time; the toolbar is now static so the strip is the only sticky element. Shipped after the scan (`07dff80`). → done.
2. **[P1] Review dialog rewards the unsafe path.** "Serahkan ›" stays the filled primary when the headline says six items are missing. *Fix:* with unmet items, fill "Kembali & lengkapi" and outline "Serahkan dengan N kekurangan"; with none, keep "Serahkan" primary. → `/impeccable harden`.
3. **[P1] Cancelled PIN leaves "Asesmen selesai" ticked** with a grey status line that reads as signed at a glance. *Fix:* uncheck on cancel, or render the ticked-but-unsigned state as an amber chip "Ditandai selesai · tanpa PIN". → `/impeccable clarify`.
4. **[P2] Competing primaries and duplicate close in the program modal.** Part navigation plus a filled "Cetak program ini" plus "Tutup & simpan", and two close controls on part 3. *Fix:* one primary per part, print demoted to ghost, second close removed; define terracotta = advance, ink = irreversible and apply it everywhere. → `/impeccable distill`.
5. **[P2] Instruction prose and clipped hints.** Kontrol hard-stop paragraph, D0 baseline message, D5 disclaimer, consent preamble; Oku placeholders truncate at the dose; "Berikutnya" clips in the D5 stage column. *Fix:* each paragraph to a short status plus a Panduan reference; long placeholders to a note line under the table; widen the D5 first column. → `/impeccable typeset`, then `/impeccable quieter`.
6. **[P3] Nurse step mixes plumbing with the task.** Webhook URL, NeoSoft honour checkbox, three numbered buttons. *Fix:* move the webhook into the hub setup dialog; one-line "what now" at the top of step 6. → `/impeccable distill`.

## Persona Red Flags

**Jordan (first-time doctor):** no route to the Panduan; D-numbers have no legend and disagree with step numbers (D3/D4/D5 all in "Langkah 4"); "Derajat" appears before a program is chosen with no hint it is IGA-driven; the only per-part completion cue lives inside the modal.

**Sam (accessibility):** uppercase 11–12 px tracked micro-labels throughout; the Rendah/Sedang/Tinggi segment shows no radio indicator until picked; the modal scrim is light enough that page text stays readable behind it; focus did not return to the consent button when the dialog was opened by script.

**Casey (interrupted tablet user):** at scan time only the dark toolbar was visible after scrolling (now fixed); a ticked-but-unsigned D7 box is misread as done; "BELUM DIISI" on the program cards is the only durable cue that a modal was not finished.

**Nurse at step 6:** a summary that mirrors the doctor's review, a locked block, a raw webhook URL input, a "TER-RESERVE" chip and three numbered buttons; she needs one line saying what to do now.

## Minor Observations

- Both font roles resolve to Archivo; either realise the second role or drop it from PRODUCT.md.
- D0 "Tanggal" renders in user-ink blue although auto-filled; NIK placeholder reads as an instruction.
- The pink D0 pregnancy band is calmer than the red modal warning; the first sighting is the softer one.
- In section B the factor chips and the Rendah/Sedang/Tinggi segment look alike; the helper text is the only cue that row two is a conclusion.
- The TTD dialog repeats the login dialog's fields; only the title differs.
- At phone width the rail consumes a screen before content; collapse it to "Langkah 1/6" if phones are expected.
- Modal footer buttons are 11 px uppercase on 44 px targets; size fine, legibility borderline.

## Questions to Consider

1. Should "Asesmen selesai — siap diterbitkan" exist as a checkbox at all, or should the PIN signature be the sign-off, one control with one state?
2. What is the real-world case that justifies "Serahkan" on a record with six missing items? If there is none, why is it one tap?
3. Should the nurse's integration plumbing (webhook, NeoSoft honour box) live in the hub setup dialog so step 6 is purely jadwal → terbitkan?
4. Three program modals, each a three-part wizard inside a six-step wizard: is the modal still the right container, or should the chosen program become steps 3a–3c in the main rail so the WAJIB strip applies to it too?
5. Does the form need the WAJIB strip at all if the rail carried per-step unmet counts?
