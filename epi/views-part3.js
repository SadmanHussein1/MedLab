/* ============================================================================
   MedLab Epidemiology — Step 6: Tab 5 (BAG/ANRESIS) & Tab 6 (Bayes & Quiz)
   File: epi/views-part3.js
   ============================================================================ */
window.EPI_VIEWS = window.EPI_VIEWS || {};

(function (V) {
  'use strict';

  /* ==========================================================================
     TAB 5: BAG 12-MONTH SEASONALITY HEATMAP & ANRESIS RESISTANCE MATRIX
     ========================================================================== */
  const INF = {
    cat: 'all',
    selectedId: 'campy',
    anresisRegion: 'de', // 'de' | 'lat' | 'diff'
    selectedPathogen: 'ecoli',
  };

  const CAT_LABELS = [
    ['all', 'All (22)'],
    ['resp', 'Respiratory'],
    ['food', 'Food / GI'],
    ['vector', 'Tick / Vector'],
    ['sti', 'STI'],
    ['vax', 'Vaccine-Prev.'],
    ['import', 'Travel / Rare'],
  ];

  function urgencyBadge(u, melde) {
    if (u === 1) return `<span class="font-mono text-[9.5px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 whitespace-nowrap">${melde}</span>`;
    if (u === 2) return `<span class="font-mono text-[9.5px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 whitespace-nowrap">${melde}</span>`;
    if (u === 3) return `<span class="font-mono text-[9.5px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 whitespace-nowrap">${melde}</span>`;
    return `<span class="font-mono text-[9.5px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/25 whitespace-nowrap">${melde}</span>`;
  }

  function heatColor(v, cat, isDark) {
    const a = Math.max(0.06, Math.min(0.95, v));
    if (cat === 'vector') return isDark ? `rgba(16,185,129,${a.toFixed(2)})` : `rgba(5,150,105,${a.toFixed(2)})`;
    if (cat === 'resp')   return isDark ? `rgba(56,189,248,${a.toFixed(2)})` : `rgba(2,132,199,${a.toFixed(2)})`;
    if (cat === 'food')   return isDark ? `rgba(245,158,11,${a.toFixed(2)})` : `rgba(217,119,6,${a.toFixed(2)})`;
    if (cat === 'sti')    return isDark ? `rgba(168,85,247,${a.toFixed(2)})` : `rgba(147,51,234,${a.toFixed(2)})`;
    return isDark ? `rgba(45,212,191,${a.toFixed(2)})` : `rgba(15,118,110,${a.toFixed(2)})`;
  }

  function resColor(pct, isDiff, isDark) {
    if (pct === null || pct === undefined) return isDark ? 'rgba(39,39,42,0.45)' : 'rgba(244,244,245,0.9)';
    if (isDiff) {
      if (pct >= 5) return 'rgba(244,63,94,0.30)';
      if (pct >= 2) return 'rgba(245,158,11,0.26)';
      if (pct > 0)  return 'rgba(245,158,11,0.12)';
      return isDark ? 'rgba(39,39,42,0.5)' : 'rgba(244,244,245,0.9)';
    }
    if (pct >= 50) return 'rgba(225,29,72,0.34)';
    if (pct >= 20) return 'rgba(244,63,94,0.24)';
    if (pct >= 10) return 'rgba(245,158,11,0.24)';
    if (pct >= 3)  return 'rgba(234,179,8,0.14)';
    return 'rgba(16,185,129,0.18)';
  }

  function inspectPathogen(APP, E, p) {
    if (!p) return;
    INF.selectedId = p.id;
    const peakIdx = p.season.indexOf(Math.max(...p.season));
    APP.setInspector({
      badge: `BAG Surveillance · ${p.melde}`,
      title: p.name,
      sub: `~${APP.fmtNum(p.cases)} cases/yr (${p.inc}/100k) · Trend: ${p.trend} · Peak: ${E.MONTHS[peakIdx]}`,
      sections: [
        { label: 'Swiss Epidemiological Pearl', text: p.pearl },
        { label: 'First-Line Clinical Management', text: p.tx },
        { label: 'VMüK Reporting Tier', text: p.urgency === 1 ? '2-hour TELEPHONE report on clinical suspicion!' : p.urgency === 2 ? '24-hour notification to Kantonsarzt.' : p.urgency === 3 ? 'Standard 1-week lab/physician reporting.' : 'Sentinella sentinel GP surveillance (no individual report).' },
      ],
      links: [{ label: 'PharmaLab', href: 'pharma.html' }],
      anki: `BAG Surveillance — {{c1::${p.name}}}: ~{{c2::${APP.fmtNum(p.cases)}/yr}} (${p.inc}/100k), Meldepflicht: {{c3::${p.melde}}}. Pearl: ${p.pearl}`,
      bayesRate: Math.min(0.5, Math.max(0.0002, p.inc / 100000)),
      bayesLabel: `${p.name} (${p.inc}/100k)`,
    });
    renderHeatmap(APP, E);
  }

  function renderCategoryButtons(APP, E) {
    const box = APP.el('inf-cat-btns');
    if (!box) return;
    box.innerHTML = CAT_LABELS.map(([k, lbl]) => `
      <button type="button" data-cat="${k}" class="inf-cat-btn px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
        INF.cat === k
          ? 'bg-teal-500/15 border-teal-500/45 text-tealLight dark:text-tealDark font-semibold'
          : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
      }">${lbl}</button>
    `).join('');
    box.querySelectorAll('.inf-cat-btn').forEach(b => {
      b.addEventListener('click', () => {
        INF.cat = b.dataset.cat;
        renderCategoryButtons(APP, E);
        renderHeatmap(APP, E);
      });
    });
  }

  function renderHeatmap(APP, E) {
    const box = APP.el('inf-heatmap');
    if (!box) return;
    const isDark = APP.palette().dark;
    const list = E.BAG_INFECTIOUS.filter(p => INF.cat === 'all' || p.cat === INF.cat);

    box.innerHTML = `
      <table class="w-full text-left border-collapse text-xs">
        <thead>
          <tr class="border-b border-zinc-200 dark:border-zinc-800 font-mono text-[9.5px] uppercase tracking-wider text-zinc-400">
            <th class="py-2 pr-2 min-w-[165px]">Pathogen</th>
            <th class="py-2 px-1.5 text-right">Cases/yr</th>
            <th class="py-2 px-1.5">VMüK</th>
            ${E.MONTHS.map(m => `<th class="py-2 px-0.5 text-center w-6">${m[0]}</th>`).join('')}
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
          ${list.map(p => {
            const sel = p.id === INF.selectedId;
            return `
              <tr data-pid="${p.id}" class="inf-row cursor-pointer transition-colors ${sel ? 'bg-teal-500/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50'}">
                <td class="py-1.5 pr-2 font-medium ${sel ? 'text-tealLight dark:text-tealDark' : 'text-zinc-900 dark:text-zinc-100'}">${APP.esc(p.name)}</td>
                <td class="py-1.5 px-1.5 text-right font-mono text-[11px] tabular-nums text-zinc-600 dark:text-zinc-300">${APP.fmtNum(p.cases)}</td>
                <td class="py-1.5 px-1.5">${urgencyBadge(p.urgency, p.melde)}</td>
                ${p.season.map((v, mi) => `
                  <td class="py-1 px-0.5">
                    <div class="w-full h-4 rounded-[3px]" style="background:${heatColor(v, p.cat, isDark)}" title="${p.name} · ${E.MONTHS[mi]}: ${Math.round(v * 100)}% of peak"></div>
                  </td>
                `).join('')}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    box.querySelectorAll('.inf-row').forEach(row => {
      row.addEventListener('click', () => {
        const p = E.BAG_INFECTIOUS.find(x => x.id === row.dataset.pid);
        inspectPathogen(APP, E, p);
      });
    });
  }

  function renderAnresisControls(APP, E) {
    const box = APP.el('anresis-region-btns');
    if (!box) return;
    const modes = [
      ['de', 'German CH'],
      ['lat', 'Romandie / Ticino'],
      ['diff', 'Δ Röstigraben'],
    ];
    box.innerHTML = modes.map(([k, lbl]) => `
      <button type="button" data-reg="${k}" class="anr-reg-btn px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
        INF.anresisRegion === k
          ? 'bg-white dark:bg-zinc-800 text-tealLight dark:text-tealDark font-semibold shadow-sm'
          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
      }">${lbl}</button>
    `).join('');
    box.querySelectorAll('.anr-reg-btn').forEach(b => {
      b.addEventListener('click', () => {
        INF.anresisRegion = b.dataset.reg;
        renderAnresisControls(APP, E);
        renderAnresisTable(APP, E);
      });
    });
  }

  function renderAnresisTable(APP, E) {
    const box = APP.el('anresis-table');
    if (!box) return;
    const isDark = APP.palette().dark;
    const isDiff = INF.anresisRegion === 'diff';

    box.innerHTML = `
      <table class="w-full text-left border-collapse text-xs">
        <thead>
          <tr class="border-b border-zinc-200 dark:border-zinc-800 font-mono text-[9.5px] uppercase tracking-wider text-zinc-400">
            <th class="py-2 pr-2 min-w-[150px]">Invasive Pathogen</th>
            ${E.ANRESIS_DRUGS.map(d => `<th class="py-2 px-1.5 text-center">${d}</th>`).join('')}
            <th class="py-2 pl-2 hidden sm:table-cell">CH Trend</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
          ${E.ANRESIS_MATRIX.map(row => {
            const vals = isDiff
              ? row.de.map((v, i) => (v === null || row.lat[i] === null) ? null : +(row.lat[i] - v).toFixed(1))
              : row[INF.anresisRegion];
            const sel = row.id === INF.selectedPathogen;
            return `
              <tr data-aid="${row.id}" class="anr-row cursor-pointer transition-colors ${sel ? 'bg-teal-500/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50'}">
                <td class="py-2 pr-2 font-medium text-zinc-900 dark:text-zinc-100">${APP.esc(row.pathogen)}</td>
                ${vals.map(v => `
                  <td class="py-1.5 px-1 text-center font-mono text-[11px] tabular-nums">
                    <div class="py-1 px-1 rounded" style="background:${resColor(v, isDiff, isDark)}">
                      ${v === null ? '<span class="text-zinc-400">—</span>' : (isDiff ? (v > 0 ? '+' + v + '%' : v + '%') : v + '%')}
                    </div>
                  </td>
                `).join('')}
                <td class="py-2 pl-2 font-mono text-[10.5px] text-zinc-500 hidden sm:table-cell">${APP.esc(row.trend)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    box.querySelectorAll('.anr-row').forEach(tr => {
      tr.addEventListener('click', () => {
        const row = E.ANRESIS_MATRIX.find(x => x.id === tr.dataset.aid);
        if (!row) return;
        INF.selectedPathogen = row.id;
        renderAnresisTable(APP, E);
        const extra = row.mrsaDe !== undefined
          ? `MRSA share: ~${row.mrsaDe}% (German CH) vs ~${row.mrsaLat}% (Romandie/Ticino).`
          : row.penDe !== undefined
            ? `Penicillin non-susceptible: ~${row.penDe}% (German CH) vs ~${row.penLat}% (Romandie/Ticino).`
            : 'Values show % resistant invasive isolates (blood/CSF) in ANRESIS surveillance.';
        APP.setInspector({
          badge: 'ANRESIS Swiss Resistance',
          title: row.pathogen,
          sub: row.trend,
          sections: [
            { label: 'Regional & Clinical Pearl', text: row.pearl },
            { label: 'Key Metric', text: extra },
          ],
          links: [{ label: 'PharmaLab', href: 'pharma.html' }],
          anki: `ANRESIS Switzerland — {{c1::${row.pathogen}}}: {{c2::${row.trend}}}. Pearl: ${row.pearl}`,
        });
      });
    });
  }

  V.infectious = {
    init() {},
    render(APP, E) {
      renderCategoryButtons(APP, E);
      renderHeatmap(APP, E);
      renderAnresisControls(APP, E);
      renderAnresisTable(APP, E);
      APP.updateKPI('ANRESIS E. coli', '10% vs 14% ESBL', 'German vs. Latin CH');
    },
    redraw(APP, E) {
      renderHeatmap(APP, E);
      renderAnresisTable(APP, E);
    },
  };

  /* ==========================================================================
     TAB 6: BAYESIAN PPV/NPV LAB & SWISS BASE-RATE QUIZ
     ========================================================================== */
  const LAB = {
    prev: 0.01,   // 1.0% default
    sens: 0.92,
    spec: 0.95,
    label: 'Custom / Screening Scenario',
    quizDeck: [],
    qIdx: 0,
    qScore: 0,
    qStreak: 0,
    qAnswered: false,
  };

  const PRESET_SCENARIOS = [
    { key: 'flu_oct', label: 'Rapid Flu Test — October (Prev 1.0%)', prev: 0.01, sens: 0.72, spec: 0.98 },
    { key: 'flu_jan', label: 'Rapid Flu Test — January Peak (Prev 32%)', prev: 0.32, sens: 0.72, spec: 0.98 },
    { key: 'ddimer_lo', label: 'D-Dimer — Low Wells PE (Prev 3.0%)', prev: 0.03, sens: 0.96, spec: 0.48 },
    { key: 'mammo', label: 'Screening Mammography — Age 55 (Prev 0.6%)', prev: 0.006, sens: 0.87, spec: 0.91 },
    { key: 'hiv_scr', label: '4th-Gen HIV Combo — General CH (Prev 0.2%)', prev: 0.002, sens: 0.997, spec: 0.995 },
    { key: 'pheo_gp', label: 'Plasma Metanephrines — Unselected HTN (Prev 0.2%)', prev: 0.002, sens: 0.97, spec: 0.93 },
  ];

  // Log mapping for prevalence slider [0..1000] <-> [0.0002 (0.02%) .. 0.80 (80%)]
  const P_LOG_MIN = Math.log10(0.0002);
  const P_LOG_MAX = Math.log10(0.80);
  const sliderToPrev = s => Math.pow(10, P_LOG_MIN + (s / 1000) * (P_LOG_MAX - P_LOG_MIN));
  const prevToSlider = p => Math.round(((Math.log10(Math.max(0.0002, Math.min(0.80, p))) - P_LOG_MIN) / (P_LOG_MAX - P_LOG_MIN)) * 1000);

  function fmtPct(p) {
    const v = p * 100;
    if (v < 0.1) return v.toFixed(3) + '%';
    if (v < 1) return v.toFixed(2) + '%';
    if (v < 10) return v.toFixed(1) + '%';
    return v.toFixed(1) + '%';
  }

  function updateBayesian(APP) {
    const p = LAB.prev, se = LAB.sens, sp = LAB.spec;
    const tp = p * se;
    const fn = p * (1 - se);
    const fp = (1 - p) * (1 - sp);
    const tn = (1 - p) * sp;
    const ppv = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const npv = (tn + fn) > 0 ? tn / (tn + fn) : 0;
    const lrp = (1 - sp) > 0 ? se / (1 - sp) : 999;
    const lrn = sp > 0 ? (1 - se) / sp : 0;

    const setT = (id, v) => { const el = APP.el(id); if (el) el.textContent = v; };
    setT('bayes-prev-val', fmtPct(p));
    setT('bayes-sens-val', (se * 100).toFixed(1) + '%');
    setT('bayes-spec-val', (sp * 100).toFixed(1) + '%');
    setT('bayes-ppv', fmtPct(ppv));
    setT('bayes-npv', fmtPct(npv));
    setT('bayes-lrp', lrp >= 100 ? lrp.toFixed(0) : lrp.toFixed(1));
    setT('bayes-lrn', lrn.toFixed(3));

    const N = 10000;
    const b2x2 = APP.el('bayes-2x2');
    if (b2x2) {
      b2x2.innerHTML = `
        <div class="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-2 text-center">
          <div class="font-mono text-[9.5px] uppercase text-emerald-700 dark:text-emerald-400">True Pos</div>
          <div class="font-mono text-sm font-semibold text-zinc-950 dark:text-white tabular-nums">${(tp * N).toFixed(1)}</div>
        </div>
        <div class="rounded-lg border border-amber-500/25 bg-amber-500/10 p-2 text-center">
          <div class="font-mono text-[9.5px] uppercase text-amber-700 dark:text-amber-300">False Pos</div>
          <div class="font-mono text-sm font-semibold text-zinc-950 dark:text-white tabular-nums">${(fp * N).toFixed(1)}</div>
        </div>
        <div class="rounded-lg border border-rose-500/25 bg-rose-500/10 p-2 text-center">
          <div class="font-mono text-[9.5px] uppercase text-rose-600 dark:text-rose-400">False Neg</div>
          <div class="font-mono text-sm font-semibold text-zinc-950 dark:text-white tabular-nums">${(fn * N).toFixed(1)}</div>
        </div>
        <div class="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-2 text-center">
          <div class="font-mono text-[9.5px] uppercase text-zinc-500">True Neg</div>
          <div class="font-mono text-sm font-semibold text-zinc-950 dark:text-white tabular-nums">${(tn * N).toFixed(0)}</div>
        </div>
      `;
    }

    if (APP.state.tab === 'lab') {
      APP.updateKPI('Bayesian PPV', fmtPct(ppv), `Base rate ${fmtPct(p)} · LR+ ${lrp.toFixed(1)}`);
    }
    drawBayesCanvas(APP, { tp, fp, fn, tn, ppv });
  }

  function drawBayesCanvas(APP, m) {
    const setup = APP.setupCanvas('bayes-canvas-wrap', 'bayes-canvas');
    if (!setup) return;
    const { ctx, w, h } = setup;
    const pal = APP.palette();

    const padX = 14, topY = 18;
    const barW = Math.max(80, w - padX * 2);

    // 1. Positive-Test Composition Bar (TP vs FP — instantly reveals false-positive dominance)
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillStyle = pal.muted;
    ctx.textAlign = 'left';
    ctx.fillText('AMONG ALL POSITIVE TESTS (TP vs FP)', padX, topY - 4);
    ctx.textAlign = 'right';
    ctx.fillStyle = m.ppv >= 0.5 ? '#10b981' : '#f59e0b';
    ctx.fillText(`PPV = ${fmtPct(m.ppv)}`, padX + barW, topY - 4);

    const bh = 22;
    const tpW = barW * m.ppv;
    ctx.fillStyle = '#10b981';
    if (tpW > 0.5) ctx.fillRect(padX, topY + 2, tpW, bh);
    ctx.fillStyle = '#f59e0b';
    if (barW - tpW > 0.5) ctx.fillRect(padX + tpW, topY + 2, barW - tpW, bh);

    // 2. 400-Person Natural Frequency Icon Grid (40 cols × 10 rows)
    const gridTop = topY + bh + 24;
    const gridH = Math.max(60, h - gridTop - 16);
    const cols = 40, rows = 10, totalDots = cols * rows;
    const cellW = barW / cols, cellH = gridH / rows;
    const r = Math.max(2, Math.min(cellW, cellH) * 0.34);

    ctx.font = '500 9.5px "JetBrains Mono", monospace';
    ctx.fillStyle = pal.faint;
    ctx.textAlign = 'left';
    ctx.fillText('POPULATION ICON ARRAY (400 PATIENTS: GREEN=TP · AMBER=FP · ROSE=FN · GRAY=TN)', padX, gridTop - 6);

    const nTP = Math.max(m.tp > 0 ? 1 : 0, Math.round(m.tp * totalDots));
    const nFN = Math.round(m.fn * totalDots);
    const nFP = Math.round(m.fp * totalDots);

    for (let i = 0; i < totalDots; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = padX + col * cellW + cellW / 2;
      const cy = gridTop + row * cellH + cellH / 2;

      let fill = pal.dark ? '#27272a' : '#e4e4e7';
      if (i < nTP) fill = '#10b981';
      else if (i < nTP + nFN) fill = '#f43f5e';
      else if (i < nTP + nFN + nFP) fill = '#f59e0b';

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
    }
  }

  function populateBayesSelect(APP, E) {
    const sel = APP.el('bayes-disease-select');
    if (!sel) return;
    let html = '<optgroup label="High-Yield Clinical Scenarios">';
    PRESET_SCENARIOS.forEach(s => { html += `<option value="pre:${s.key}">${APP.esc(s.label)}</option>`; });
    html += '</optgroup><optgroup label="Swiss 52-Disease Prevalence Database">';
    E.DISEASE_SPECTRUM.forEach(d => {
      const ratePct = ((d.rate / 100000) * 100);
      const fmt = ratePct < 1 ? ratePct.toFixed(2) + '%' : ratePct.toFixed(1) + '%';
      html += `<option value="dis:${d.id}">${APP.esc(d.name)} (${fmt})</option>`;
    });
    html += '</optgroup>';
    sel.innerHTML = html;
  }

  function startQuiz(APP, E) {
    LAB.quizDeck = [...E.QUIZ_BANK].sort(() => Math.random() - 0.5);
    LAB.qIdx = 0;
    LAB.qScore = 0;
    LAB.qStreak = 0;
    LAB.qAnswered = false;
    renderQuiz(APP, E);
  }

  function renderQuiz(APP, E) {
    const card = APP.el('quiz-card');
    if (!card) return;
    const total = LAB.quizDeck.length;
    const pEl = APP.el('quiz-progress'), sEl = APP.el('quiz-score'), stEl = APP.el('quiz-streak');
    if (pEl) pEl.textContent = `${Math.min(LAB.qIdx + 1, total)} / ${total}`;
    if (sEl) sEl.textContent = String(LAB.qScore);
    if (stEl) stEl.textContent = String(LAB.qStreak);

    if (LAB.qIdx >= total) {
      const pct = Math.round((LAB.qScore / total) * 100);
      card.innerHTML = `
        <div class="text-center py-5 space-y-2.5">
          <div class="font-mono text-[10px] uppercase tracking-wider text-tealLight dark:text-tealDark">Drill Complete</div>
          <div class="text-lg font-semibold text-zinc-950 dark:text-white">${LAB.qScore} / ${total} (${pct}%)</div>
          <p class="text-xs text-zinc-500">Swiss base-rate calibration complete.</p>
          <button type="button" id="quiz-again-btn" class="px-4 py-1.5 rounded-lg text-xs font-medium bg-zinc-950 text-white dark:bg-zinc-100 dark:text-obsidian">Restart Shuffled</button>
        </div>
      `;
      const again = APP.el('quiz-again-btn');
      if (again) again.addEventListener('click', () => startQuiz(APP, E));
      return;
    }

    const q = LAB.quizDeck[LAB.qIdx];
    card.innerHTML = `
      <div class="font-mono text-[10px] uppercase tracking-wider text-tealLight dark:text-tealDark">${APP.esc(q.cat)}</div>
      <p class="text-[13.5px] font-medium leading-snug text-zinc-950 dark:text-white">${APP.esc(q.q)}</p>
      <div class="grid grid-cols-1 gap-1.5">
        ${q.opts.map((opt, idx) => `
          <button type="button" data-oi="${idx}" class="q-opt text-left px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 hover:border-teal-500/50 text-xs text-zinc-800 dark:text-zinc-200 transition-colors">
            <span class="font-mono text-[10px] text-zinc-400 mr-2">${String.fromCharCode(65 + idx)}</span>${APP.esc(opt)}
          </button>
        `).join('')}
      </div>
      <div id="quiz-exp" class="hidden rounded-lg border p-2.5 text-xs leading-relaxed"></div>
      <div class="flex justify-end"><button type="button" id="quiz-next-btn" class="hidden px-3.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-950 text-white dark:bg-zinc-100 dark:text-obsidian">Next &rarr;</button></div>
    `;

    card.querySelectorAll('.q-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        if (LAB.qAnswered) return;
        LAB.qAnswered = true;
        const chosen = Number(btn.dataset.oi);
        const ok = chosen === q.ans;
        if (ok) { LAB.qScore++; LAB.qStreak++; } else { LAB.qStreak = 0; }
        if (sEl) sEl.textContent = String(LAB.qScore);
        if (stEl) stEl.textContent = String(LAB.qStreak);

        card.querySelectorAll('.q-opt').forEach(b => {
          const i = Number(b.dataset.oi);
          b.disabled = true;
          if (i === q.ans) b.className = 'q-opt text-left px-3 py-2 rounded-lg border border-emerald-500/50 bg-emerald-500/15 text-xs font-semibold text-emerald-800 dark:text-emerald-300';
          else if (i === chosen) b.className = 'q-opt text-left px-3 py-2 rounded-lg border border-rose-500/50 bg-rose-500/15 text-xs text-rose-800 dark:text-rose-300';
          else b.classList.add('opacity-45');
        });

        const exp = APP.el('quiz-exp');
        if (exp) {
          exp.className = `rounded-lg border p-2.5 text-xs leading-relaxed ${ok ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200' : 'border-rose-500/35 bg-rose-500/10 text-rose-900 dark:text-rose-200'}`;
          exp.innerHTML = `<strong>${ok ? 'Correct.' : 'Incorrect.'}</strong> ${APP.esc(q.exp)}`;
          exp.classList.remove('hidden');
        }
        const nextBtn = APP.el('quiz-next-btn');
        if (nextBtn) {
          nextBtn.classList.remove('hidden');
          nextBtn.addEventListener('click', () => { LAB.qIdx++; LAB.qAnswered = false; renderQuiz(APP, E); });
        }
      });
    });
  }

  V.lab = {
    init(APP, E) {
      populateBayesSelect(APP, E);
      const sel = APP.el('bayes-disease-select');
      const pSl = APP.el('bayes-prev-slider');
      const seSl = APP.el('bayes-sens-slider');
      const spSl = APP.el('bayes-spec-slider');

      if (sel) sel.addEventListener('change', e => {
        const val = e.target.value;
        if (val.startsWith('pre:')) {
          const sc = PRESET_SCENARIOS.find(x => x.key === val.slice(4));
          if (sc) { LAB.prev = sc.prev; LAB.sens = sc.sens; LAB.spec = sc.spec; LAB.label = sc.label; }
        } else if (val.startsWith('dis:')) {
          const d = E.DISEASE_SPECTRUM.find(x => x.id === val.slice(4));
          if (d) { LAB.prev = Math.min(0.8, Math.max(0.0002, d.rate / 100000)); LAB.label = d.name; }
        }
        if (pSl) pSl.value = prevToSlider(LAB.prev);
        if (seSl) seSl.value = Math.round(LAB.sens * 1000);
        if (spSl) spSl.value = Math.round(LAB.spec * 1000);
        updateBayesian(APP);
      });

      if (pSl) pSl.addEventListener('input', e => { LAB.prev = sliderToPrev(Number(e.target.value)); updateBayesian(APP); });
      if (seSl) seSl.addEventListener('input', e => { LAB.sens = Number(e.target.value) / 1000; updateBayesian(APP); });
      if (spSl) spSl.addEventListener('input', e => { LAB.spec = Number(e.target.value) / 1000; updateBayesian(APP); });

      const rst = APP.el('quiz-restart');
      if (rst) rst.addEventListener('click', () => startQuiz(APP, E));
      startQuiz(APP, E);
    },
    loadPrevalence(APP, prob, label) {
      LAB.prev = Math.min(0.8, Math.max(0.0002, prob));
      LAB.label = label || 'Selected Disease';
      const pSl = APP.el('bayes-prev-slider');
      if (pSl) pSl.value = prevToSlider(LAB.prev);
      APP.switchTab('lab');
      updateBayesian(APP);
    },
    render(APP) {
      const pSl = APP.el('bayes-prev-slider');
      const seSl = APP.el('bayes-sens-slider');
      const spSl = APP.el('bayes-spec-slider');
      if (pSl) pSl.value = prevToSlider(LAB.prev);
      if (seSl) seSl.value = Math.round(LAB.sens * 1000);
      if (spSl) spSl.value = Math.round(LAB.spec * 1000);
      updateBayesian(APP);
    },
    redraw(APP) {
      updateBayesian(APP);
    },
  };

})(window.EPI_VIEWS);
