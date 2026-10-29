---
target: Form 2 (ADC_Form2_Asesmen_Umum_Dokter.html)
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
target_fingerprint: "sha256:33a2a2f036bbcf8f0b0fa25f4a0da426332585b9d78bad210e8fffca4dcd16d6"
target_path: "C:\\Alex Workspace\\Cowork Playground\\Marketing\\ADC_Form2_Asesmen_Umum_Dokter.html"
timestamp: 2026-10-29T04-03-59Z
slug: adc-form2-asesmen-umum-dokter-html
---
Method: dual-agent (A: design review agent · B: detector + browser agent). Target `www/ADC_Form2_Asesmen_Umum_Dokter.html`, live on the hub (port 3777), inspected at 1024×768 and 375. Toolbar wrap at 1024 and Diagnosis/IGA fold position re-measured by the parent session.

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | WAJIB count, rail aria-current, sign-off chip, hub ✓/✗ strong. IGA buttons lack aria-pressed; dimmed Terbitkan explains itself only via hover title. |
| 2 | Match System / Real World | 3 | Flow mirrors the visit. Modal context strip prints ISO date (openProg uses raw tgl); D0/K1/D4b codes have no legend. |
| 3 | User Control and Freedom | 2 | Publish runs through two native confirm(), a pop-up and an alert(). ICD picker closes after each pick. |
| 4 | Consistency and Standards | 2 | Yes/No checkbox pairs with flipping order (1× "Tidak · Ya", 4× "Ya · Tidak" in acne modal), both tickable. Control heights 20–46 px. |
| 5 | Error Prevention | 3 | Kontrol hard stop, identity guard, pregnancy bands, skrining row, PIN-cancel unticks. Gaps: dimmed Terbitkan still clickable; stage change never warns when Rx filled. |
| 6 | Recognition Rather Than Recall | 3 | Saran protokol, pickers, context strip. Program cards only "BELUM DIISI"; ICD opens with 50 codes before a program exists. |
| 7 | Flexibility and Efficiency | 3 | One-tap Pakai, Enter, chip jumps. Stage-2 = 7 Pakai taps; Diagnosis/IGA at y≈1066–1111 on a 768 tablet. |
| 8 | Aesthetic and Minimalist Design | 3 | At 1024 toolbar pills wrap to three lines (77×64, 91×64, 98×64), toolbar 92 px + ctlbar 95 px. |
| 9 | Error Recovery | 2 | Cancelled login → "Form 1 untuk RM … tidak ada di hub (belum masuk…)" reads as record missing; publish failure is an alert wall. |
| 10 | Help and Documentation | 2 | No Panduan link; tooltips are title attributes. |
| **Total** | | **26/40** | **Acceptable** |

Reviewer stricter than run 4; two real defects found that earlier runs never measured (toolbar wrap at 1024, sub-44 commit controls).

## Design Specificity Verdict

LLM: specific in substance (Oku 4 factors → named ADC treatments, Tahap 1–4 protocol text, Saran protokol, risiko-bekas rule, NeoSoft/SleekFlow), interchangeable in chrome (dark toolbar, 6-step rail, WAJIB chips; ADC only via palette).

Detector: 31 findings (exit 2, line 0 = rendered CSS). tiny-text ×14 (11–11.5 px body copy: .note, .callout, .sev-desc, .pmhead .sub, .hubchip span, footer/disclaimer; uppercase eyebrows exempt), wide-tracking ×9 (7 uppercase labels/th; 2 real: #ovl_hair .sech em, .hubchip span at .05em), low-contrast ×3 (1 intentional .lock opacity .45; 2 probable FP on .btn.tan hover), side-tab ×2 (.band/.zone 4-px left border + 14-px radius, minor real), tight-leading ×1 (intentional .lab lock), repeated-container-text ×1 (wajib marker, FP), em-dash advisory ×1.

Overlays: in-page detector 2 findings — nested-cards on #alergi_box (intentional), cream palette on body (brand ground). [Human] tab left open; live server stopped; www unchanged.

Agreement: functional text <12 px on HUB chip and allergy "Nihil". Detector-only: side-tab radius, tracking leaks. Reviewer-only: toolbar wrap, sub-44 controls, native dialogs at publish.

## Overall Impression

Authored inside the cards (hand-over dialog, protocol rows are the two best moments); first screen (broken toolbar) and last screen (four native boxes) let it down. Biggest opportunity: give publish the hand-over treatment.

## What's Working

- Saran protokol rows: protocol as a default, editable, self-hiding.
- Hand-over dialog #sdlg: count, jump buttons, safe path filled; nurse step repaints the same facts.
- Safety flags where the decision is made (pregnancy bands, rx-risk rows, skrining row).

## Priority Issues

1. [P0] Publish moment on browser-native dialogs (issueHandoff: confirm ×2, window.open, alert; result in readonly input). Fix: #sdlg-style "Terbitkan handoff?" dialog with warnings as jump buttons, TTD state, summary, filled "Kembali & lengkapi" vs outlined "Terbitkan dengan N peringatan"; done-state card after success (RM, time, hub ✓, Cetak lembar pasien, Pasien berikutnya, JSON link). Command: harden.
2. [P1] Toolbar collapses at 1024 (#tb_muat1 77×64 three lines, #tb_muatho 91×64, Cetak 98×64, hint wraps, toolbar 92 px). Fix: one mode-aware loader, others into Lainnya, nowrap, drop the hint. Command: layout.
3. [P1] Sub-44 targets on commit/gate controls (.rs-pakai 32, .rxpick-btn 36, .rxadd 32, .rxdel 28×30, .icdbtn 36, ICD chip remover <i> 7×18, .hb-act 31, #ho_absen 14, label.none 18, .serah-now button 20). Fix: 44-px minimum everywhere, real <button aria-label> for chip remover, promote override/allergy-nil to the 44-px .opt row. Command: harden.
4. [P2] Yes/No checkbox pairs with flipping order, both tickable, stored as label text. Fix: named radios in .rbseg/.rbopt style, always Ya → Tidak, labels unchanged. Command: clarify.
5. [P2] Not-logged-in load misreports cause (#mdlg_msg after cancelled login). Fix: "Masuk dulu untuk memuat dari hub" + inline Masuk button, keep RM, retry on success; chip text 12 px "Belum masuk". Command: clarify.
6. [P3] Keyboard/AT: .sev-card div onclick tabindex −1, IGA no aria-pressed, #tbmenu no focus move, no h1/main, .in:focus outline:none on 1.58:1 border. Command: harden.

## Persona Red Flags

Jordan (locum, day one): toolbar with no stated start; cards only "BELUM DIISI"; Program chip jumps to card not modal; Terbitkan offered twice; ICD 50 codes at step 1; no Panduan link.
Sam (keyboard/SR, 200 % zoom): stage cards unreachable; ICD remover <i>; IGA not announced; no h1/main; focus = border colour only; 430 px chrome at 200 %.
Dr. Sari (15-min slots): Diagnosis/IGA below fold; toolbar → RM → login → RM; ID retyped at sign-off; 7 Pakai taps; native rhythm/date pickers without defaults.

## Minor Observations

- ISO date in modal context strip and print header → _tglID().
- Melasma PM_BAGIAN defines 4 labels, 3 parts exist.
- WAJIB denominator 6 → 7 → 8; "4 dari 7 wajib".
- ICD picker closes per pick.
- Sticky strip mixes four control styles.
- Kontrol "dilewati" step takes clicks; aria-disabled.
- Sign-off date stays visible when PIN cancelled.
- Detector: .note/.callout/.sev-desc/.pmhead .sub/hubchip to 12.5 px; .05em → .02em on non-uppercase; drop radius on .band/.zone.

## Questions to Consider

- Why begin with a toolbar? Step 0 as a single RM field with inline login.
- Could the review dialog be the signing moment, removing d8_signoff as a control?
- Accept the stage protocol once and record deviations instead of seven Pakai taps?
