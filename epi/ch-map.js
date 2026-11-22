/* ============================================================================
   MedLab Epidemiology — Step 3: 26-Canton Swiss SVG Map & Cantonal Datasets
   File: epi/ch-map.js
   Sources: BAG (TBE/FSME), ANRESIS (Antibiotic Use / Resistance),
            Swiss Cancer Screening (Organized Mammography), BFS (Life Exp.)
   ============================================================================ */
window.EPI_DATA = window.EPI_DATA || {};

(function (E) {
  'use strict';

  // Shared-vertex geographic topology (viewBox 0 0 800 520, CH1903 aspect ratio)
  const V = {
    ge_sw:[40,412], ge_w:[46,386], ge_n:[74,376], ge_e:[84,398], ge_s:[62,418],
    vd_w1:[46,336], vd_nw:[82,272], vd_ne_w:[130,232], vd_s1:[130,366],
    ne_nw:[148,188], ne_ju_w:[176,152],
    ju_nw:[192,114], ju_n:[238,108], ju_bl_n:[268,114],
    bl_bs_w:[288,92], bs_n:[308,76], bs_e:[322,88], bs_s:[304,104], bl_ag_n:[338,96],
    ag_n1:[376,86], ag_zh_n:[426,82],
    zh_sh_w:[444,74], sh_nw:[452,46], sh_ne:[488,42], sh_tg_e:[494,72],
    tg_n1:[542,74], tg_sg_n:[600,102],
    sg_ne:[622,112], sg_e1:[616,156], sg_gr_e:[614,198],
    gr_ne:[684,210], gr_e1:[754,232], gr_e2:[768,286], gr_se:[724,326],
    gr_s1:[656,334], gr_s2:[586,356], gr_ti_s:[556,388],
    ti_se:[548,456], ti_s:[530,490], ti_sw:[492,454], ti_w:[468,402], ti_vs_w:[446,360],
    vs_se:[408,422], vs_s1:[342,462], vs_sw:[262,460], vs_w1:[196,434], vs_vd_w:[184,392],

    // Internal cantonal junctions
    vd_ne_fr:[184,248], vd_fr_mid:[196,294], vd_fr_be:[212,334], vd_be_vs:[240,368],
    ne_be_ju:[216,166], ne_fr_be:[206,224], fr_be_e:[248,266],
    ju_so_be:[260,152], ju_bl_so:[278,134], bl_so_ag:[332,130], so_be_ag:[330,164], so_be_w:[284,186],
    be_ag_lu:[358,186], be_lu_ow:[376,250], be_ow_nw:[408,274], ow_nw_mid:[422,254],
    be_nw_ur:[436,282], be_ur_vs:[422,326], vs_ur_ti:[454,332],
    ur_ti_gr:[494,316], ur_gl_gr:[518,272], ur_sz_gl:[496,232], ur_nw_sz:[454,236],
    lu_nw_ow:[414,234], lu_nw_sz:[436,222], lu_sz_zg:[434,198], lu_ag_zg:[418,174],
    ag_zg_zh:[428,158], zg_zh_sz:[468,178], zh_sz_sg:[508,178], sz_gl_sg:[522,204],
    gl_sg_gr:[556,240], zh_tg_sg:[516,134], zh_sh_tg:[478,86],
    ar1:[552,130], ar2:[598,120], ar3:[604,138], ar4:[576,144], ar5:[560,154],
    ai3:[602,162], ai4:[574,160],
  };

  function poly(keys) {
    return 'M' + keys.map(k => V[k][0] + ',' + V[k][1]).join('L') + 'Z';
  }

  E.CH_MAP = {
    viewBox: '0 0 800 520',
    lakes: [
      // Lac Léman, Lac de Neuchâtel, Bodensee, Vierwaldstättersee (subtle orientation cues)
      'M80,394 Q124,358 182,388 Q144,394 84,402 Z',
      'M138,242 Q166,226 190,224 Q176,248 144,256 Z',
      'M530,70 Q575,64 612,98 Q574,94 528,78 Z',
    ],
  };

  E.MAP_LAYERS = {
    tbe: {
      id: 'tbe',
      label: 'TBE / FSME Incidence',
      unit: '/100k/yr',
      sub: 'BAG Tick-Borne Encephalitis incidence & vaccine risk zones (Ticino is the ONLY non-risk canton).',
      min: 0, max: 14,
      legend: ['0 (Low / Non-risk)', '4', '8', '14+ (High Endemic)'],
      ramp: 'tealRose',
      fmt: v => v.toFixed(1) + ' / 100k',
    },
    abx: {
      id: 'abx',
      label: 'Antibiotic Use (Röstigraben)',
      unit: 'DID',
      sub: 'ANRESIS outpatient consumption (DDD per 1,000 inh./day) — tracks regional MRSA & ESBL resistance.',
      min: 6.5, max: 14.5,
      legend: ['7 DID (Low)', '9.5', '12', '14+ DID (High)'],
      ramp: 'amberRose',
      fmt: v => v.toFixed(1) + ' DID',
    },
    screen: {
      id: 'screen',
      label: 'Mammography Programs',
      unit: 'Program',
      sub: 'Organized cantonal breast cancer screening (q2y ages 50–74, exempt from deductible) vs opportunistic only.',
      min: 0, max: 1,
      legend: ['Opportunistic only', 'Organized Program'],
      ramp: 'binary',
      fmt: v => v === 1 ? 'Organized Program' : 'Opportunistic Only',
    },
    life: {
      id: 'life',
      label: 'Life Expectancy (BFS)',
      unit: 'years',
      sub: 'Combined life expectancy at birth by canton (Swiss average ~84.0 years; highest in Europe).',
      min: 82.6, max: 85.4,
      legend: ['82.8 y', '83.6 y', '84.4 y', '85.2+ y'],
      ramp: 'emerald',
      fmt: v => v.toFixed(1) + ' y',
    },
  };

  // All 26 Swiss cantons (order ensures BS sits above BL, and AR/AI sit above SG)
  E.CANTONS = [
    { id:'GE', name:'Genève', lang:'FR', pop:524, lx:60, ly:397, tbe:1.8, abx:13.8, mrsa:10.2, screen:1, life:84.8,
      d: poly(['ge_sw','ge_w','ge_n','ge_e','ge_s']),
      note:'Urban Romandie profile: highest outpatient antibiotic use & MRSA rate (~10%), high life expectancy, organized mammography & CRC programs.' },
    { id:'VD', name:'Vaud', lang:'FR', pop:845, lx:136, ly:306, tbe:4.6, abx:12.4, mrsa:8.6, screen:1, life:84.6,
      d: poly(['ge_n','vd_w1','vd_nw','vd_ne_w','vd_ne_fr','vd_fr_mid','vd_fr_be','vd_be_vs','vs_vd_w','vd_s1','ge_e']),
      note:'Pioneer of Swiss cantonal breast & CRC screening programs; moderate TBE around Lac de Neuchâtel & Broye; Romandie ANRESIS resistance pattern.' },
    { id:'VS', name:'Valais / Wallis', lang:'FR/DE', pop:365, lx:312, ly:406, tbe:2.9, abx:12.8, mrsa:8.4, screen:1, life:84.2,
      d: poly(['vs_vd_w','vd_be_vs','be_ur_vs','vs_ur_ti','ti_vs_w','vs_se','vs_s1','vs_sw','vs_w1']),
      note:'TBE risk concentrated in Rhone valley floor (<1,500 m); high alpine trauma volume; organized breast screening program.' },
    { id:'NE', name:'Neuchâtel', lang:'FR', pop:178, lx:178, ly:200, tbe:5.2, abx:12.6, mrsa:8.2, screen:1, life:83.2,
      d: poly(['vd_ne_w','ne_nw','ne_ju_w','ne_be_ju','ne_fr_be','vd_ne_fr']),
      note:'Jura foothills with steady TBE incidence; Romandie antibiotic consumption profile; organized mammography program.' },
    { id:'FR', name:'Fribourg / Freiburg', lang:'FR/DE', pop:342, lx:213, ly:276, tbe:5.8, abx:11.6, mrsa:7.4, screen:1, life:84.3,
      d: poly(['vd_ne_fr','ne_fr_be','fr_be_e','vd_fr_be','vd_fr_mid']),
      note:'Bilingual canton straddling the Röstigraben; active organized breast & CRC screening; moderate–high TBE endemicity.' },
    { id:'JU', name:'Jura', lang:'FR', pop:75, lx:224, ly:135, tbe:4.4, abx:12.9, mrsa:8.0, screen:1, life:82.9,
      d: poly(['ne_ju_w','ju_nw','ju_n','ju_bl_n','ju_bl_so','ju_so_be','ne_be_ju']),
      note:'Rural Jura canton; organized mammography & CRC programs; higher Romandie antibiotic use pattern.' },
    { id:'BE', name:'Bern / Berne', lang:'DE/FR', pop:1064, lx:312, ly:268, tbe:7.6, abx:8.6, mrsa:3.8, screen:1, life:83.9,
      d: poly(['ne_be_ju','ju_so_be','so_be_w','so_be_ag','be_ag_lu','be_lu_ow','be_ow_nw','be_nw_ur','be_ur_vs','vd_be_vs','vd_fr_be','fr_be_e','ne_fr_be']),
      note:'2nd most populous canton (Inselspital tertiary hub); high TBE incidence across Seeland/Aare/Emmental; organized mammography & CRC screening; low MRSA (~3.8%).' },
    { id:'SO', name:'Solothurn', lang:'DE', pop:286, lx:298, ly:160, tbe:7.2, abx:8.9, mrsa:3.6, screen:1, life:83.4,
      d: poly(['ju_so_be','ju_bl_so','bl_so_ag','so_be_ag','so_be_w']),
      note:'Mittelland corridor with elevated TBE & Lyme density; low German-CH antibiotic consumption; joined organized breast screening.' },
    { id:'BL', name:'Basel-Landschaft', lang:'DE', pop:298, lx:310, ly:118, tbe:5.4, abx:8.8, mrsa:4.1, screen:0, life:84.2,
      d: poly(['ju_bl_n','bl_bs_w','bs_n','bs_e','bl_ag_n','bl_so_ag','ju_bl_so']),
      note:'Suburban Basel region; moderate–high tick exposure in Jura forests; opportunistic breast screening (unlike BS).' },
    { id:'BS', name:'Basel-Stadt', lang:'DE', pop:200, lx:305, ly:92, tbe:2.6, abx:9.8, mrsa:4.9, screen:1, life:83.7,
      d: poly(['bl_bs_w','bs_n','bs_e','bs_s']),
      note:'Dense urban border canton; organized mammography & CRC screening programs; higher STI reporting per 100k than rural cantons.' },
    { id:'AG', name:'Aargau', lang:'DE', pop:726, lx:382, ly:136, tbe:8.9, abx:8.4, mrsa:3.4, screen:0, life:84.0,
      d: poly(['bl_ag_n','ag_n1','ag_zh_n','ag_zg_zh','lu_ag_zg','be_ag_lu','so_be_ag','bl_so_ag']),
      note:'High TBE hotspot along Aare/Reuss/Limmat rivers; low antibiotic use & low MRSA; no organized cantonal mammography program yet.' },
    { id:'LU', name:'Luzern', lang:'DE', pop:432, lx:400, ly:212, tbe:9.4, abx:7.8, mrsa:3.1, screen:0, life:84.2,
      d: poly(['be_ag_lu','lu_ag_zg','lu_sz_zg','lu_nw_sz','lu_nw_ow','be_lu_ow']),
      note:'Central Swiss TBE hotspot; very low outpatient antibiotic consumption & low MRSA (~3.1%); opportunistic cancer screening.' },
    { id:'OW', name:'Obwalden', lang:'DE', pop:39, lx:401, ly:254, tbe:8.5, abx:7.4, mrsa:2.8, screen:0, life:84.6,
      d: poly(['be_lu_ow','lu_nw_ow','ow_nw_mid','be_ow_nw']),
      note:'Small central alpine canton; high TBE per 100k in valley forests; among lowest antibiotic consumption in Switzerland.' },
    { id:'NW', name:'Nidwalden', lang:'DE', pop:45, lx:431, ly:252, tbe:9.2, abx:7.3, mrsa:2.9, screen:0, life:84.8,
      d: poly(['lu_nw_ow','lu_nw_sz','ur_nw_sz','be_nw_ur','be_ow_nw','ow_nw_mid']),
      note:'High life expectancy (~84.8 y) & very low antimicrobial resistance; Lake Lucerne foothills are TBE endemic.' },
    { id:'UR', name:'Uri', lang:'DE', pop:38, lx:472, ly:282, tbe:8.8, abx:7.5, mrsa:3.0, screen:0, life:84.1,
      d: poly(['be_nw_ur','ur_nw_sz','ur_sz_gl','ur_gl_gr','ur_ti_gr','vs_ur_ti','be_ur_vs']),
      note:'Gotthard corridor canton; Reuss valley floor (<1,500 m) is TBE-endemic; low antibiotic use & low MRSA (~3.0%).' },
    { id:'SZ', name:'Schwyz', lang:'DE', pop:167, lx:478, ly:208, tbe:10.4, abx:7.9, mrsa:3.2, screen:0, life:84.5,
      d: poly(['lu_sz_zg','zg_zh_sz','zh_sz_sg','sz_gl_sg','ur_sz_gl','ur_nw_sz','lu_nw_sz']),
      note:'High TBE endemicity across pre-alpine valleys; low antibiotic use & favorable cardiovascular longevity.' },
    { id:'ZG', name:'Zug', lang:'DE', pop:132, lx:442, ly:178, tbe:7.8, abx:8.1, mrsa:3.3, screen:0, life:85.2,
      d: poly(['ag_zg_zh','zg_zh_sz','lu_sz_zg','lu_ag_zg']),
      note:'Highest cantonal life expectancy in Switzerland (~85.2 y); low MRSA/ESBL resistance; TBE risk zone.' },
    { id:'ZH', name:'Zürich', lang:'DE', pop:1605, lx:468, ly:132, tbe:7.4, abx:8.9, mrsa:4.2, screen:0, life:84.4,
      d: poly(['ag_zh_n','zh_sh_w','zh_sh_tg','zh_tg_sg','zh_sz_sg','zg_zh_sz','ag_zg_zh']),
      note:'Most populous canton (~1.6M); high urban STI incidence (Chlamydia/Gonorrhea/Syphilis); TBE endemic in surrounding forests; no organized mammography program.' },
    { id:'SH', name:'Schaffhausen', lang:'DE', pop:87, lx:470, ly:62, tbe:13.2, abx:8.5, mrsa:3.5, screen:0, life:83.3,
      d: poly(['zh_sh_w','sh_nw','sh_ne','sh_tg_e','zh_sh_tg']),
      note:'Historically among the highest TBE/FSME incidence cantons per 100k in Switzerland; strong vaccine uptake.' },
    { id:'TG', name:'Thurgau', lang:'DE', pop:295, lx:536, ly:98, tbe:13.8, abx:8.0, mrsa:3.1, screen:1, life:83.8,
      d: poly(['zh_sh_tg','sh_tg_e','tg_n1','tg_sg_n','zh_tg_sg']),
      note:'Top Swiss TBE/FSME hotspot (~13–14/100k); low antibiotic consumption; participates in Eastern CH organized mammography program (donna).' },
    { id:'GL', name:'Glarus', lang:'DE', pop:42, lx:524, ly:236, tbe:7.9, abx:8.2, mrsa:3.3, screen:0, life:83.1,
      d: poly(['ur_sz_gl','sz_gl_sg','gl_sg_gr','ur_gl_gr']),
      note:'Alpine valley with notable TBE risk at lower elevations; low German-CH antimicrobial resistance.' },
    { id:'SG', name:'St. Gallen', lang:'DE', pop:535, lx:542, ly:180, tbe:10.8, abx:8.1, mrsa:3.4, screen:1, life:83.9,
      d: poly(['zh_tg_sg','tg_sg_n','sg_ne','sg_e1','sg_gr_e','gl_sg_gr','sz_gl_sg','zh_sz_sg']),
      note:'High Eastern Swiss TBE incidence (especially Rhine valley & Toggenburg); runs the donna organized breast screening program.' },
    { id:'AR', name:'Appenzell A.Rh.', lang:'DE', pop:56, lx:574, ly:135, tbe:9.8, abx:7.2, mrsa:2.9, screen:0, life:84.1,
      d: poly(['ar1','ar2','ar3','ar4','ar5']),
      note:'Very low outpatient antibiotic use (~7.2 DID); elevated TBE exposure in forested foothills.' },
    { id:'AI', name:'Appenzell I.Rh.', lang:'DE', pop:16.5, lx:589, ly:152, tbe:9.5, abx:7.0, mrsa:2.7, screen:0, life:84.3,
      d: poly(['ar4','ar3','ai3','ai4']),
      note:'Smallest Swiss canton (~16.5k); lowest outpatient antibiotic consumption & MRSA rates in Switzerland.' },
    { id:'GR', name:'Graubünden', lang:'DE/RM/IT', pop:204, lx:638, ly:284, tbe:4.9, abx:8.3, mrsa:3.7, screen:1, life:84.2,
      d: poly(['gl_sg_gr','sg_gr_e','gr_ne','gr_e1','gr_e2','gr_se','gr_s1','gr_s2','gr_ti_s','ur_ti_gr','ur_gl_gr']),
      note:'Largest canton by area; TBE risk mainly in Rhine valley / Prättigau (<1,500 m); participates in donna organized mammography program.' },
    { id:'TI', name:'Ticino', lang:'IT', pop:358, lx:510, ly:410, tbe:0.1, abx:13.4, mrsa:9.4, screen:1, life:85.0,
      d: poly(['vs_ur_ti','ur_ti_gr','gr_ti_s','ti_se','ti_s','ti_sw','ti_w','ti_vs_w']),
      note:'KEY EXAM FACT: ONLY Swiss canton NOT designated a BAG TBE risk zone! Also shows highest Italian-CH antibiotic use/MRSA (~9.4%), organized breast screening, and top-2 longevity (~85.0 y).' },
  ];

})(window.EPI_DATA);
