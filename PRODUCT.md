# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Nurse (perawat) with the patient, on a clinic tablet.** At registration the nurse fills the staff panel of Form 1 (RM, NIK, doctor, baseline photo, weight/height), then hands the tablet to the patient, who answers the anamnesis in their own words and signs on screen. New patients only; kontrol visits skip Form 1.
- **Doctor on a tablet during the consultation.** Sp.DVE (skin) fills Form 2 and the program modals (Acne, Melasma/Hiperpigmentasi, Hair-Loss); Sp.GK fills the Slimming assessment. The doctor signs off with a personal PIN, prints the patient sheet and the informed-consent sheet, then hands the device back to the nurse for scheduling and "Terbitkan Handoff".
- **Admin / CS on the hub PC.** Looks up patients by No. RM, prints, manages hub users, backups and the audit log. CS is read-only.
- **Management.** Reads the Journey & Outcome Tracker for program reviews, not only clinicians.

Language of every screen and printout is Bahasa Indonesia. Clinical terms stay in their usual form (IGA, Fitzpatrick, ICD-10, InBody).

## Product Purpose

Clinical forms and a small companion server for Aesthetic Derma Centre (ADC), a klinik utama in Bandung, running its Skin Quality Program (Acne, Hiperpigmentasi/Melasma, Hair-Loss) and the Sp.GK Slimming program. The forms replace paper intake, doctor assessment, program planning and handoff; the hub (`server.js`) shares the records across the clinic's devices keyed by No. RM.

Success means:

1. Every patient has a complete, signed digital record: allergy, baseline photo, IGA, consents, doctor signature, no paper gaps.
2. Doctors follow the program protocol consistently, so the same staged program and the same acne 4-factor logic apply regardless of which doctor sees the patient.
3. Patients understand and stick to the program; the printed sheets and WhatsApp reminders drive adherence and return visits.
4. Outcomes are measurable per program: IGA and InBody trends per patient and per program.

## Positioning

The forms encode ADC's own treatment protocol, not a generic EMR: staged programs per condition, the acne 4-factor model from Dr. Kentaro Oku, FDA-style IGA 0–4 scoring with a baseline anchored at visit 1, and a handoff chain where the newest handoff carries the whole history. A neighbouring clinic tool could not truthfully copy this without ADC's protocol and product catalogue.

## Operating Context

- Devices: tablets in registration and consultation rooms, one clinic PC that runs the hub (`start.bat`) and prints. Forms are also opened as plain files when the hub is down.
- Flow per new patient: Form 1 (nurse + patient) → hub → Form 2 "Muat Form 1" (doctor) → D1 findings, ICD-10, IGA → program modal → Rx (topical from the ADC product list, oral free text) → D7 sign-off with PIN + informed-consent sheet → nurse schedules (D4b) and issues the handoff. Kontrol visits load the last handoff by RM.
- Official medical record is **NeoSoft Cube**. Hub output (handoff, print sheets, consent sheets) is supporting documentation that staff lodge in NeoSoft; SATUSEHAT reporting runs from NeoSoft. Nothing here replaces either.
- Reminders go out through Make.com / SleekFlow from a schedule the nurse generates in Form 2.
- Regulatory frame the record must keep satisfying: PMK 24/2022 (rekam medis elektronik), PP 28/2024 and UU 17/2023 (informed consent), KMK 1983/2022 PKP 12, UU 27/2022 (data pribadi). Compliance layer shipped 2026-10-23: per-user PIN login and roles, audit log, 2×24 h correction window, encrypted storage, backups, HTTPS option, NIK, consents, ICD-10, doctor e-signature.

## Capabilities and Constraints

- Single-file HTML + vanilla JS forms; sources live one level above the hub folder (`../ADC_Form1…`, `../ADC_Form2…`, Slimming, Tracker, Panduan); `www/` holds served copies. Zero-dependency Node server; patient data stays on the clinic LAN.
- **Offline-first**: every hub call is optional; the downloaded JSON file is always the fallback record.
- **Restyle ≠ relogic**: element ids and JS function names are the data contract (`buildIntake`, `applyIntake`, `buildHandoff`, `collectRx`, `igaData`, …). Visual work must keep them.
- No staff instruction text inside the forms; how-to lives in the Panduan. Patient-facing explanatory text in Form 1 stays.
- Rx rows are 4-input rows; topical rows use the embedded ADC product picker generated from `../ADC_Data_Produk_MedEx_OTC.xlsx`. Oral drug list not yet supplied (open).
- Print targets: 1-page doctor assessment sheet, patient program sheet, A4 informed-consent sheet, all from Form 2.
- Dual-role CSS classes (`.sec`, `.row`, `.opt`, `.f`, `.ck`) mean different things in the main form and in the imported Hair-Loss modal; grid span classes differ per file.
- Undecided: oral drug catalogue; NeoSoft read API; final wording of consent and rights/duties texts (drafts pending PJ klinik review); isotretinoin/pregnancy protocol checklist.

## Brand Commitments

- Name: Aesthetic Derma Centre (ADC), Jl. Ir. H. Djuanda 88, Bandung. Instagram handles @adc.skinexpert, @adc.slimmingexpert.
- Patient-facing printouts must follow the ADC brand: real logo files composited (never redrawn), palette and tone from the ADC brand kit (Canva brand kit id `kAGooDNHL_M`; logo and uniform references in `C:\Alex Workspace\ADC Files\Elle Avatar\elle-spokesperson\`).
- Tokens already in use in the forms, as evidence of the incumbent look, not a design decision: warm off-white canvas `#FBF8F3`, ink `#1B1A18`, terracotta accent `#C97A5E` / deep `#8E4A33`, gold `#C9A86A`, sage green `#6E7C5E`, user-entered text in blue `#1F4E9C`. Two font roles (`--ff-head`, `--ff-body`).
- Voice: Bahasa Indonesia, calm and clinical; no superlatives or guaranteed results (health-advertising compliance applies to anything a patient reads).

## Evidence on Hand

- Dr. Kentaro Oku's acne 4-factor presentation (summarised in Panduan §8) and ADC's staged program definitions inside the modals.
- ADC product catalogue: `../ADC_Data_Produk_MedEx_OTC.xlsx` (180 products: 87 MedEx, 93 OTC, all topical).
- Regulation PDFs in `C:\Users\goeia\Downloads\_regulasi_adc\` (PMK 24/2022, KMK 1983/2022, PKP presentation).
- Automated e2e suite `e2e-test.js` (183 checks) exercising the full clinic flow.
- No patient data, testimonials, outcome statistics or pricing exist in the repo; never fabricate them. Clinic trial on real tablets has not happened yet.

## Product Principles

1. **The record is the product.** Completeness, attribution and signatures outrank speed; the form may warn, never silently skip.
2. **Protocol over preference.** Program stages, IGA and the 4-factor logic are fixed by the clinic; the form guides every doctor through the same path.
3. **Device changes hands once.** Patient → nurse → doctor → nurse; each step sees only what it needs, in the order the visit actually runs.
4. **Works when the network does not.** File download is always a valid outcome; the hub is a convenience.
5. **Patient sheets must be understood at home.** Anything printed for the patient is plain, on brand and free of staff jargon.

## Accessibility & Inclusion

Tablet touch use by patients of all ages: minimum 44 px targets, readable body size, no colour-only meaning. Printed sheets must read on a home printer in black and white.
