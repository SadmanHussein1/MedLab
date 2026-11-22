/* ============================================================================
   MedLab Epidemiology — Step 2: BAG, ANRESIS, BFS Ward Burden, NKRS & Quiz
   File: epi/data-clinical.js
   ============================================================================ */
window.EPI_DATA = window.EPI_DATA || {};

(function (E) {
  'use strict';

  /* --------------------------------------------------------------------------
     1. BAG INFECTIOUS SURVEILLANCE (Curated CH Annual Snapshot + 12-Mo Weights)
        urgency: 1 = 2h Phone | 2 = 24h | 3 = 1 wk | 4 = Sentinella
     -------------------------------------------------------------------------- */
  E.MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  E.BAG_INFECTIOUS = [
    { id:'flu', name:'Seasonal Influenza (Lab / Sentinella)', cat:'resp', cases:34500, inc:383.3, trend:'Cyclical', melde:'1 wk (Lab)', urgency:3,
      season:[1.0,0.95,0.55,0.2,0.08,0.05,0.05,0.05,0.08,0.15,0.35,0.85],
      pearl:'Peaks Jan–Feb; Sentinella GP network tracks ILI consultations alongside mandatory lab reports and wastewater.',
      tx:'Supportive; Oseltamivir within 48h for hospitalized or high-risk patients.' },
    { id:'rsv', name:'RSV (Hospital / Sentinella)', cat:'resp', cases:16200, inc:180.0, trend:'Cyclical', melde:'Sentinella', urgency:4,
      season:[0.95,0.75,0.4,0.15,0.06,0.04,0.04,0.05,0.1,0.3,0.78,1.0],
      pearl:'Leading cause of infant bronchiolitis hospitalization & severe elderly LRTI; peaks Dec–Jan slightly before flu.',
      tx:'Supportive O2/hydration; Nirsevimab prophylaxis for infants; RSV vaccine for elderly/pregnancy.' },
    { id:'lyme', name:'Lyme Borreliosis (Sentinella est.)', cat:'vector', cases:13300, inc:147.8, trend:'+12%', melde:'Sentinella', urgency:4,
      season:[0.05,0.05,0.12,0.35,0.75,1.0,0.95,0.75,0.55,0.35,0.15,0.06],
      pearl:'Not individually notifiable; estimated via Sentinella. Erythema migrans is a clinical diagnosis—do NOT wait for serology.',
      tx:'Doxycycline 100 mg BID (10–14d) for EM; Ceftriaxone IV or PO Doxycycline for neuroborreliosis.' },
    { id:'chlam', name:'Chlamydia trachomatis', cat:'sti', cases:12700, inc:141.1, trend:'Stable', melde:'1 wk (Lab)', urgency:3,
      season:[0.85,0.8,0.85,0.82,0.85,0.88,0.9,0.92,0.95,0.92,0.88,0.82],
      pearl:'#1 notifiable bacterial STI in CH; mostly asymptomatic in young adults (PID/infertility risk).',
      tx:'Doxycycline 100 mg BID × 7d (preferred over single-dose Azithromycin).' },
    { id:'campy', name:'Campylobacteriosis', cat:'food', cases:8700, inc:96.7, trend:'Stable', melde:'1 wk (Lab)', urgency:3,
      season:[0.88,0.45,0.4,0.45,0.65,0.85,1.0,0.95,0.75,0.6,0.55,0.94],
      pearl:'Iconic Swiss bimodal peak: Summer BBQ poultry + Dec/Jan "Fondue Chinoise" holiday peak! Triggers GBS.',
      tx:'Rehydration; Azithromycin only if severe, bloody, prolonged, or immunocompromised.' },
    { id:'gono', name:'Gonorrhoea (N. gonorrhoeae)', cat:'sti', cases:6900, inc:76.7, trend:'+45% (5y)', melde:'1 wk (Lab)', urgency:3,
      season:[0.8,0.82,0.85,0.86,0.9,0.92,0.95,0.95,0.92,0.9,0.88,0.85],
      pearl:'Sharp 5-year surge in CH; rising fluoroquinolone & Azithromycin resistance monitored via ANRESIS.',
      tx:'Ceftriaxone 1 g IM/IV single dose (Swiss SSI guideline) + partner therapy.' },
    { id:'pertussis', name:'Pertussis (Sentinella est.)', cat:'vax', cases:4200, inc:46.7, trend:'Cyclical', melde:'Sentinella', urgency:4,
      season:[0.6,0.55,0.6,0.65,0.75,0.85,0.95,1.0,0.9,0.8,0.7,0.65],
      pearl:'3–5 yr epidemic waves; maternal Tdap in every pregnancy (2nd/3rd trimester) protects young infants.',
      tx:'Azithromycin/Clarithromycin (reduces transmission if <3 wk; minimal symptom effect once paroxysmal).' },
    { id:'salm', name:'Salmonellosis (Non-typhoidal)', cat:'food', cases:1850, inc:20.6, trend:'Stable', melde:'1 wk (Lab)', urgency:3,
      season:[0.35,0.3,0.35,0.45,0.65,0.85,0.95,1.0,0.9,0.7,0.45,0.35],
      pearl:'Summer peak; poultry/eggs & travel. Avoid antibiotics in uncomplicated enteritis (prolongs carriage).',
      tx:'Rehydration; Ceftriaxone/Ciprofloxacin only if bacteremic, elderly, vascular graft, or immunocompromised.' },
    { id:'syph', name:'Syphilis (Treponema pallidum)', cat:'sti', cases:1170, inc:13.0, trend:'+15% (5y)', melde:'1 wk (Lab+MD)', urgency:3,
      season:[0.82,0.8,0.85,0.85,0.88,0.9,0.88,0.9,0.92,0.88,0.85,0.82],
      pearl:'Strong male predominance (~85% MSM); screen all pregnant women & HIV+ patients.',
      tx:'Benzathine Penicillin G 2.4 Mio IU IM (1× early; 3× weekly late latent).' },
    { id:'pneumo', name:'Invasive Pneumococcal Disease', cat:'vax', cases:1120, inc:12.4, trend:'Stable', melde:'1 wk (Lab)', urgency:3,
      season:[1.0,0.92,0.8,0.6,0.45,0.32,0.25,0.22,0.35,0.55,0.75,0.95],
      pearl:'Bacteremia & meningitis; peaks in winter post-influenza. PCV15/20 recommended ≥65 y in CH.',
      tx:'Ceftriaxone ± Vancomycin (meningitis) + early Dexamethasone.' },
    { id:'ehec', name:'EHEC / STEC', cat:'food', cases:980, inc:10.9, trend:'+18%', melde:'1 wk (Lab)', urgency:3,
      season:[0.35,0.35,0.45,0.55,0.7,0.85,1.0,0.95,0.8,0.65,0.5,0.4],
      pearl:'Shiga-toxin E. coli; antibiotics are CONTRAINDICATED (increases HUS risk).',
      tx:'Aggressive isotonic IV fluids & close Hb/Plt/Creatinine/LDH monitoring.' },
    { id:'legio', name:'Legionellosis', cat:'resp', cases:560, inc:6.2, trend:'+22% (5y)', melde:'1 wk (Lab+MD)', urgency:3,
      season:[0.35,0.3,0.35,0.45,0.6,0.85,1.0,0.95,0.8,0.6,0.45,0.38],
      pearl:'Among highest rates in Europe; summer warm-water aerosol surge. Classic triad: pneumonia + GI + hyponatremia.',
      tx:'Levofloxacin or Azithromycin (β-lactams ineffective); urinary Ag misses non-serogroup 1.' },
    { id:'tb', name:'Tuberculosis (M. tuberculosis)', cat:'resp', cases:525, inc:5.8, trend:'-12% (5y)', melde:'1 wk (Lab+MD)', urgency:3,
      season:[0.85,0.85,0.9,0.9,0.92,0.88,0.85,0.82,0.85,0.88,0.85,0.82],
      pearl:'~75% in foreign-born residents; airborne isolation required for smear-positive pulmonary TB.',
      tx:'2 mo RIPE (Rifampicin, Isoniazid, Pyrazinamide, Ethambutol) + 4 mo RI.' },
    { id:'tbe', name:'TBE / FSME (Tick-Borne Encephalitis)', cat:'vector', cases:502, inc:5.6, trend:'+35% (5y)', melde:'1 wk (Lab+MD)', urgency:3,
      season:[0.02,0.02,0.08,0.3,0.75,1.0,0.95,0.7,0.55,0.35,0.1,0.03],
      pearl:'Entire Switzerland (except Ticino) is a BAG vaccination risk area! Biphasic illness: flu -> meningoencephalitis.',
      tx:'No specific antiviral; prevention via 3-dose TBE vaccine (CH booster every 10 years).' },
    { id:'hiv', name:'HIV (New Diagnoses)', cat:'sti', cases:387, inc:4.3, trend:'-20% (5y)', melde:'1 wk (Lab+MD)', urgency:3,
      season:[0.85,0.82,0.88,0.85,0.85,0.88,0.85,0.85,0.88,0.9,0.88,0.82],
      pearl:'Declining via TasP (U=U) & PrEP; ~30% still diagnosed late (CD4 <350). Consider acute HIV in mono-like illness.',
      tx:'Immediate ART (e.g. Dolutegravir + Tenofovir/Emtricitabine).' },
    { id:'malaria', name:'Malaria (Imported)', cat:'import', cases:295, inc:3.3, trend:'Stable', melde:'1 wk (Lab+MD)', urgency:3,
      season:[0.7,0.6,0.55,0.6,0.65,0.75,0.95,1.0,0.9,0.8,0.75,0.85],
      pearl:'>80% P. falciparum from Sub-Saharan Africa (VFR travelers). Emergency rule-out in every febrile returnee.',
      tx:'Artemether-Lumefantrine (uncomplicated); immediate IV Artesunate if severe (>2% parasitemia, coma, acidosis).' },
    { id:'dengue', name:'Dengue (Imported)', cat:'import', cases:260, inc:2.9, trend:'+40% (5y)', melde:'1 wk (Lab)', urgency:3,
      season:[0.75,0.7,0.65,0.7,0.65,0.7,0.85,1.0,0.9,0.8,0.8,0.85],
      pearl:'Fever + retro-orbital pain + leukopenia/thrombocytopenia in SE Asia / Latin America returnees.',
      tx:'Supportive fluids & Paracetamol; AVOID NSAIDs/ASA (bleeding risk); watch warning signs on defervescence.' },
    { id:'measles', name:'Measles (Masern)', cat:'vax', cases:95, inc:1.1, trend:'Clusters', melde:'24h (MD+Lab)', urgency:2,
      season:[0.6,0.8,1.0,0.95,0.8,0.55,0.3,0.2,0.2,0.3,0.4,0.5],
      pearl:'R0 = 12–18; strict 24h notification to Kantonsarzt for contact tracing & post-exposure MMR (<72h).',
      tx:'Supportive + Vitamin A; strict airborne isolation.' },
    { id:'hepa', name:'Hepatitis A', cat:'food', cases:75, inc:0.8, trend:'Low/Clusters', melde:'24h (Lab+MD)', urgency:2,
      season:[0.7,0.65,0.7,0.75,0.75,0.8,0.85,0.95,1.0,0.9,0.8,0.75],
      pearl:'24h reporting allows post-exposure vaccination/Ig within 14d for household/food-handler contacts.',
      tx:'Supportive; monitor INR & encephalopathy for rare fulminant liver failure.' },
    { id:'meningo', name:'Invasive Meningococcal Disease', cat:'vax', cases:42, inc:0.5, trend:'Low', melde:'24h (MD+Lab)', urgency:2,
      season:[1.0,0.95,0.85,0.65,0.5,0.35,0.3,0.28,0.4,0.55,0.75,0.9],
      pearl:'Medical emergency (purpura fulminans, shock). 24h report triggers immediate Rifampicin/Cipro PEP for close contacts.',
      tx:'Immediate IV Ceftriaxone 2 g BID (never delay for LP/CT) + droplet isolation.' },
    { id:'tularemia', name:'Tularemia (Hasenpest)', cat:'vector', cases:155, inc:1.7, trend:'+90% (5y)', melde:'1 wk (Lab+MD)', urgency:3,
      season:[0.15,0.15,0.25,0.45,0.8,1.0,0.95,0.8,0.65,0.45,0.25,0.15],
      pearl:'Rapidly rising tick-borne zoonosis in CH (ulceroglandular or painful regional lymphadenitis).',
      tx:'Ciprofloxacin or Doxycycline (or Gentamicin if severe); β-lactams completely ineffective.' },
    { id:'vhf', name:'VHF / Botulism / Anthrax / Diphtheria', cat:'import', cases:4, inc:0.04, trend:'Rare', melde:'2h Phone (MD+Lab)', urgency:1,
      season:[0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4],
      pearl:'Highest Swiss VMüK tier: immediate 2-hour TELEPHONE report on clinical suspicion to Kantonsarzt & BAG.',
      tx:'Immediate isolation, antitoxin (Botulism/Diphtheria), biosafety transport.' },
  ];

  /* --------------------------------------------------------------------------
     2. ANRESIS SWISS ANTIBIOTIC RESISTANCE MATRIX (Invasive Blood/CSF Isolates)
        Shows German-speaking CH vs French/Italian-speaking CH (Röstigraben)
     -------------------------------------------------------------------------- */
  E.ANRESIS_DRUGS = ['Amox/Clav', 'Ceftriaxone', 'Pip/Tazo', 'Ciproflox.', 'Carbapenem', 'Vancomycin'];
  E.ANRESIS_MATRIX = [
    { id:'ecoli', pathogen:'E. coli (Invasive)', de:[22, 10, 7, 17, 0.1, null], lat:[28, 14, 10, 23, 0.3, null], trend:'ESBL ~11% (plateauing)',
      pearl:'Clear Röstigraben: ~4–6% higher ESBL & fluoroquinolone resistance in Romandie/Ticino due to higher outpatient antibiotic use.' },
    { id:'kleb', pathogen:'K. pneumoniae', de:[14, 7, 8, 9, 0.6, null], lat:[20, 12, 13, 15, 1.8, null], trend:'ESBL ~9%, Carb-R <2%',
      pearl:'Intrinsically Ampicillin-resistant; higher nosocomial ESBL and CPE rates in Latin CH & ICU settings.' },
    { id:'paer', pathogen:'P. aeruginosa', de:[null, null, 11, 10, 11, null], lat:[null, null, 15, 14, 16, null], trend:'Carbapenem-R ~12–15%',
      pearl:'Intrinsically resistant to Amox/Clav & Ceftriaxone! Use Pip/Tazo, Cefepime, Ceftazidime, or Meropenem.' },
    { id:'saureus', pathogen:'S. aureus (MRSA / Fluclox.)', de:[null, null, null, 4, null, 0.0], lat:[null, null, null, 9, null, 0.0], mrsaDe:3.5, mrsaLat:8.5, trend:'MRSA falling (~5% CH)',
      pearl:'Low Swiss MRSA rate (~3.5% German CH vs ~8.5% Romandie/Ticino) -> Flucloxacillin/Cefazolin remains 1st-line for MSSA.' },
    { id:'spneumo', pathogen:'S. pneumoniae', de:[null, 1.0, null, null, null, 0.0], lat:[null, 2.2, null, null, null, 0.0], penDe:5.5, penLat:9.5, trend:'Low Pen-R (~7% I/R)',
      pearl:'High-dose Amoxicillin or Ceftriaxone retains >98% invasive coverage across Switzerland (Penicillin non-S ~5–10%).' },
    { id:'efaecium', pathogen:'E. faecium (VRE)', de:[92, null, null, null, 95, 2.2], lat:[94, null, null, null, 96, 3.8], trend:'VRE ~2–4% (outbreaks)',
      pearl:'Intrinsically cephalosporin-resistant & >90% ampicillin-resistant; Vancomycin (or Daptomycin/Linezolid if VRE) required.' },
  ];

  /* --------------------------------------------------------------------------
     3. BFS HOSPITAL MEDICAL STATISTICS — WARD BURDEN BUBBLE MATRIX
        X = Annual Admissions (k) | Y = Mean Length of Stay (days) | Size = In-Hospital Mortality (%)
     -------------------------------------------------------------------------- */
  E.WARD_BURDEN = [
    { id:'birth', name:'Normal & Complicated Delivery', cat:'OB/GYN', admK:80, los:4.2, mort:0.01, col:'#ec4899',
      note:'Highest single physiological inpatient volume (~80k births/yr); near-zero mortality.' },
    { id:'oa_hip', name:'Hip / Knee Osteoarthritis', cat:'Ortho', admK:64, los:5.4, mort:0.15, col:'#6366f1',
      note:'Massive elective surgical volume (arthroplasty); very low perioperative mortality.' },
    { id:'trauma_fx', name:'Proximal Femur / Major Fractures', cat:'Trauma', admK:58, los:7.8, mort:2.8, col:'#f43f5e',
      note:'Geriatric hip fractures & alpine/sports trauma; 1-year mortality after hip fracture exceeds 20%.' },
    { id:'psych_dep', name:'Depression & Bipolar (Inpatient)', cat:'Psych', admK:38, los:33.5, mort:0.2, col:'#8b5cf6',
      note:'Longest mean inpatient stay (>33 days!) — accounts for a huge share of total Swiss hospital bed-days.' },
    { id:'psych_sub', name:'Alcohol / Substance Disorders', cat:'Psych', admK:31, los:16.2, mort:0.6, col:'#a855f7',
      note:'High readmission frequency and prolonged inpatient withdrawal/rehabilitation stays.' },
    { id:'pna', name:'Pneumonia (All-Cause)', cat:'Internal', admK:42, los:7.4, mort:6.8, col:'#38bdf8',
      note:'Major winter ward workhorse; high mortality in frail/elderly and aspiration pneumonia.' },
    { id:'hf_ward', name:'Decompensated Heart Failure', cat:'Cardio', admK:36, los:8.9, mort:7.5, col:'#14b8a6',
      note:'#1 medical readmission driver in >70 y; requires rapid decongestion & 4-pillar GDMT titration.' },
    { id:'afib_ward', name:'Atrial Fibrillation / Flutter', cat:'Cardio', admK:28, los:4.1, mort:0.8, col:'#0d9488',
      note:'Short stays for rate/rhythm control, cardioversion, or catheter ablation.' },
    { id:'mi_ward', name:'Acute Myocardial Infarction', cat:'Cardio', admK:17, los:5.2, mort:5.4, col:'#06b6d4',
      note:'Shortened stay due to primary PCI; mortality concentrated in cardiogenic shock & late presenters.' },
    { id:'stroke_ward', name:'Acute Stroke (Ischemic/Hemorrh.)', cat:'Neuro', admK:16, los:9.6, mort:9.2, col:'#f59e0b',
      note:'High acute lethality & frequent transition to neurological rehabilitation.' },
    { id:'copd_ward', name:'COPD Exacerbation', cat:'Pulm', admK:18, los:8.2, mort:4.6, col:'#0284c7',
      note:'Winter surge overlapping influenza/RSV; NIV significantly reduces intubation & mortality.' },
    { id:'sepsis_ward', name:'Sepsis & Septic Shock', cat:'ICU/Med', admK:20, los:12.4, mort:18.5, col:'#ef4444',
      note:'Highest in-hospital lethality (~18–20% overall, >35% shock) with prolonged ICU/ward stays.' },
    { id:'gallstone', name:'Cholelithiasis / Cholecystitis', cat:'GI/Surg', admK:26, los:3.8, mort:0.4, col:'#84cc16',
      note:'High-turnover laparoscopic surgery with short length of stay.' },
    { id:'uti_ward', name:'Pyelonephritis / Complicated UTI', cat:'Internal', admK:29, los:6.1, mort:1.9, col:'#10b981',
      note:'Extremely common geriatric ward admission; major source of urosepsis & delirium.' },
    { id:'lung_ca_w', name:'Lung Cancer Admissions', cat:'Onco', admK:14, los:9.1, mort:13.8, col:'#dc2626',
      note:'High in-hospital mortality from respiratory failure, PE, and palliative admissions.' },
  ];

  /* --------------------------------------------------------------------------
     4. NKRS SWISS ONCOLOGY MATRIX (2018–2022 Annual Averages)
     -------------------------------------------------------------------------- */
  E.NKRS_ONCOLOGY = [
    { id:'prostate', name:'Prostate', incAll:7400, incM:7400, incF:0, deathsAll:1400, deathsM:1400, deathsF:0, surv5:90, medAge:70, col:'#14b8a6',
      screen:'Shared decision-making PSA (50–70 y; earlier if BRCA2/FH)',
      redFlags:'Rising PSA, firm nodule on DRE, bone pain (osteoblastic mets), obstructive LUTS.' },
    { id:'breast', name:'Breast', incAll:6600, incM:50, incF:6550, deathsAll:1380, deathsM:10, deathsF:1370, surv5:88, medAge:64, col:'#ec4899',
      screen:'Mammography q2y ages 50–74 (cantonal programs in ~half of CH)',
      redFlags:'Painless firm lump, skin dimpling, bloody nipple discharge, axillary lymphadenopathy.' },
    { id:'lung', name:'Lung & Bronchus', incAll:5100, incM:2900, incF:2200, deathsAll:3250, deathsM:1850, deathsF:1400, surv5:22, medAge:71, col:'#f43f5e',
      screen:'No national program yet; targeted LDCT pilots for heavy smokers',
      redFlags:'#1 cancer killer in BOTH sexes. Hemoptysis, >3 wk cough, weight loss, hoarseness, SIADH/PTHrP.' },
    { id:'crc', name:'Colorectal', incAll:4600, incM:2500, incF:2100, deathsAll:1650, deathsM:920, deathsF:730, surv5:67, medAge:71, col:'#f59e0b',
      screen:'OKP-covered ages 50–69: FIT q2y or Colonoscopy q10y',
      redFlags:'Iron-deficiency anemia (right-sided), hematochezia, change in bowel habits, weight loss.' },
    { id:'melanoma', name:'Melanoma', incAll:3300, incM:1800, incF:1500, deathsAll:300, deathsM:180, deathsF:120, surv5:93, medAge:66, col:'#a855f7',
      screen:'Opportunistic skin check in high-risk (fair skin, >50 nevi, FH)',
      redFlags:'Among highest rates worldwide (alpine UV). ABCDE criteria & ugly duckling sign.' },
    { id:'nhl', name:'Non-Hodgkin Lymphoma', incAll:1750, incM:980, incF:770, deathsAll:550, deathsM:300, deathsF:250, surv5:73, medAge:70, col:'#6366f1',
      screen:'None', redFlags:'Painless rubbery lymphadenopathy, B-symptoms (fever, night sweats, >10% wt loss), ↑LDH.' },
    { id:'pancreas', name:'Pancreas', incAll:1650, incM:840, incF:810, deathsAll:1480, deathsM:750, deathsF:730, surv5:11, medAge:74, col:'#ef4444',
      screen:'None (high-risk familial/BRCA2 MRI only)',
      redFlags:'Painless obstructive jaundice (Courvoisier sign), new diabetes >50 y, back-radiating epigastric pain.' },
    { id:'bladder', name:'Urinary Bladder', incAll:1350, incM:1020, incF:330, deathsAll:560, deathsM:400, deathsF:160, surv5:57, medAge:74, col:'#3b82f6',
      screen:'None', redFlags:'Painless gross hematuria (always rule out urothelial CA in smokers >50 y).' },
    { id:'leukemia', name:'Leukemias', incAll:1250, incM:730, incF:520, deathsAll:560, deathsM:330, deathsF:230, surv5:63, medAge:70, col:'#06b6d4',
      screen:'None', redFlags:'Fatigue, recurrent infections, petechiae, blasts or marked lymphocytosis on blood smear.' },
    { id:'kidney', name:'Kidney (RCC)', incAll:1150, incM:760, incF:390, deathsAll:340, deathsM:220, deathsF:120, surv5:78, medAge:68, col:'#10b981',
      screen:'None (often incidental on US/CT)', redFlags:'Hematuria, flank pain, paraneoplastic erythrocytosis/hypercalcemia.' },
    { id:'liver', name:'Liver (HCC)', incAll:980, incM:730, incF:250, deathsAll:760, deathsM:540, deathsF:220, surv5:20, medAge:70, col:'#d97706',
      screen:'Abdominal US q6mo in all cirrhosis & high-risk HBV patients',
      redFlags:'Cirrhosis decompensation, rising AFP, arterial hyperenhancement + washout on CT/MRI.' },
    { id:'brain', name:'CNS / Brain Tumors', incAll:780, incM:450, incF:330, deathsAll:550, deathsM:330, deathsF:220, surv5:26, medAge:63, col:'#8b5cf6',
      screen:'None', redFlags:'New adult-onset seizure, progressive focal deficit, morning headache + vomiting.' },
  ];

  /* --------------------------------------------------------------------------
     5. SWISS GBD / OBSAN BURDEN SPLIT: KILLERS (YLL) vs DISABLERS (YLD)
        Values = relative share of total Swiss DALYs (Years of Life Lost vs Disability)
     -------------------------------------------------------------------------- */
  E.GBD_BURDEN = [
    { name:'Low Back & Neck Pain',       yll:0.0,  yld:12.4, note:'#1 cause of Years Lived with Disability (YLD) in Switzerland; zero direct mortality.' },
    { name:'Ischemic Heart Disease',     yll:7.8,  yld:0.6,  note:'Pure mortality driver (YLL) despite huge decline since 1970.' },
    { name:'Depressive & Anxiety Dis.',  yll:0.1,  yld:9.1,  note:'Massive disability burden especially in ages 15–45; drives long psychiatric stays.' },
    { name:'Lung & Colorectal Cancers',  yll:6.9,  yld:0.5,  note:'Leading premature-mortality (YLL) malignancies in Switzerland.' },
    { name:'Dementia / Alzheimer',       yll:4.6,  yld:2.4,  note:'Fastest-growing combined mortality + long-term care disability burden.' },
    { name:'Falls & Fractures',          yll:1.9,  yld:4.2,  note:'High disability & orthopedic bed volume across alpine trauma and frail elderly.' },
    { name:'Migraine & Headache',        yll:0.0,  yld:5.3,  note:'Top disabler in working-age Swiss women; invisible in mortality stats.' },
    { name:'Stroke (Cerebrovascular)',   yll:3.1,  yld:1.9,  note:'Both lethal and #1 neurological cause of chronic adult disability.' },
    { name:'Diabetes Mellitus',          yll:1.2,  yld:3.4,  note:'Growing microvascular & neuropathic disability burden.' },
    { name:'COPD',                       yll:2.2,  yld:2.1,  note:'Balanced killer and chronic daily-activity limiter.' },
  ];

  /* --------------------------------------------------------------------------
     6. SWISS BASE-RATE, ANRESIS & MELDEPFLICHT QUIZ BANK (15 Questions)
     -------------------------------------------------------------------------- */
  E.QUIZ_BANK = [
    { cat:'BFS Mortality', q:'What is the #1 cause of death in Swiss adults aged 15–44 years?',
      opts:['Malignant Neoplasms','External Causes (Suicide & Trauma)','Cardiovascular Diseases','Infectious Diseases'], ans:1,
      exp:'External causes account for 49.5% of deaths in men and 34.2% in women aged 15–44 in Switzerland.' },
    { cat:'BFS Mortality', q:'In Swiss women aged 45–64, roughly what share of ALL deaths is caused by cancer?',
      opts:['~18%','~30%','~50%','~70%'], ans:2,
      exp:'Malignant neoplasms cause 50.3% of all deaths in Swiss women aged 45–64 (vs. 34.0% in men of the same age).' },
    { cat:'NKRS Oncology', q:'Which malignancy causes the highest number of cancer deaths in Swiss WOMEN?',
      opts:['Breast Cancer','Lung Cancer','Colorectal Cancer','Pancreatic Cancer'], ans:1,
      exp:'Lung cancer overtook breast cancer as the #1 cancer killer in Swiss women (17.4% vs 16.8% of cancer deaths).' },
    { cat:'BAG Surveillance', q:'Approximately how many Tick-Borne Encephalitis (TBE / FSME) cases are reported yearly in Switzerland?',
      opts:['~40 cases','~500 cases','~5,000 cases','~25,000 cases'], ans:1,
      exp:'Around 400–550 TBE cases/yr are notified to BAG (compared to ~13,300 estimated Lyme consultations via Sentinella).' },
    { cat:'VMüK Meldepflicht', q:'A patient presents with suspected Botulism or Viral Hemorrhagic Fever. What is the Swiss BAG deadline?',
      opts:['Within 2 hours by telephone','Within 24 hours by HIN form','Within 1 week by lab only','Sentinella only'], ans:0,
      exp:'Suspected Botulism, VHF, Anthrax, or Diphtheria require an immediate 2-hour TELEPHONE report to the Kantonsarzt & BAG.' },
    { cat:'BAG Surveillance', q:'Why does Swiss Campylobacteriosis show a sharp second peak every December–January?',
      opts:['Ski resort tap water','Fondue Chinoise raw poultry cross-contamination','Dry winter indoor air','Imported citrus'], ans:1,
      exp:'BAG surveillance famously shows a Dec/Jan "Fondue Chinoise" spike in Campylobacter alongside the summer BBQ peak.' },
    { cat:'ANRESIS Resistance', q:'How do Swiss MRSA and E. coli ESBL resistance rates compare across language regions?',
      opts:['Identical nationwide','Higher in German-speaking CH','Higher in French- & Italian-speaking CH','Only seen in Zurich/Basel'], ans:2,
      exp:'ANRESIS documents a clear Röstigraben: French- and Italian-speaking cantons have higher outpatient antibiotic consumption and higher MRSA (~8.5% vs ~3.5%) & ESBL rates.' },
    { cat:'GBD Disability', q:'Which condition is the #1 cause of Years Lived with Disability (YLD) in Switzerland?',
      opts:['Ischemic Heart Disease','Low Back & Neck Pain','COPD','Type 2 Diabetes'], ans:1,
      exp:'Musculoskeletal pain (low back/neck pain) and depressive/anxiety disorders dominate Swiss YLD despite causing virtually zero direct mortality.' },
    { cat:'BFS Hospital Stats', q:'Which inpatient diagnostic group has by far the longest mean length of stay (>30 days) in Switzerland?',
      opts:['Acute Myocardial Infarction','Inpatient Depression & Bipolar','Hip Arthroplasty','Community-Acquired Pneumonia'], ans:1,
      exp:'Inpatient psychiatric stays for affective disorders average >33 days in Switzerland, compared to ~4–5 days for MI or arthroplasty.' },
    { cat:'Prevalence Order', q:'Roughly how many times more prevalent is Arterial Hypertension than Pheochromocytoma in Switzerland?',
      opts:['~10×','~100×','~1,000×','~50,000×'], ans:3,
      exp:'Hypertension affects ~22,000/100k (~1 in 4.5 adults) while pheochromocytoma has an incidence of ~0.4/100k — over 50,000× rarer!' },
    { cat:'Bayesian Base Rate', q:'A 95% sensitive, 95% specific test is used to screen a population with 0.5% prevalence. Approximate PPV?',
      opts:['~95%','~50%','~9%','~0.5%'], ans:2,
      exp:'Per 10,000 tested: 47.5 TP vs 497.5 FP -> PPV ≈ 8.7%. Over 91% of positives are false positives at low base rates.' },
    { cat:'BFS Trends', q:'Since 1970, age-standardized Ischemic Heart Disease mortality in Switzerland has changed by roughly:',
      opts:['Increased +25%','Stayed flat','Fallen ~30%','Fallen nearly 80%'], ans:3,
      exp:'Age-standardized IHD mortality fell from ~218 to ~46/100k in men (~79% drop) due to PCI, statins, BP control, and lower smoking.' },
    { cat:'VMüK Meldepflicht', q:'You diagnose invasive Meningococcal meningitis. When must you notify the Kantonsarzt?',
      opts:['Within 24 hours','Within 1 week','Only after culture confirms','Not notifiable'], ans:0,
      exp:'24-hour MD + lab reporting ensures close contacts receive immediate Rifampicin/Cipro chemoprophylaxis.' },
    { cat:'Swiss Prevention', q:'Which Swiss canton is the ONLY canton currently NOT designated as a general BAG TBE (FSME) vaccine risk zone?',
      opts:['Graubünden','Valais','Ticino','Geneva'], ans:2,
      exp:'All of Switzerland except Ticino is classified by BAG as a TBE vaccination risk region.' },
    { cat:'NKRS Oncology', q:'What is the approximate 5-year relative survival for Pancreatic Cancer vs. Melanoma in Switzerland?',
      opts:['11% vs 93%','35% vs 65%','50% vs 85%','5% vs 55%'], ans:0,
      exp:'NKRS data shows extreme contrast: Melanoma achieves ~93% 5-year relative survival in Switzerland, whereas Pancreatic Cancer sits at ~11%.' },
  ];

})(window.EPI_DATA);
