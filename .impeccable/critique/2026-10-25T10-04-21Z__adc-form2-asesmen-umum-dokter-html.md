---
target: Form 2 (ADC_Form2_Asesmen_Umum_Dokter.html)
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
target_fingerprint: "sha256:f44da923d661dc95a02c6835f495ea1fafe8351d990055ed164ced57dec3145e"
target_path: "C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
timestamp: 2026-10-25T10-04-21Z
slug: adc-form2-asesmen-umum-dokter-html
---
Method: dual-agent (A: design review sub-agent · B: detector + browser sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | WAJIB count, rail, sign-off status line are strong; after a cancelled PIN the box stays ticked with only an amber sentence, and step 6 gives the nurse no "dokter sudah tanda tangan" state |
| 2 | Match System / Real World | 4 | Clinical Bahasa throughout; section codes D0–D8/D4b leak the schema into headings |
| 3 | User Control and Freedom | 2 | No draft persistence; ICD-10 and consent dialogs ignore Escape, have no focus trap and can stack under the login/PIN dialog |
| 4 | Consistency and Standards | 3 | Three dialog idioms (program modal, login/PIN, picker/consent) with different close affordances; two terracotta primaries in the toolbar |
| 5 | Error Prevention | 3 | Pregnancy gate now visible in D0, D3 and D7 and the kontrol hard stop is textbook; the Acne modal, where isotretinoin is typed, still shows no pregnancy flag |
| 6 | Recognition Rather Than Recall | 3 | Terbitkan is in the flow and the rail shows the skipped step; the D4b lock message still sends the nurse to "D4" by code |
| 7 | Flexibility and Efficiency | 3 | Rail jumps, WAJIB chips jump to fields, Enter submits PIN, product and ICD pickers; Acne modal ~2900 px with no in-modal navigation |
| 8 | Aesthetic and Minimalist Design | 3 | Print residue gone from screen; step 4 still stacks D3+D4+D5 and the D5 heading carries two captions; instruction text remains inside the modal |
| 9 | Error Recovery | 2 | Publish checklist is still a native confirm() wall, not anchored to fields |
| 10 | Help and Documentation | 3 | Deliberately in the Panduan; no link to it from the toolbar or Lainnya menu |
| **Total** | | **29/40** | **Good** |

Scoring note: the independent reviewer's own table summed to 25, scoring Match 3 (D-codes), Consistency 2 (dialog idioms) and Help 2 (no Panduan link). Those conditions existed unchanged at the previous run, which scored them 4, 3 and 3, so for a like-for-like trend they are held at the baseline values; the genuine movement since the last run is Aesthetic 2→3 (print residue removed, the doctor's step now ends at sign-off). Everything else is unchanged.

## Design Specificity Verdict

**LLM assessment:** Authored in logic, still semi-generic in surface. The protocol is unmistakably ADC's: the 4-factor table with ADC treatment names, staged program cards, IGA 0–4 with the baseline caption, the new "Faktor risiko bekas → Kesimpulan" two-step with Dr. Oku's rule, the Melinda referral, SleekFlow scheduling. The shell (dark sticky toolbar with pill buttons, terracotta primary, warm canvas, small-caps labels) is a competent but anonymous warm-clinical look. The D0 anamnesis band and the IGA segment are where the design feels deliberately clinical.

**Deterministic scan:** 252 findings, unchanged from the first run (241 warning, 11 advisory). 201 low-contrast, of which about 170 are placeholder text in two colours (`#7E817D` 3.9:1, `#847D70` 4.1:1), inflated by the three hidden program overlays. The rest: 17 undersized UI text (IGA caption labels 10.5 px, "Jenis kunjungan" and "Wajib" 10 px), 17 tiny text at 11–11.5 px, 10 wide-tracking labels, 2 side-tab, 2 all-caps body (the 82-character consent checkbox label), 1 tight leading, 1 repeated "wajib", 1 em-dash advisory. Live per step at 1024 px: 15, 20, 11, 20, 12, 17 findings, eight of which are constant page chrome (HUB chip 9.5–10.5 px, "Jenis kunjungan", "Wajib" count, toolbar hint 4.3:1, rail numbers 3.9:1, accent section numerals 3.3:1, cream background).

False positives: placeholder contrast as example hints; the locked schedule zone at 1.9:1 (inactive by design); cream canvas is the brand; nested-cards on tables and notes inside a step; "wajib" badges; em-dashes as Bahasa shorthand; the 4.46:1 green status text misses by 0.04. Genuine: IGA caption labels at 10.5 px, chrome labels at 9.5–10 px, the all-caps consent label, white 11 px uppercase on `#C97A5E` at 3.3:1.

**Visual overlays:** injection succeeded; overlays were rendered on steps 1 and 6 and counted on every step through the detector API. The evidence tab is left open on step 6 with the overlay visible.

Where A and B agree: micro-type and contrast of chrome. B caught nothing structural; A caught the one new P0 (no pregnancy flag inside the modal) and the invisible modal hints, which the detector cannot see because the overlays are hidden at scan time.

## Overall Impression

The flow now has an ending: the doctor signs with a PIN while holding the tablet, hands over with a named button, and the nurse finishes on a dark Terbitkan at the bottom of her own step. The remaining gap is the Acne modal. It is the one screen where a teratogen is actually typed and the only screen that never mentions pregnancy, and its section hints are rendered in a colour almost identical to their background. Fix those two and the dialog consistency, and the form is a genuinely safe clinical tool; the rest is tablet legibility.

## What's Working

1. **D0 anamnesis band and flag system**: ALERGI, FOTO BASELINE, SEDANG HAMIL chips plus the pregnancy band give a 10-second brief; the SEDANG HAMIL chip sitting under allergy is a smart placement.
2. **Kontrol hard stop**: red badge, plain-language consequence, primary "Muat Handoff sekarang", explicit audit-flagged override, and the rail now shows "Program — dilewati" honestly.
3. **IGA segment and the risiko-bekas two-step**: 72 px buttons with number and word, baseline caption, and factor checkboxes that suggest Rendah/Sedang/Tinggi with the override explained in text. Protocol encoded as UI.

## Priority Issues

1. **[P0] Pregnancy flag absent at the point of prescribing.** `openProg()` writes name, RM, diagnosis and allergy into the modal context strip but not the pregnancy status; stage-2 oral rows (isotretinoin, spironolactone, pil KB) carry no caution. The gate fires one step later. *Fix:* add the HAMIL/MENYUSUI chip to the modal context strip, show a persistent band above every Rx table in the open modal when the flag is set, and mark matching rows live as the doctor types (reuse `tr.rx-risk`). → `/impeccable harden`.
2. **[P1] Modal section hints are invisible.** The hint colour in the program modals renders at about 1.0:1 against the section band, so every A–G hint ("wajib dijelaskan & dicentang", "menentukan resep default") is unreadable. *Fix:* hint colour to the muted ink token, same check in the Melasma and Hair modals. → `/impeccable colorize`.
3. **[P1] Dialog idioms are inconsistent and can stack.** ICD-10 and consent dialogs close only by button or backdrop, do not trap focus, and the login or PIN dialog opens on top of them. *Fix:* one opener for the picker/consent dialogs with Escape, focus trap and "close the previous dialog" (the pattern the login dialog already has); one close rule: Tutup for pickers, Batal for forms. → `/impeccable harden`.
4. **[P2] Hand-over has no review moment.** "Serahkan ke perawat" is a plain step change; step 6 gives the nurse no sign-off status and the lock message points to "D4". *Fix:* a compact review panel on hand-over (unmet WAJIB items, sign-off state, program, Rx count, rhythm) with "Kembali & lengkapi" or "Serahkan"; repeat it read-only at the top of step 6; make the lock message a link to the rhythm field. → `/impeccable clarify`, then `/impeccable layout`.
5. **[P2] Touch targets and labelling below the product's own bar.** Mode buttons 25 px, WAJIB chips ~28 px, modal checklist rows 29–30 px, nav buttons 38 px; 35 of 42 step inputs use a span instead of a label-for; no aria-current on the rail; secondary text at 3.5:1. → `/impeccable audit`, then `/impeccable typeset`.
6. **[P3] Phone width breaks the toolbar and the 4-factor table.** Not the shipping size, but plausible when the hub is down. → `/impeccable adapt`.

## Persona Red Flags

**Jordan (first-time doctor):** D-codes in headings mean nothing; modal hints invisible so no idea which modal sections are mandatory; no Panduan link anywhere; unsure whether the modal × saves.

**Sam (accessibility):** 35 unlabeled inputs, no aria-current on the rail, dialogs with aria-modal but no focus trap or Escape, 13 px native checkboxes with 29–30 px labels in the modal, secondary text at 3.5:1. Risk is conveyed by tint plus a text tag, which is right.

**Casey (tablet, interrupted):** no "where was I" beyond the WAJIB strip; stacked dialogs after an interruption; native confirm at publish cannot be revisited; no autosave; sticky chrome takes about 200 px of 768 on every step.

**Nurse at step 6:** may be greeted by a red lock blaming "D4"; no visible doctor sign-off status; "Disiapkan oleh" and "Diterbitkan oleh" are blank although the hub session knows her; the webhook URL field sits inside her clinical task; four numbered schedule buttons show no done state beyond two text lines.

## Minor Observations

- D5 heading carries two competing captions; keep one.
- Staff instruction text remains inside the modal ("jangan ketik ulang", "centang pemicu di kiri dulu" ×5) and the D3 Melinda callout.
- The consent and skrining checkbox labels are the longest lines on the page in uppercase italic 12 px.
- ICD picker title does not say multiple codes can be picked or that it fills the diagnosis when empty.
- Two terracotta primaries in the toolbar (Muat Form 1, Cetak/Simpan PDF); for a kontrol visit Muat Handoff is the primary.
- Section D-code gets more visual weight than the heading text.
- Consent dialog opens with an empty red-outlined "Tindakan" field when no procedure is ticked, with no hint that it is auto-filled from the 4-factor table.
- Rail highlight is a thin 2 px rule; completed steps are not distinguished from untouched ones.
- At 375 the page reports an inner width of 621, so a min-width is forcing horizontal layout.

## Questions to Consider

1. If the pregnancy flag deserves a band in D0, D3 and D7, why is the screen where the drug is typed the only one that does not show it?
2. Should the doctor's steps lock, read-only with an "Edit" that re-opens sign-off, the moment "Serahkan ke perawat" is pressed, so the nurse cannot alter the clinical record on the shared device?
3. Would "1 Pasien · 2 Pemeriksaan · 3 Program · 4 Resep & rencana · 5 Tanda tangan · 6 Jadwal & terbit" lose anything the handoff schema needs?
4. Could the 2900 px modal become a 3-step wizard (Penilaian → Tahap & Resep → Edukasi) with the same ids, so completion is visible and the pregnancy band sits on the Resep step?
5. Is a native confirm with six bullets the right surface for the most consequential click in the clinic, or should it be an in-page review sheet that can be scrolled, re-read and printed?
