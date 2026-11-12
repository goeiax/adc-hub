---
target_identity: "file:C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
target_fingerprint: "sha256:98a102c1c8ffa956b0a5dab4ccb5a95523d454147042328385e113858831eec9"
target_path: "C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
timestamp: 2026-11-12T08-43-22Z
slug: adc-form2-asesmen-umum-dokter-html
---
<!-- IMPECCABLE_CRITIQUE_META {"target":"Form 2 Asesmen Umum Dokter","total_score":27,"max_score":40,"p0_count":0,"p1_count":2,"na_heuristics":[]} -->
Method: dual-agent (A: design review sub-agent · B: detector + browser sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | An untouched form claims unpublished data when reset |
| 2 | Match System / Real World | 2 | Melasma program button shows the internal key ("TAHAP A" for the card labelled "Tahap B · Aktif") |
| 3 | User Control and Freedom | 3 | Reset blanks default values (Durasi 3 bln, D5 row labels) instead of restoring them |
| 4 | Consistency and Standards | 2 | Selected state differs between Acne/Melasma modals, Hair modal and main-form pills; stage naming differs per surface |
| 5 | Error Prevention | 3 | False-positive reset guard will train click-through |
| 6 | Recognition Rather Than Recall | 3 | Acne "Tahap 2" card no longer says who it is for |
| 7 | Flexibility and Efficiency | 3 | Kontrol chrome takes ~330 of 768 px before content |
| 8 | Aesthetic and Minimalist Design | 3 | Uppercase letter-spaced labels everywhere flatten hierarchy |
| 9 | Error Recovery | 3 | Reset warning wrong on an untouched form |
| 10 | Help and Documentation | 2 | Panduan only inside Lainnya, no contextual help |
| **Total** | | **27/40** | |

## Anti-Patterns Verdict

Clearly ADC's own tool, not a generic EMR skin. Detector: 17 findings, identical to run 11 (2 side-tab, 4 tiny-text, 9 wide-tracking, 1 repeated-container-text, 1 em-dash advisory); browser overlay adds nested-cards on `#alergi_box` and the known cream-palette. Measured: 0 visible text under 12 px on steps 0–5 and all program parts, 0 controls under 44 px, no horizontal overflow at 1024×768.

## Verification of the five run-11 fixes

1. Reset guard — partly. Nameless form with only a stage/IGA opens the dialog. Regression: a freshly loaded form also opens it, because `#d5_months` (3) and the three D5 default cells count as filled; after one reset those defaults are blank.
2. Acne numbers only — holds. Side effect: the Tahap 2 card reads only "+ Excel V, Plazion, obat minum." and its title sits 8 px lower.
3. goStep focus — holds. Focused heading text differs from the rail label on steps 4–6.
4. Lock zone and kontrol rail — holds. Schedule table headers are dimmed with the controls; `#rb2` keeps a pointer cursor.
5. One selected language — partly. Consistent in Acne/Melasma except the IGA button stays white and the checkbox keeps a neutral border colour; Hair labels and main-form pills not covered.

## Priority Issues

- **[P1] Melasma program button shows the internal stage key.** `#pb_melasma` reads "TERISI · TAHAP A" after choosing "Tahap B · Aktif" (line ~2704, record text ~3170). Fix: route through `_psNamaTahap`.
- **[P1] Reset guard false positive, and reset erases defaults.** Compare with `defaultValue`/`defaultChecked`; restore defaults in `_resetJalan`.
- **[P2] Acne "Tahap 2" card lost its meaning.** Needs a non-grade descriptor (owner wording) and top-aligned card content.
- **[P2] Selected state is not one language across the form.** Extend `--sel-*` to main-form pills and Hair labels; IGA button fill.
- **[P2] Step heading announced on focus does not name the step.** `aria-label` "Langkah N dari 6 — <rail label>".

## Persona Red Flags

- Hurried doctor: "TAHAP A" after choosing Tahap B; reset scare on an empty form; read-only Melasma mirror still says "Pilih skor IGA hari ini".
- First-week nurse: dimmed Terbitkan looks disabled but is not; Durasi blank after a reset.
- Keyboard / screen reader: headings do not match rail labels; no h1; `#rdlg` has no role.

## Minor Observations

- "Reset form…" vs "Kosongkan form?".
- D5 table first column headed "TAHAP".
- `#rdlg` buttons right-aligned in a row, `#sdlg` stacked left.
- Melasma stage heads named, Acne numbered.

## Questions to Consider

- If Acne stages are numbers only, why does Melasma carry a letter, a name and a hidden key?
- Should "Terbitkan Handoff" be truly disabled before sign-off, with the reason beside it?
- Is "Tahap" a single decision that belongs at the end of "4 faktor"?
