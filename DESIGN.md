# ADC Hub visual identity

Vanilla HTML forms for Aesthetic Derma Centre (Bandung). There is no shared stylesheet and no component framework. Each page keeps its own `<style>` block. Reuse the classes and custom properties already in that file. Do not invent a second palette, a utility framework, or a React/Flutter widget layer.

Patient and staff copy is Bahasa Indonesia. Screen type is Archivo (variable, loaded from Google Fonts). Entered values are blue (`--ink-fill`); printed form chrome is black.

## Two palettes, on purpose

**Screen (Form 1, Form 2, Panduan, hub home, admin).** Warm cream paper, terracotta accent, near-black ink. This is the patient-forms system. Form 2 is the master: later forms copy its hub chip, login dialog, and Muat dialog from there.

| Token | Value | Use |
|---|---|---|
| `--canvas` | `#FBF8F3` | Page background |
| `--surface` | `#FFFFFF` | Cards, steps, dialogs |
| `--surface-quiet` | `#F5EFE6` | Quiet fills, table heads, selected chips |
| `--ink` | `#1B1A18` | Text, dark toolbar, irreversible publish |
| `--ink-2` | `#3A3833` | Secondary body |
| `--ink-muted` | `#6B675E` | Labels, placeholders |
| `--ink-faint` | `#6F685B` | De-emphasized text (Form 2 and admin). Form 1 and Panduan still declare `#847D70`; use the token, do not add a third faint |
| `--ink-on-dark` | `rgba(245,239,230,.74)` | Text on the ink toolbar and modal header |
| `--ink-fill` | `#1F4E9C` | Anything the user typed |
| `--line` / `--line-strong` | `#E6DECF` / `#D9CCB7` | Rules and input borders |
| `--accent` | `#C97A5E` | Hover, chip outline, focus ring on the forms |
| `--accent-deep` | `#8E4A33` | Selected edge, links, warnings |
| `--accent-act` | `#B0603F` | White-on-terracotta commit buttons. Never put white text on `#C97A5E` |
| `--blush` | `#FCF4F0` | Allergy and warning bands |
| `--gold` | `#C9A86A` | Eyebrows on the dark staff panel |
| `--green-text` | `#5F6C50` | Success, hub-ok, done card |
| `--ff-head` / `--ff-body` | Archivo, system-ui | All screen type |

**Screen (Slimming and Journey Tracker).** These two already sit on the brand cool-grey palette, not terracotta. Their token *names* differ (`--quiet`, `--mut`, `--tan`, `--line-s` on Slimming; `--surface-quiet` / `--accent` remapped to cool grey and `#CDAF97` on the Tracker). Edit them with their own `:root`. Do not restyle them onto the cream/terracotta system.

**Print.** Screen cream and terracotta are for the tablet. `@media print` remaps `:root` to the ADC brand guideline: black ink, Cool Grey fills and rules (`#E8EBE9`, `#DADCD9`, `#C8CBC8`), accent `#CDAF97` / `#B38F7E` for rules only, brown text `#6E5A47`, alert fill `#EDE6E7`. Type stack is Acumin Pro, then Archivo, then Arial. The official logo is the `ADC_LOGO` SVG string (viewBox `116 269 610 57`) injected into `[data-adclogo]`; printed width is 66mm. Do not redraw, recolor, or stretch it. Do not put `#8E4A33`, `#F5EFE6`, `#D9CCB7`, or a Source Sans / Segoe-first stack into print CSS.

There is no dark theme and no `prefers-color-scheme` switch. Do not add one.

## Where the tokens live

All of these are `<style>` blocks at the top of the HTML file. No `.css` file exists; do not add one to “share” tokens.

| File | What it owns |
|---|---|
| `www/ADC_Form2_Asesmen_Umum_Dokter.html` | Master screen `:root` (top of the first `<style>`), the “BAHASA VISUAL BARU” layer, 12-column `.row`, dialogs (`.mdlg`), program modals (`.ovl` / `.pmodal`), and the block `CETAK = ADC BRAND GUIDELINES` |
| `www/ADC_Form1_Registrasi_Anamnesis_Pasien.html` | Same warm `:root` and the same print remap |
| `www/ADC_Panduan_Pengisian_Form.html` | Warm `:root` for the how-to guide (instruction text lives here, not in the forms) |
| `www/index.html` | Hub home cards. Shorter `:root`; same cream / terracotta / Archivo |
| `www/admin.html` | Pengguna dashboard. Full warm `:root` including radius tokens. Edited in `www/` |
| `www/ADC_Form_Asesmen_Slimming_SpGK.html` | Cool-grey `:root`. Square corners (`border-radius: 0`) are intentional on this sheet |
| `www/ADC_SkinQualityProgram_Journey_Outcome_Tracker.html` | Cool-grey `:root`, Archivo Narrow body |

Parent copies of the five clinical HTML files live one level up (the Marketing folder). `www/` is what the hub serves. See “Where to edit” below.

## Typography

Archivo on screen. Body is 16px, weight 380, line-height 1.55 (the “BAHASA VISUAL BARU” layer; an earlier 15px rule sits above it and loses).

| Role | Size | Notes |
|---|---|---|
| Display (`h1`, `.fhead .h1`) | 52px Form 2, 46px Panduan, 40px home, 34px admin | `font-variation-settings: 'wght' 320, 'wdth' 78`. 34px at `max-width: 640px` on the forms |
| Lede | 17px | `--ink-2`, max about 68ch |
| Body / inputs | 16px body, 15px in `.in` | Inputs use `--ink-fill` |
| Buttons, dialog body | 13–14px | Weight 540–620 |
| Labels (`.lab`, `.mdlg-l`) | 12px | Uppercase, tracking ~0.06–0.18em, `--ink-muted`. 12px is the floor for functional text |
| Section bar (`.sec`) | 12px | Uppercase, a 1px `--line` rule via `::after`. The `.n` section code (D0–D8) is print-only |

Do not add a new size for a one-off heading. Pick the row above that already matches the job.

## Radius

Declared on `:root` in Form 1, Form 2, and admin:

- `--r-card: 14px` — `.step`, `.page` cards, `.mdlg`, `.done-card`, `.flag`
- `--r-box: 8px` — inputs (`.in`, `.mdlg-in`), callouts, menu items
- `--r-pill: 999px` — chips, toolbar buttons, dialog buttons, mode switch

Program modals reset radius on `.ovl .pmodal *` (`border-radius: revert`). The round radio glyph is restored only on `.ovl .rbopt::before`. Selected chips, radios, IGA buttons, and stage cards share one token pair set on `.ovl`: `--sel-bg` (quiet cream) and `--sel-line` (`--accent-deep`), drawn as a 2px edge. Do not switch that selected state to a solid terracotta block.

Slimming forces square corners. Leave that sheet square.

## Spacing

Spacing is not tokenized. There is no `--space-*` scale; do not add one. Reuse the rhythm already in the screen layer:

- 12-column `.row`: `gap: 22px 20px`, `margin-bottom: 24px`
- Section rhythm: `.sec` margin about `26px 0 12px`
- Cards and steps: 34px padding (22px 18px under 640px); page gutter 32px (20px under 640px)
- Inputs: 10–13px padding, min-height 44–46px
- Chips: `11px 18px`, min-height 44px
- Dialogs: 24px padding, 8px button gap

If a token existed for the job, use the token. A raw hex, `rgb()`, or a new padding value is only acceptable when no custom property and no existing rule already covers it. Do not “clean up” existing one-off values (the pregnancy band `#FBEDE8`, hub-chip status greens and ambers) as a drive-by.

## Components

Compose these. Do not add a parallel button, card, or input class.

**Buttons.** Color is the action, not decoration.

- Advance or commit inside the form (Lanjut, Serahkan, dialog OK, “Selesai”): fill `--accent-act`, white label. Classes: `.stepnav .nb-p`, `.btn.tan`, `.sbtn.pri`, `.hobar .hb-act`, `.mdlg-b .mdlg-ok`.
- The irreversible publish only: fill `--ink`. Class `.stepnav .nb-terbit` (“Terbitkan Handoff”). The terbit dialog’s primary uses the same ink (`.tdlg .terbit.mdlg-ok`).
- Everything else: outlined, `--line-strong` border, transparent or `--surface`. Classes: `.stepnav .nb`, `.sbtn`, `.mdlg-b button`, `.pmfoot button`.
- Toolbar (on the ink bar): `.btn`, with `.btn.tan` for the single commit (Muat).
- Modal footer has one outlined “Cetak program ini”. Closing is the `×` (`.pmx`) or “Selesai” (`.pm-selesai`). `.fin` is the allergy field, not a button.

**Fields.** A `.row` of `.f` columns. Span with `.s3`…`.s12` (they sum to 12). Label is `<label class="lab" for="id">`. Control is `<input class="in">` or `<textarea class="in">`. Staff identity on the dark panel uses `.staff` / `.sin`, not `.in`.

**Chips.** `label.opt` or `label.ck` around a real checkbox or radio. Selected = quiet cream fill and terracotta edge. WAJIB status chips are `button.it` inside `#reqbar`. ICD chips are `.icdchips`. The hub status control is `button.hubchip`.

**Cards.** `.step` (one wizard step), `.prog` / `.progbtn` (program picker), `.callout` (quiet note), `.flag` (allergy), `.done-card` (after publish), `a.card` on the hub home, `.card` / `.gate` on admin.

**Dialogs.** `.mdlg-bg` + `.mdlg[role=dialog]`, opened with `dlgBuka` and closed with `dlgTutup`. Review dialogs add `.sdlg` (scroll the `.miss` list, pin `.mdlg-b`). Login and PIN use `_ldlg`, not a new modal. One dialog at a time.

**Program modals.** `.ovl` > `.pmodal[role=dialog]`. Parts are `.pmpart`; the rail is `.pmrail`. Ya/Tidak is `.rbseg.yn` / `.rbopt`. Stage cards are `button.sev-card`.

## Accessibility

- Focus: `input, select, textarea, button` use `:focus-visible` with a 2px `--accent` outline and 2px offset (admin uses `--accent-deep`). Do not set `outline: none` on modal inputs. The global ring is the keyboard indicator.
- Contrast floor 4.5:1, including placeholders. Placeholders use `--ink-muted` or `--ink-faint`. Secondary text uses `--ink-faint`. On the dark toolbar use `--ink-on-dark`. Status green is `--green-text`.
- Touch targets at least 44px (toolbar, rail, chips, dialog buttons, hub chip, Rx row actions, ICD chip remover). Functional text at least 12px. The screen-legibility block at the end of Form 2’s `<style>` enforces the 12px floor on table heads and small labels; new labels should be written at 12px or above, not appended to that list.
- Every control has a `<label class="lab" for>` or an accessible name. `initAriaNama()` names leftovers at load; do not rely on it for new fields.
- `.page` is `role="main"`. `.sec` is a heading. Rail buttons use `aria-current="step"`. Dialogs have `aria-labelledby`. IGA buttons use `aria-pressed`.

## Responsive

The layout is designed for a 1024px tablet. It also has to survive a phone (`max-width: 640px`), because a form is opened as a file when the hub is down.

At 640px the toolbar and `.ctlbar` wrap and stop being sticky, the page gutter drops to 20px, the display heading drops to 34px, and the acne 4-factor table stacks one factor per card. The step rail scrolls sideways from 820px. The 12-column row becomes 6 columns at 860px and one column at 560px. Login-dialog buttons stack at 480px (that rule lives inside the `_ldlgBuat` style string in each form).

Do not add a desktop-only layout wider than the 1140px `.page` cap.

## Where to edit

`update-forms.sh` / `update-forms.bat` copy these five files from the parent Marketing folder into `www/`:

- `ADC_Form1_Registrasi_Anamnesis_Pasien.html`
- `ADC_Form2_Asesmen_Umum_Dokter.html`
- `ADC_Panduan_Pengisian_Form.html`
- `ADC_Form_Asesmen_Slimming_SpGK.html`
- `ADC_SkinQualityProgram_Journey_Outcome_Tracker.html`

Edit the parent file, then sync. `www/` is the served copy, not the source of truth. `www/index.html` and `www/admin.html` exist only in `www/`; edit those in place.

Hub and dialog script shared by Form 2, Slimming, and the Tracker is copied from Form 2. Change Form 2 first, then re-copy that block. Do not let the three copies drift.

Restyle does not change logic. Engines read fields by `id` and by label (`buildIntake`, `applyIntake`, `buildHandoff`, `reqStatus`, `igaData`). Keep every `id` and function name. Class names `.sec`, `.row`, `.opt`, `.f`, and `.ck` mean different things inside `#ovl_hair` than on the main form; a global style change has to be checked there.

Avoid the `border` shorthand when the value uses `var()`; tests parse this CSS in jsdom and that shorthand breaks. Write the longhands (`border-width`, `border-style`, `border-color`).
