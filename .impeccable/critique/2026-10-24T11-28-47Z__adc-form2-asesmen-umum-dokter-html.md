---
target: Form 2 (ADC_Form2_Asesmen_Umum_Dokter.html)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
target_fingerprint: "sha256:88d5bb7324943f78904ac152c3fa0acf858244975469e995a176fdac0bf90f32"
target_path: "C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
timestamp: 2026-10-24T11-28-47Z
slug: adc-form2-asesmen-umum-dokter-html
---
Method: dual-agent (A: design review sub-agent · B: detector + browser sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | WAJIB chip strip is clipped at 1024 px (1391 px of content in 1009 px, no scroll cue); rail shows position, never completion |
| 2 | Match System / Real World | 4 | Visit order, Bahasa, bilingual IGA. "Webhook Make.com" and "Terbitkan Handoff" are system words shown to a nurse |
| 3 | User Control and Freedom | 2 | No draft persistence: a tab reload mid-consult loses the assessment; Reset is a same-weight pill two slots from Cetak |
| 4 | Consistency and Standards | 3 | Four button vocabularies (toolbar circles, pills, numbered sbtn, dark rectangular icdbtn); custom dialogs for login/consent but native confirm() for publish/reset |
| 5 | Error Prevention | 3 | Strong gates (hobar, consolidated confirm, skrining names the drug); pregnancy status only appears inside the confirm string |
| 6 | Recognition Rather Than Recall | 3 | Step 5 ends with "klik Terbitkan Handoff di atas"; kontrol rail reads 1, 2, 4, 5 |
| 7 | Flexibility and Efficiency | 3 | Rail jumps, ICD search, product picker; Acne modal is ~6 viewports with no in-modal navigation |
| 8 | Aesthetic and Minimalist Design | 2 | Print residue on screen (signature line, Cap klinik, footer + disclaimer under every step); webhook config field inside the nurse zone |
| 9 | Error Recovery | 2 | Publish errors are a confirm() wall of text, not anchored to fields; no inline invalid state on inputs |
| 10 | Help and Documentation | 3 | Deliberately in Panduan; placeholders double as micro-help but vanish on typing; title tooltips useless on touch |
| **Total** | | **28/40** | **Good (lower edge)** |

## Design Specificity Verdict

**LLM assessment:** Authored body, generic lid. The clinical content could only be ADC's: IGA 0–4 control with Bahasa labels and baseline mirror, the acne 4-factor table with Dr. Oku placeholders, stage cards, the Melinda referral callout, the SleekFlow/NeoSoft 1-2-3 nurse steps, the kontrol hobar hard stop. The shell is interchangeable admin software: a black bar with seven identical round pills, a chip strip, a step rail. The protocol lives in the body; the decisions (publish, reset) live in the generic lid.

**Deterministic scan:** 251 findings (240 warning, 11 advisory). 201 low-contrast, of which 182 are placeholder text in two colours (`#7E817D` 3.9:1 and `#847D70` 4.1:1 on white) counted once per input, so the real decision is two colours, not 201 issues. Some of those placeholders carry load-bearing clinical guidance (isotretinoin dose ranges, durations), so the muted colour is a real problem there. 17 undersized UI text (IGA caption labels 10.5 px ×15, "Jenis kunjungan" and "Wajib" 10 px), 16 tiny-text (11–11.5 px notes, footer, disclaimer; overlay notes at 10 px), 10 wide-tracking (labels at .08em), 2 side-tab, 2 all-caps-body, 1 tight-leading, 1 repeated "wajib", 1 em-dash advisory. Live scan of step D0 added: 9.5 px "klik untuk masuk" on the HUB chip, a footer paragraph at ~105 characters per line, and a card-inside-card (allergy band inside the step card).

False positives: `cream-palette` is the ADC brand canvas; `side-tab` left borders are the doctor/nurse role bands; "wajib" ×3 is a required badge, not repeated messaging; em-dash use is Bahasa clinical shorthand; the 4.46:1 green misses by 0.04.

**Visual overlays:** injection succeeded; the detector overlay is visible in the **[Human]** tab of the browser pane on step D0 (18 live findings labelled in yellow). Hidden steps and modals were not scanned live.

Where A and B agree: contrast and micro-type (A measured `.sec .n` 3.27:1, rail numbers 4.08:1 at 11 px, `.lockmsg` 3.18:1; B found the same families by rule). B caught the HUB chip sub-label at 9.5 px and the placeholder volume that A had only sampled; A caught everything structural (flow, roles, hierarchy) that no detector can see.

## Overall Impression

The clinical core is excellent and clearly built with doctors: D1 with the IGA control is the best screen in the product. The form falls down at the two moments that matter most legally and operationally: the end of the doctor's work (sign-off is a 14 px checkbox followed by a paper signature line and "scroll up to publish") and the hand-over to the nurse (who is asked for the doctor's PIN). The single biggest opportunity is to give the flow a real ending: sign-off as the climax of the doctor's steps, publish as the climax of the nurse's.

## What's Working

1. **IGA control** (`igacard_*`): 73×72 px targets, number + Bahasa + English title, baseline mirror, drives derajat and the kontrol "Arah" automatically. The protocol made tangible.
2. **Gate philosophy**: the kontrol hobar hard stop names the consequence and offers one deliberate override; one consolidated pre-publish confirm; `lbl_skrining` names the exact risky drug; consent dialog outlines the empty mandatory field in red.
3. **Context carry-over**: Ringkasan Form 1, the acne modal context strip "jangan ketik ulang", the progressive 4-factor table, ICD picker, consent generator prefilled from the assessment.

## Priority Issues

1. **[P0] The terminal action is outside the flow.** Step 5 ends with "Selesai — klik Terbitkan Handoff di atas"; Terbitkan is one of seven identical toolbar pills, two slots from Reset. *Why:* the single irreversible, legally meaningful act has no place in the authored sequence and no visual priority. *Fix:* put a primary "Terbitkan Handoff" button in the step-5 stepnav right slot (where Lanjut sits on other steps); tier the toolbar to one primary action per role with utilities in an overflow; move Reset behind the HUB menu. → `/impeccable layout`, then `/impeccable shape` for the toolbar.
2. **[P1] The doctor's PIN signature is requested in the nurse's hands.** `issueHandoff()` calls `hubTTD()` at publish time, when the tablet is already with the nurse doing D4b. *Fix:* request the PIN when `d8_signoff` is ticked, store `penerbitan.ttd` then and show "Ditandatangani · dr. X · 14:32" in the flag; publish reuses it and only falls back to the dialog when missing. → `/impeccable harden`.
3. **[P1] Required-status strip clipped at the shipping width.** At 1024 px the last chips (Ritme kontrol, Sign-off dokter, in kontrol also Remarks) are never visible and there is no scroll cue. *Fix:* show only unmet chips, or collapse to "WAJIB 3/7" with tap-to-expand; allow two rows below 1100 px. → `/impeccable layout` / `/impeccable distill`.
4. **[P1] Pregnancy risk is text-only and late.** Hamil/menyusui from Form 1 feeds only the publish confirm string. *Fix:* persistent flag in D0 and above the D3 Rx mirror using the allergy flag idiom; mark offending rows in the mirror; red border on the skrining row. → `/impeccable harden`.
5. **[P2] Step 5 is four jobs for two people.** D5 (optional) + D6 + D7 + nurse D4b + print signature block + webhook field. *Fix:* D5 to step 4; step 5 = D6 + D7 ending in sign-off; step 6 = D4b + Terbitkan; signature line, stamp, footer and disclaimer print-only; webhook into hub setup. → `/impeccable distill`, then `/impeccable layout`.
6. **[P2] Touch and legibility on a tablet.** Checkboxes 17×17 (`d8_signoff` 14×14); Lanjut/Kembali 38 px tall; mode buttons 25 px; placeholders at 3.9–4.1:1 including dose guidance; `.sec .n` 3.27:1; rail numbers and hints 11 px at 4.08:1; HUB sub-label 9.5 px. *Fix:* 22 px boxes, min-height 44 on nav/mode buttons, micro-type to 12 px at ≥4.5:1, one darker placeholder colour. → `/impeccable audit`, then `/impeccable typeset`.
7. **[P3] Native confirm()/alert() carry the most important messages** (publish checklist, reset, SleekFlow). *Fix:* reuse the existing dialog with a list whose items jump via the `reqStatus().go` targets. → `/impeccable clarify`.

## Persona Red Flags

**Jordan (first-time doctor):** nothing says "press Muat Form 1 first", so the empty D0 invites retyping; D2 program cards do not look like they open a form; acne modal sections are lettered A–G with F missing; four button styles compete; the end says "scroll up"; unclear whether the modal × discards.

**Sam (accessibility):** focus-visible exists and renders; IGA group has role and label. Fails: contrast list above; 17 px boxes; meaning in title tooltips unreachable by touch; modal dialog semantics on `#ovl_acne` not verified.

**Casey (tablet, interrupted):** no autosave, a sleep/reload after 20 minutes loses the assessment; sticky toolbar + ctlbar take ~150 px of 768; on return the rail shows where you are, not what is done; the phone fallback at 375 px breaks (toolbar 369 px tall, 819 px horizontal overflow).

**Nurse receiving the tablet at step 5:** lands wherever the doctor left the scroll; D4b sits below the doctor's zone; sees a webhook URL and "Diterbitkan oleh"; must scroll to the toolbar to publish; is asked for the doctor's PIN. This is the one place "device changes hands once" breaks.

## Minor Observations

- Kontrol rail numbers 1, 2, 4, 5 instead of showing step 3 as skipped.
- Fitzpatrick VI and Tipe kulit Sensitif orphan onto a second row at 1024.
- K1 Arah renders "Acne 0" when today's IGA equals baseline; reads as a score, not a direction.
- "Hasil tes dibahas di: kontrol ke-…" input is ~90 px wide.
- The dark ICD-10 button now outweighs the primary Lanjut; hierarchy inverted.
- HUB chip reads as a brand badge, not a status/login control.
- Toolbar hint is instruction text inside the form (Panduan rule).
- Clinical cautions live in placeholders and disappear once the doctor types.
- `d8_tgl` is not prefilled when sign-off is ticked.

## Questions to Consider

1. If the PIN is the legal signature, why does the form ask for it when the nurse is holding the tablet?
2. Why does a screen-only doctor tool show a paper signature line and a "Cap klinik" box?
3. Should Reset exist at all on a clinical tablet, or only inside the HUB menu behind a role?
4. Is the acne modal one form or three (history, 4-factor plan, Rx + education)? Three shorter sheets from the D2 card would respect "one thing at a time" without touching the data contract.
5. What happens to twenty minutes of assessment when the tablet locks and the browser reloads the tab?
