---
target: Form 2 (ADC_Form2_Asesmen_Umum_Dokter.html)
total_score: 31
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
target_fingerprint: "sha256:67e68a1262ac1d5239fc39fc5b720f743589e768ebf05db4ae656b6c99bb0049"
target_path: "C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
timestamp: 2026-10-28T02-11-29Z
slug: adc-form2-asesmen-umum-dokter-html
---
Method: dual-agent (A: design review sub-agent · B: detector + browser sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | WAJIB strip now stays pinned on long steps (verified). While the PIN dialog is open the strip briefly reads "7/7 — lengkap" before any PIN is verified, because the count reads the checkbox, not the signature |
| 2 | Match System / Real World | 4 | Clinical Bahasa and visit order. Dates in the review dialog print ISO; "Sedang (Moderate)" in D1 next to "Menengah–Berat" on the stage card |
| 3 | User Control and Freedom | 3 | Escape closes every dialog and the trap works. Focus is dropped after Escape on the PIN and ICD-10 dialogs (BODY, or the hidden search box). No draft persistence |
| 4 | Consistency and Standards | 3 | One colour rule now holds (terracotta advances, ink publishes). Ya/Tidak order flips within one modal row block; the dense Oku placeholders in the Rx tables read as prescriptions, distinguished from real entries only by blue ink |
| 5 | Error Prevention | 3 | Pregnancy chain end-to-end; hand-over hierarchy now favours completion. New finding: loading a different Form 1 over typed identity fields leaves two patients on one screen, since the loader only fills empty fields |
| 6 | Recognition Rather Than Recall | 3 | Jump buttons, pre-filtered ICD list. Step 0 never says "load Form 1 first"; doctor name fields stay blank although the hub session knows the doctor |
| 7 | Flexibility and Efficiency | 3 | Rail, "+N lagi", review jump buttons. Modal part rail is not sticky, so returning from the Rx tables to part 1 is a long scroll |
| 8 | Aesthetic and Minimalist Design | 3 | Modal footer and D5 cleaned. Instruction prose remains in the modal captions and D5 note; the nurse step still shows the webhook field |
| 9 | Error Recovery | 3 | Amber "Belum ditandatangani" chip reads clearly; lock message links to the field; publish checklist still a native confirm() |
| 10 | Help and Documentation | 3 | Deliberately in the Panduan; no link from the UI |
| **Total** | | **31/40** | **Good** |

Scoring note: the reviewer's own table summed to 25, with 2s on Control, Consistency, Recognition, Aesthetic and Help. Those lower marks rest on conditions that were unchanged since run 1 (placeholder style, blank doctor fields, instruction prose, no Panduan link) and were scored 3–4 there, so they are held at baseline for a like-for-like trend. The movement since run 3 is Visibility 2 → 3: the sticky-bar collision is fixed and verified by this reviewer. The new identity-drift and focus-restore findings are real and go into the backlog.

## Design Specificity Verdict

**LLM assessment:** Specific in protocol, tidy-template in surface. Unmistakably ADC: the 4-factor table with progressive disclosure, staged program cards, IGA tiles anchored in D1 and mirrored in the modal, pregnancy banners threaded D0 → modal → D3 → D7. Visually a coherent warm-neutral document system on a single typeface, hierarchy carried by weight and tracking. Right register for Operate mode.

**Deterministic scan:** 34 findings (36 at run 3, 252 at runs 1–2). 14 tiny-text at 11–11.5 px (footer, signature captions, stage descriptions, "opsional" markers), 10 wide-tracking in modal labels that lost their uppercase, 5 low-contrast, 2 side-tab, 1 tight leading, 1 repeated "wajib", 1 em-dash advisory. The five low-contrast items: the locked schedule zone at 45 % opacity (intentional), two green modal subheads at 4.46:1 (0.04 short; switch to the darker green token), and two hover pairs the detector simulates with the wrong background (not reproducible live). Placeholders and the modal hints no longer appear. Live per step at 1024 px: 2, 4, 1, 5, 1, 7 findings, one of them the cream brand canvas on every scan; Acne modal parts 1, 5, 1.

False positives: brand canvas; nested-cards on tables, notes, the allergy band, the IGA card and the lock notice; the detector's own overlay badge flagged as occlusion; the locked zone; required badges; em-dashes as separators; tracking on short modal labels.

**Visual overlays:** injection succeeded; overlays rendered on steps 1 and 6 and modal part 3; all steps and parts counted through the detector API. The evidence tab is left open in the browser pane.

Where A and B agree: the 11 px stage descriptions and "opsional" markers, and the locked zone legibility. B saw nothing structural. A found identity drift, the focus-restore gap and the momentary false "lengkap".

## Overall Impression

The flow holds together now: pinned status, one colour rule, the pregnancy chain, a hand-over that favours completion, a sign-off that cannot be left half-done. What remains is mostly about truth on screen: the Rx tables look prescribed when they are not, a second Form 1 can be loaded over a typed identity without a warning, and the status strip trusts a checkbox instead of the signature. Fix those three and the record is as honest as the flow.

## What's Working

1. **The pregnancy chain**, D0 band to modal chip to Rx bands to row tags to D3 band to D7 skrining, each naming the drug.
2. **WAJIB strip and review dialog**: unmet-only chips, count, jump buttons, a hand-over dialog that restates program, stage, Rx and rhythm, and stays visible on long steps.
3. **A calm, consistent control language**: terracotta advances, ink publishes, everything else outlined; 44 px targets confirmed on rail, chips, nav, options and IGA tiles.

## Priority Issues

1. **[P0] Identity drift when a Form 1 is loaded over typed fields.** The loader fills only empty identity fields, so a typed name and RM survive while the summary, modal context and flags switch to the loaded patient. *Fix:* when identity fields are non-empty and differ from the intake, ask "Data pasien berbeda — ganti ke [nama, RM]?" and on yes overwrite all identity fields; never render two identities. → `/impeccable harden`.
2. **[P1] Placeholder prescriptions look prescribed.** Dense Oku dosing placeholders in the Rx tables read as entries; the review dialog says "Resep: belum ada" while the modal looks full. *Fix:* shorten placeholders to a category hint and show the protocol default as a "Saran protokol" ghost line with a "Pakai" button that turns it into a value. → `/impeccable clarify`.
3. **[P1] Focus and status integrity around dialogs.** Escape on the PIN dialog leaves focus on BODY and on the ICD picker on the hidden search box; the WAJIB count reads the sign-off checkbox rather than the signature; the sign-off checkbox hit area is 21 px tall. *Fix:* restore focus to the opener in the login/PIN dialog too, compute the sign-off requirement from the signature when the hub is up, give the sign-off row a 44 px label. → `/impeccable harden`.
4. **[P2] The nurse step has no single next action.** Four pipeline buttons, a webhook URL field, an empty table and a live-looking Terbitkan under "Belum sign-off"; "Diterbitkan oleh" is prefilled with the doctor's session name. *Fix:* webhook into hub setup; pipeline as one stepper; Terbitkan visually disabled until sign-off exists (warn path kept); prefill the nurse field from a nurse session only. → `/impeccable distill`.
5. **[P2] Acne modal part 2 is a 2200 px wall with a non-sticky rail.** *Fix:* make the part rail sticky under the modal header; split part 2 into "Faktor & tahap" and "Resep"; give the Rendah/Sedang/Tinggi segment the same chip style as other options. → `/impeccable layout`.
6. **[P3] Residual prose and vocabulary drift.** "no overclaiming" note, modal captions, D5 note; "Sedang (Moderate)" vs "Menengah–Berat"; ISO dates in the review dialog; "Berikutnya" truncated in D5. → `/impeccable typeset`, then `/impeccable quieter`.

## Persona Red Flags

**Jordan (first-time doctor):** step 0 does not say to load Form 1; D2 cards show "BELUM DIISI" with no button affordance; oral Rx placeholders read as prescriptions; two severity vocabularies.

**Sam (accessibility):** focus lost after Escape on PIN and ICD dialogs; 14 px sign-off checkbox; placeholder versus value is colour-only; focus-visible styles exist.

**Casey (interrupted tablet user):** identity drift is the risk; the strip and review dialog otherwise re-orient well; modal part 2 loses the rail mid-scroll.

**Nurse at step 6:** pipeline of four buttons plus a webhook field; Terbitkan looks live while the record is unsigned; "Diterbitkan oleh" shows the doctor's name.

## Minor Observations

- Login and PIN dialog tab order puts the "Atur alamat / kunci hub" link between PIN and the primary button.
- The review dialog with six unmet items ends about 20 px above the viewport bottom at 768 px; a seventh would push the buttons off-screen.
- The modal backdrop lets the page's "Serahkan ke perawat" button show through at scroll end.
- The consent dialog's "Tindakan" field is empty for a stage-2 acne patient even when procedure checkboxes exist in the stage block.
- Both font roles resolve to Archivo.
- At 375 px the rail fills the first screen; not shipping size.

## Questions to Consider

1. If the hub already knows the doctor, why does the form ask for the name twice and let the nurse publish under it?
2. Should "Serahkan dengan 1 kekurangan" exist when the one shortfall is the doctor's own signature?
3. Is the acne oral-drug table a prescription pad or a protocol reference? It is styled as the first and behaves as the second.
4. What would step 6 look like if it showed only "Jadwal → Kirim → Terbitkan"?
5. What guarantees the handoff that reaches NeoSoft carries one patient?
