/* ============================================================================
   MedLab Epidemiology — Step 4: Tab 1 (Prevalence Spectrum) & Tab 2 (Pyramids)
   File: epi/views-part1.js
   ============================================================================ */
window.EPI_VIEWS = window.EPI_VIEWS || {};

(function (V) {
  'use strict';

  /* ==========================================================================
     TAB 1: SWISS PREVALENCE SPECTRUM (LOG-SCALE SWARM + SETTING FILTER)
     ========================================================================== */
  const SPEC = {
    setting: 'all',
    sys: 'all',
    metric: 'all',
    search: '',
    selectedId: 'htn',
    hoverId: null,
    hits: [],
  };

  const LOG_MIN = Math.log10(0.25);
  const LOG_MAX = Math.log10(75000);

  function getFilteredSpectrum(E) {
    const q = SPEC.search.trim().toLowerCase();
    return E.DISEASE_SPECTRUM.filter(d => {
      if (SPEC.setting !== 'all' && !d.setting.includes(SPEC.setting)) return false;
      if (SPEC.sys !== 'all' && d.sys !== SPEC.sys) return false;
      if (SPEC.metric !== 'all' && d.metric !== SPEC.metric) return false;
      if (!q) return true;
      return (d.name + ' ' + d.epi + ' ' + d.dx + ' ' + d.tx).toLowerCase().includes(q);
    }).sort((a, b) => b.rate - a.rate);
  }

  function formatOdds(rate) {
    if (rate <= 0) return '—';
    const inv = 100000 / rate;
    if (inv < 10) return '1 in ' + inv.toFixed(1);
    if (inv < 1000) return '1 in ' + Math.round(inv);
    return '1 in ' + (inv / 1000).toFixed(inv < 10000 ? 1 : 0) + 'k';
  }

  function formatRate(rate) {
    return rate >= 10 ? Math.round(rate).toLocaleString('en-US') : rate.toFixed(1);
  }

  function inspectSpectrumDisease(APP, E, d) {
    if (!d) return;
    SPEC.selectedId = d.id;
    const sys = E.SYSTEMS[d.sys] || { label: d.sys, color: '#14b8a6' };
    const metricLabel = d.metric === 'prev' ? 'Point / Period Prevalence' : 'Annual Incidence';
    const casesCH = Math.round((d.rate / 100000) * E.META.popMillions * 1e6);
    const prevProb = Math.min(0.8, Math.max(0.0001, d.rate / 100000));

    APP.setInspector({
      badge: `${sys.label} · ${metricLabel}`,
      title: d.name,
      sub: `${formatRate(d.rate)} / 100k (${formatOdds(d.rate)}) · ~${APP.fmtNum(casesCH)} in CH`,
      sections: [
        { label: 'Swiss Epidemiology & Base Rate', text: d.epi },
        { label: 'Key Diagnostics', text: d.dx },
        { label: 'First-Line Management', text: d.tx },
        { label: 'Primary Clinical Settings', text: d.setting.map(s => s.toUpperCase()).join(' · ') },
      ],
      links: d.links || [],
      anki: `Swiss Epidemiology — {{c1::${d.name}}}: ${metricLabel} ≈ {{c2::${formatRate(d.rate)} / 100k (${formatOdds(d.rate)})}}. Key Dx: {{c3::${d.dx}}}`,
      bayesRate: prevProb,
      bayesLabel: `${d.name} (${formatRate(d.rate)}/100k)`,
    });
    drawSpectrumCanvas(APP, E);
    renderSpectrumList(APP, E);
  }

  function drawSpectrumCanvas(APP, E) {
    const setup = APP.setupCanvas('spec-canvas-wrap', 'spec-canvas');
    if (!setup) return;
    const { ctx, w, h } = setup;
    const pal = APP.palette();
    const list = getFilteredSpectrum(E);
    const sysKeys = Object.keys(E.SYSTEMS);
    SPEC.hits = [];

    const padL = Math.min(92, Math.max(66, Math.round(w * 0.14)));
    const padR = 16;
    const padT = 30;
    const padB = 30;
    const plotW = Math.max(80, w - padL - padR);
    const plotH = Math.max(80, h - padT - padB);

    const xOf = rate => padL + ((Math.log10(Math.max(0.25, rate)) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * plotW;

    // Order-of-magnitude shaded bands
    const tiers = [
      { lo: 0.25, hi: 10, label: 'Rare (<10)', bg: pal.dark ? 'rgba(244,63,94,0.05)' : 'rgba(225,29,72,0.04)' },
      { lo: 10, hi: 100, label: 'Uncommon', bg: 'transparent' },
      { lo: 100, hi: 1000, label: 'Moderate', bg: pal.dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.018)' },
      { lo: 1000, hi: 10000, label: 'Common', bg: 'transparent' },
      { lo: 10000, hi: 75000, label: 'Very Common (>10%)', bg: pal.dark ? 'rgba(45,212,191,0.06)' : 'rgba(15,118,110,0.05)' },
    ];
    tiers.forEach(t => {
      const x1 = xOf(t.lo), x2 = xOf(t.hi);
      if (t.bg !== 'transparent') {
        ctx.fillStyle = t.bg;
        ctx.fillRect(x1, padT, x2 - x1, plotH);
      }
      ctx.font = '500 9px "JetBrains Mono", monospace';
      ctx.fillStyle = pal.faint;
      ctx.textAlign = 'center';
      ctx.fillText(t.label, (x1 + x2) / 2, padT - 12);
    });

    // Log vertical gridlines
    const ticks = [
      { v: 1, lbl: '1', odds: '1:100k' },
      { v: 10, lbl: '10', odds: '1:10k' },
      { v: 100, lbl: '100', odds: '1:1k' },
      { v: 1000, lbl: '1k', odds: '1:100' },
      { v: 10000, lbl: '10k', odds: '1:10' },
    ];
    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = 1;
    ticks.forEach(t => {
      const x = Math.round(xOf(t.v)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();

      ctx.font = '500 9.5px "JetBrains Mono", monospace';
      ctx.fillStyle = pal.muted;
      ctx.textAlign = 'center';
      ctx.fillText(t.lbl + '/100k', x, padT + plotH + 13);
      ctx.font = '400 8.5px "JetBrains Mono", monospace';
      ctx.fillStyle = pal.faint;
      ctx.fillText(t.odds, x, padT + plotH + 24);
    });

    // Horizontal organ-system lanes
    const laneH = plotH / sysKeys.length;
    sysKeys.forEach((k, idx) => {
      const cy = padT + idx * laneH + laneH / 2;
      const sys = E.SYSTEMS[k];
      ctx.strokeStyle = pal.grid;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.moveTo(padL, cy);
      ctx.lineTo(padL + plotW, cy);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.font = '500 10px "Inter", sans-serif';
      ctx.fillStyle = SPEC.sys === k ? sys.color : pal.muted;
      ctx.textAlign = 'right';
      ctx.fillText(sys.label, padL - 8, cy + 3.5);
    });

    // Deterministic gentle jitter for close neighbors on same lane
    const placedByLane = {};
    list.forEach(d => {
      const laneIdx = Math.max(0, sysKeys.indexOf(d.sys));
      const baseCy = padT + laneIdx * laneH + laneH / 2;
      const cx = xOf(d.rate);
      const laneArr = placedByLane[laneIdx] || (placedByLane[laneIdx] = []);
      let cy = baseCy;
      const closeCount = laneArr.filter(px => Math.abs(px - cx) < 11).length;
      if (closeCount > 0) {
        const sign = closeCount % 2 === 1 ? -1 : 1;
        cy = baseCy + sign * Math.min(laneH * 0.34, Math.ceil(closeCount / 2) * 6.5);
      }
      laneArr.push(cx);

      const sys = E.SYSTEMS[d.sys] || { color: '#14b8a6' };
      const isSel = d.id === SPEC.selectedId;
      const isHov = d.id === SPEC.hoverId;
      const r = isSel || isHov ? 6.5 : 4.8;

      SPEC.hits.push({ cx, cy, r: r + 5, d });

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = sys.color;
      ctx.globalAlpha = isSel || isHov ? 1 : (d.metric === 'prev' ? 0.88 : 0.72);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (d.metric === 'inc' && !isSel) {
        ctx.beginPath();
        ctx.arc(cx, cy, r - 2.2, 0, Math.PI * 2);
        ctx.fillStyle = pal.surface;
        ctx.fill();
      }

      if (isSel || isHov) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = pal.text;
        ctx.stroke();
      }
    });

    // Draw tooltip pill for hovered or selected point on top
    const active = SPEC.hits.find(x => x.d.id === SPEC.hoverId) || SPEC.hits.find(x => x.d.id === SPEC.selectedId);
    if (active) {
      const text = `${active.d.name} · ${formatRate(active.d.rate)}/100k (${formatOdds(active.d.rate)})`;
      ctx.font = '600 10.5px "Inter", sans-serif';
      const tw = ctx.measureText(text).width + 14;
      const bx = Math.min(w - tw - 8, Math.max(padL + 4, active.cx - tw / 2));
      const by = active.cy > padT + 34 ? active.cy - 28 : active.cy + 12;
      ctx.fillStyle = pal.dark ? 'rgba(9,9,11,0.92)' : 'rgba(255,255,255,0.96)';
      ctx.strokeStyle = (E.SYSTEMS[active.d.sys] || {}).color || pal.teal;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(bx, by, tw, 20, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = pal.text;
      ctx.textAlign = 'left';
      ctx.fillText(text, bx + 7, by + 13.5);
    }
  }

  function renderSpectrumList(APP, E) {
    const list = getFilteredSpectrum(E);
    const countEl = APP.el('spec-count');
    if (countEl) countEl.textContent = `${list.length} of ${E.DISEASE_SPECTRUM.length} conditions`;

    if (APP.state.tab === 'spectrum' && list.length) {
      const top = list[0];
      APP.updateKPI('Most Common (Filter)', formatOdds(top.rate), `${top.name.split('(')[0].trim()} · ${formatRate(top.rate)}/100k`);
    }

    const box = APP.el('spec-list');
    if (!box) return;
    box.innerHTML = list.map(d => {
      const sys = E.SYSTEMS[d.sys] || { label: d.sys, color: '#14b8a6' };
      const sel = d.id === SPEC.selectedId;
      const barPct = Math.max(4, Math.min(100, ((Math.log10(Math.max(0.25, d.rate)) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100));
      return `
        <button type="button" data-id="${d.id}" class="spec-row w-full text-left px-3 py-2 rounded-lg border transition-colors ${
          sel
            ? 'border-teal-500/50 bg-teal-500/10'
            : 'border-zinc-200/70 dark:border-zinc-800/80 hover:border-teal-500/35 bg-white dark:bg-zinc-950/40'
        }">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-2 h-2 rounded-full shrink-0" style="background:${sys.color}"></span>
              <span class="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">${APP.esc(d.name)}</span>
              <span class="hidden sm:inline font-mono text-[9.5px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-500">${d.metric === 'prev' ? 'Prev' : 'Inc/yr'}</span>
            </div>
            <div class="flex items-center gap-2 shrink-0 font-mono text-[11px] tabular-nums">
              <span class="text-zinc-400 hidden sm:inline">${formatOdds(d.rate)}</span>
              <span class="font-semibold text-zinc-900 dark:text-white">${formatRate(d.rate)}<span class="text-[9.5px] font-normal text-zinc-400">/100k</span></span>
            </div>
          </div>
          <div class="mt-1.5 h-1 w-full rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
            <div class="h-full rounded-full" style="width:${barPct.toFixed(1)}%;background:${sys.color};opacity:0.8"></div>
          </div>
        </button>
      `;
    }).join('');

    box.querySelectorAll('.spec-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = E.DISEASE_SPECTRUM.find(x => x.id === btn.dataset.id);
        inspectSpectrumDisease(APP, E, item);
      });
    });
  }

  function renderSpectrumControls(APP, E) {
    document.querySelectorAll('.spec-set-btn').forEach(b => {
      const active = b.dataset.setting === SPEC.setting;
      b.className = `spec-set-btn px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
        active ? 'bg-white dark:bg-zinc-800 text-tealLight dark:text-tealDark font-semibold shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
      }`;
    });

    const chips = APP.el('spec-sys-chips');
    if (chips) {
      const allBtn = `<button type="button" data-sys="all" class="spec-sys-btn px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
        SPEC.sys === 'all' ? 'bg-teal-500/15 border-teal-500/45 text-tealLight dark:text-tealDark' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
      }">All Systems</button>`;
      chips.innerHTML = allBtn + Object.entries(E.SYSTEMS).map(([k, s]) => `
        <button type="button" data-sys="${k}" class="spec-sys-btn inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
          SPEC.sys === k ? 'bg-teal-500/15 border-teal-500/45 text-zinc-950 dark:text-white' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
        }"><span class="w-1.5 h-1.5 rounded-full" style="background:${s.color}"></span>${s.label}</button>
      `).join('');

      chips.querySelectorAll('.spec-sys-btn').forEach(b => {
        b.addEventListener('click', () => {
          SPEC.sys = b.dataset.sys;
          renderSpectrumControls(APP, E);
          drawSpectrumCanvas(APP, E);
          renderSpectrumList(APP, E);
        });
      });
    }
  }

  V.spectrum = {
    init(APP, E) {
      document.querySelectorAll('.spec-set-btn').forEach(b => {
        b.addEventListener('click', () => {
          SPEC.setting = b.dataset.setting;
          renderSpectrumControls(APP, E);
          drawSpectrumCanvas(APP, E);
          renderSpectrumList(APP, E);
        });
      });
      const searchEl = APP.el('spec-search');
      if (searchEl) searchEl.addEventListener('input', e => {
        SPEC.search = e.target.value;
        drawSpectrumCanvas(APP, E);
        renderSpectrumList(APP, E);
      });
      const metricEl = APP.el('spec-metric');
      if (metricEl) metricEl.addEventListener('change', e => {
        SPEC.metric = e.target.value;
        drawSpectrumCanvas(APP, E);
        renderSpectrumList(APP, E);
      });

      const canvas = APP.el('spec-canvas');
      if (canvas) {
        canvas.addEventListener('mousemove', e => {
          const r = canvas.getBoundingClientRect();
          const x = e.clientX - r.left, y = e.clientY - r.top;
          let best = null, bestDist = 14;
          for (const h of SPEC.hits) {
            const dist = Math.hypot(x - h.cx, y - h.cy);
            if (dist < bestDist) { bestDist = dist; best = h.d.id; }
          }
          if (best !== SPEC.hoverId) {
            SPEC.hoverId = best;
            canvas.style.cursor = best ? 'pointer' : 'default';
            drawSpectrumCanvas(APP, E);
          }
        });
        canvas.addEventListener('mouseleave', () => { SPEC.hoverId = null; drawSpectrumCanvas(APP, E); });
        canvas.addEventListener('click', () => {
          if (!SPEC.hoverId) return;
          const item = E.DISEASE_SPECTRUM.find(x => x.id === SPEC.hoverId);
          inspectSpectrumDisease(APP, E, item);
        });
      }
    },
    render(APP, E) {
      renderSpectrumControls(APP, E);
      drawSpectrumCanvas(APP, E);
      renderSpectrumList(APP, E);
    },
    redraw(APP, E) {
      drawSpectrumCanvas(APP, E);
    },
    inspectDefault(APP, E) {
      inspectSpectrumDisease(APP, E, E.DISEASE_SPECTRUM.find(x => x.id === 'htn'));
    },
  };

  /* ==========================================================================
     TAB 2: BUTTERFLY PYRAMIDS, LIFESPAN INVERSION & 1970–2023 TRENDS
     ========================================================================== */
  const PYR = {
    key: 'mortality',
    hoverRow: -1,
    lifeHover: -1,
    trendFocus: null,
    trendHoverYr: -1,
    pyrHits: [],
    lifeHits: [],
    trendYrXs: [],
  };

  function drawPyramidCanvas(APP, E) {
    const setup = APP.setupCanvas('pyr-canvas-wrap', 'pyr-canvas');
    if (!setup) return;
    const { ctx, w, h } = setup;
    const pal = APP.palette();
    const data = E.PYRAMIDS[PYR.key];
    const bands = E.PYRAMID_BANDS;
    PYR.pyrHits = [];

    const padT = 26, padB = 24, padX = 16;
    const centerW = 48;
    const cx = w / 2;
    const halfW = Math.max(40, (w - centerW) / 2 - padX);
    const plotH = Math.max(60, h - padT - padB);
    const rowH = plotH / bands.length;
    const maxVal = Math.max(...data.m, ...data.f) * 1.12;

    // Header labels
    ctx.font = '600 10.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'right';
    ctx.fillText('← MALE', cx - centerW / 2 - 6, 15);
    ctx.fillStyle = '#fb7185';
    ctx.textAlign = 'left';
    ctx.fillText('FEMALE →', cx + centerW / 2 + 6, 15);
    ctx.fillStyle = pal.faint;
    ctx.textAlign = 'center';
    ctx.fillText('AGE', cx, 15);

    // Draw 90+ at top down to 0–9 at bottom (true demographic pyramid)
    for (let i = 0; i < bands.length; i++) {
      const bandIdx = bands.length - 1 - i;
      const y = padT + i * rowH;
      const barH = Math.max(10, rowH * 0.68);
      const by = y + (rowH - barH) / 2;
      const mVal = data.m[bandIdx];
      const fVal = data.f[bandIdx];
      const mw = (mVal / maxVal) * halfW;
      const fw = (fVal / maxVal) * halfW;
      const hov = bandIdx === PYR.hoverRow;

      PYR.pyrHits.push({ y, h: rowH, bandIdx });

      if (hov) {
        ctx.fillStyle = pal.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)';
        ctx.fillRect(6, y, w - 12, rowH);
      }

      // Male bar (left)
      if (mw > 0.5) {
        ctx.fillStyle = hov ? '#38bdf8' : 'rgba(56,189,248,0.82)';
        ctx.beginPath();
        ctx.roundRect(cx - centerW / 2 - mw, by, mw, barH, [3, 0, 0, 3]);
        ctx.fill();
      }
      // Female bar (right)
      if (fw > 0.5) {
        ctx.fillStyle = hov ? '#fb7185' : 'rgba(251,113,133,0.82)';
        ctx.beginPath();
        ctx.roundRect(cx + centerW / 2, by, fw, barH, [0, 3, 3, 0]);
        ctx.fill();
      }

      // Center age label
      ctx.font = `${hov ? '600' : '500'} 10px "JetBrains Mono", monospace`;
      ctx.fillStyle = hov ? pal.text : pal.muted;
      ctx.textAlign = 'center';
      ctx.fillText(bands[bandIdx], cx, y + rowH / 2 + 3.5);

      // Show numeric callout on hover
      if (hov) {
        ctx.font = '600 9.5px "JetBrains Mono", monospace';
        ctx.fillStyle = pal.text;
        ctx.textAlign = 'right';
        ctx.fillText(APP.fmtNum(mVal), Math.max(40, cx - centerW / 2 - mw - 5), y + rowH / 2 + 3.5);
        ctx.textAlign = 'left';
        ctx.fillText(APP.fmtNum(fVal), Math.min(w - 40, cx + centerW / 2 + fw + 5), y + rowH / 2 + 3.5);
      }
    }

    // Bottom totals summary
    const totM = data.m.reduce((a, b) => a + b, 0);
    const totF = data.f.reduce((a, b) => a + b, 0);
    ctx.font = '400 9.5px "JetBrains Mono", monospace';
    ctx.fillStyle = pal.faint;
    ctx.textAlign = 'center';
    ctx.fillText(`Total: ${APP.fmtNum(totM)} M vs ${APP.fmtNum(totF)} F (${data.unit})`, cx, h - 6);
  }

  function drawLifespanCanvas(APP, E) {
    const setup = APP.setupCanvas('life-canvas-wrap', 'life-canvas');
    if (!setup) return;
    const { ctx, w, h } = setup;
    const pal = APP.palette();
    const ages = E.LIFESPAN_AGES;
    const series = E.LIFESPAN_SERIES;
    PYR.lifeHits = [];

    const padL = 34, padR = 14, padT = 18, padB = 34;
    const plotW = Math.max(60, w - padL - padR);
    const plotH = Math.max(60, h - padT - padB);
    const colGap = plotW / ages.length;
    const barW = Math.min(54, colGap * 0.56);

    // Precompute stacked y-ranges per age column
    const stacks = ages.map((_, ai) => {
      let acc = 0;
      const x = padL + ai * colGap + (colGap - barW) / 2;
      PYR.lifeHits.push({ x: padL + ai * colGap, w: colGap, idx: ai });
      return series.map(s => {
        const yTop = padT + plotH * (1 - (acc + s.pct[ai]) / 100);
        const yBot = padT + plotH * (1 - acc / 100);
        acc += s.pct[ai];
        return { x, yTop, yBot, col: s.color, pct: s.pct[ai], label: s.label };
      });
    });

    // Translucent connecting ribbons showing inversion across lifespan
    for (let ai = 0; ai < ages.length - 1; ai++) {
      for (let si = 0; si < series.length; si++) {
        const a = stacks[ai][si];
        const b = stacks[ai + 1][si];
        const x1 = a.x + barW, x2 = b.x;
        const mx = (x1 + x2) / 2;
        ctx.beginPath();
        ctx.moveTo(x1, a.yTop);
        ctx.bezierCurveTo(mx, a.yTop, mx, b.yTop, x2, b.yTop);
        ctx.lineTo(x2, b.yBot);
        ctx.bezierCurveTo(mx, b.yBot, mx, a.yBot, x1, a.yBot);
        ctx.closePath();
        ctx.fillStyle = a.col;
        ctx.globalAlpha = 0.16;
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Stacked columns
    stacks.forEach((colSegs, ai) => {
      const hov = ai === PYR.lifeHover;
      colSegs.forEach(seg => {
        const sh = Math.max(0, seg.yBot - seg.yTop);
        ctx.fillStyle = seg.col;
        ctx.globalAlpha = hov ? 1 : 0.88;
        ctx.fillRect(seg.x, seg.yTop, barW, sh);
        if (seg.pct >= 10) {
          ctx.globalAlpha = 1;
          ctx.font = '600 9.5px "JetBrains Mono", monospace';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(Math.round(seg.pct) + '%', seg.x + barW / 2, seg.yTop + sh / 2 + 3.5);
        }
      });
      ctx.globalAlpha = 1;
      ctx.font = `${hov ? '600' : '500'} 10px "JetBrains Mono", monospace`;
      ctx.fillStyle = hov ? pal.text : pal.muted;
      ctx.textAlign = 'center';
      ctx.fillText(ages[ai], colSegs[0].x + barW / 2, padT + plotH + 16);
    });

    // Y-axis ticks
    ctx.font = '400 9px "JetBrains Mono", monospace';
    ctx.fillStyle = pal.faint;
    ctx.textAlign = 'right';
    [0, 50, 100].forEach(v => {
      const y = padT + plotH * (1 - v / 100);
      ctx.fillText(v + '%', padL - 6, y + 3);
    });
  }

  function drawTrendCanvas(APP, E) {
    const setup = APP.setupCanvas('trend-canvas-wrap', 'trend-canvas');
    if (!setup) return;
    const { ctx, w, h } = setup;
    const pal = APP.palette();
    const years = E.TREND_YEARS;
    const lines = E.HISTORICAL_TRENDS;

    const padL = 40, padR = 16, padT = 16, padB = 26;
    const plotW = Math.max(60, w - padL - padR);
    const plotH = Math.max(60, h - padT - padB);
    const maxY = 240;

    const xOfIdx = i => padL + ((years[i] - years[0]) / (years[years.length - 1] - years[0])) * plotW;
    const yOfVal = v => padT + plotH - (v / maxY) * plotH;
    PYR.trendYrXs = years.map((_, i) => xOfIdx(i));

    // Grid
    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = 1;
    ctx.font = '400 9px "JetBrains Mono", monospace';
    [0, 50, 100, 150, 200].forEach(v => {
      const y = Math.round(yOfVal(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke();
      ctx.fillStyle = pal.faint;
      ctx.textAlign = 'right';
      ctx.fillText(String(v), padL - 6, y + 3);
    });

    years.forEach((yr, i) => {
      const x = Math.round(xOfIdx(i)) + 0.5;
      ctx.fillStyle = i === PYR.trendHoverYr ? pal.text : pal.faint;
      ctx.textAlign = 'center';
      ctx.fillText(String(yr), x, padT + plotH + 15);
    });

    // Hover vertical guide
    if (PYR.trendHoverYr >= 0) {
      const hx = Math.round(xOfIdx(PYR.trendHoverYr)) + 0.5;
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = pal.muted;
      ctx.beginPath(); ctx.moveTo(hx, padT); ctx.lineTo(hx, padT + plotH); ctx.stroke();
      ctx.restore();
    }

    // Series curves
    lines.forEach(s => {
      const dimmed = PYR.trendFocus && PYR.trendFocus !== s.id;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = PYR.trendFocus === s.id ? 2.8 : 1.9;
      ctx.globalAlpha = dimmed ? 0.18 : 0.92;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      s.vals.forEach((v, i) => {
        const x = xOfIdx(i), y = yOfVal(v);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Hover points
      if (PYR.trendHoverYr >= 0 && !dimmed) {
        const i = PYR.trendHoverYr;
        ctx.beginPath();
        ctx.arc(xOfIdx(i), yOfVal(s.vals[i]), 3.5, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  }

  function renderPyramidControls(APP, E) {
    const selBox = APP.el('pyr-selector');
    if (selBox) {
      const keys = [
        ['mortality', 'All Deaths'],
        ['population', 'Population'],
        ['mi_acs', 'Acute MI'],
        ['chlamydia', 'Chlamydia (STI)'],
        ['cancer_inc', 'Cancer Inc.'],
        ['dementia_deaths', 'Dementia'],
        ['external', 'Trauma / Suicide'],
      ];
      selBox.innerHTML = keys.map(([k, lbl]) => `
        <button type="button" data-pyr="${k}" class="pyr-btn px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
          PYR.key === k ? 'bg-teal-500/15 border-teal-500/45 text-tealLight dark:text-tealDark' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
        }">${lbl}</button>
      `).join('');
      selBox.querySelectorAll('.pyr-btn').forEach(b => {
        b.addEventListener('click', () => {
          PYR.key = b.dataset.pyr;
          renderPyramidControls(APP, E);
          drawPyramidCanvas(APP, E);
          const p = E.PYRAMIDS[PYR.key];
          APP.setInspector({
            badge: 'Age × Sex Pyramid',
            title: p.title,
            sub: 'Blue (Left) = Male · Rose (Right) = Female',
            sections: [{ label: 'Epidemiological Pattern', text: p.sub }],
          });
        });
      });
    }

    const cur = E.PYRAMIDS[PYR.key];
    const tEl = APP.el('pyr-title'), sEl = APP.el('pyr-sub');
    if (tEl) tEl.textContent = cur.title;
    if (sEl) sEl.textContent = cur.sub;

    const leg = APP.el('trend-legend');
    if (leg) {
      leg.innerHTML = E.HISTORICAL_TRENDS.map(s => `
        <button type="button" data-tr="${s.id}" class="tr-btn inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-medium border transition-colors ${
          PYR.trendFocus === s.id
            ? 'border-teal-500/50 bg-teal-500/10 text-zinc-950 dark:text-white'
            : 'border-zinc-200/80 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
        }"><span class="w-2 h-2 rounded-full" style="background:${s.color}"></span>${s.label}</button>
      `).join('');
      leg.querySelectorAll('.tr-btn').forEach(b => {
        b.addEventListener('click', () => {
          const id = b.dataset.tr;
          PYR.trendFocus = PYR.trendFocus === id ? null : id;
          renderPyramidControls(APP, E);
          drawTrendCanvas(APP, E);
          const item = E.HISTORICAL_TRENDS.find(x => x.id === id);
          if (item) {
            APP.setInspector({
              badge: 'BFS 1970–2023 Trend',
              title: item.label,
              sub: `1970: ${item.vals[0]}/100k → 2023: ${item.vals[item.vals.length - 1]}/100k`,
              sections: [{ label: 'Historical Driver', text: item.note }],
            });
          }
        });
      });
    }
  }

  V.pyramids = {
    init(APP, E) {
      const pCan = APP.el('pyr-canvas');
      if (pCan) {
        pCan.addEventListener('mousemove', e => {
          const y = e.clientY - pCan.getBoundingClientRect().top;
          const hit = PYR.pyrHits.find(r => y >= r.y && y <= r.y + r.h);
          const next = hit ? hit.bandIdx : -1;
          if (next !== PYR.hoverRow) { PYR.hoverRow = next; drawPyramidCanvas(APP, E); }
        });
        pCan.addEventListener('mouseleave', () => { PYR.hoverRow = -1; drawPyramidCanvas(APP, E); });
        pCan.addEventListener('click', () => {
          if (PYR.hoverRow < 0) return;
          const d = E.PYRAMIDS[PYR.key];
          const m = d.m[PYR.hoverRow], f = d.f[PYR.hoverRow];
          const ratio = f > 0 ? (m / f).toFixed(2) : '—';
          APP.setInspector({
            badge: `Age Band ${E.PYRAMID_BANDS[PYR.hoverRow]} y`,
            title: d.title,
            sub: `Male: ${APP.fmtNum(m)} · Female: ${APP.fmtNum(f)} ${d.unit} (M:F ${ratio})`,
            sections: [{ label: 'Pattern Context', text: d.sub }],
          });
        });
      }

      const lCan = APP.el('life-canvas');
      if (lCan) {
        lCan.addEventListener('mousemove', e => {
          const x = e.clientX - lCan.getBoundingClientRect().left;
          const hit = PYR.lifeHits.find(c => x >= c.x && x <= c.x + c.w);
          const next = hit ? hit.idx : -1;
          if (next !== PYR.lifeHover) { PYR.lifeHover = next; lCan.style.cursor = hit ? 'pointer' : 'default'; drawLifespanCanvas(APP, E); }
        });
        lCan.addEventListener('mouseleave', () => { PYR.lifeHover = -1; drawLifespanCanvas(APP, E); });
        lCan.addEventListener('click', () => {
          if (PYR.lifeHover < 0) return;
          const ai = PYR.lifeHover;
          const rows = E.LIFESPAN_SERIES.map(s => `${s.label}: ${s.pct[ai].toFixed(1)}%`).join(' · ');
          APP.setInspector({
            badge: `BFS Lifespan · ${E.LIFESPAN_AGES[ai]}`,
            title: `Causes of Death (${E.LIFESPAN_AGES[ai]})`,
            sub: 'Percentage share of all Swiss deaths in this age stratum',
            sections: [
              { label: 'Stratum Breakdown', text: rows },
              { label: 'Clinical Base-Rate Shift', text: '15–44 y is dominated by external causes/suicide; 45–84 y by cancer; 85+ y by cardiovascular disease & dementia.' },
            ],
          });
        });
      }

      const tCan = APP.el('trend-canvas');
      if (tCan) {
        tCan.addEventListener('mousemove', e => {
          const x = e.clientX - tCan.getBoundingClientRect().left;
          let best = -1, dist = 28;
          PYR.trendYrXs.forEach((px, i) => {
            if (Math.abs(x - px) < dist) { dist = Math.abs(x - px); best = i; }
          });
          if (best !== PYR.trendHoverYr) { PYR.trendHoverYr = best; drawTrendCanvas(APP, E); }
        });
        tCan.addEventListener('mouseleave', () => { PYR.trendHoverYr = -1; drawTrendCanvas(APP, E); });
      }
    },
    render(APP, E) {
      renderPyramidControls(APP, E);
      drawPyramidCanvas(APP, E);
      drawLifespanCanvas(APP, E);
      drawTrendCanvas(APP, E);
      APP.updateKPI('IHD Since 1970', '−79% Drop', 'While Dementia rose 4.2×');
    },
    redraw(APP, E) {
      drawPyramidCanvas(APP, E);
      drawLifespanCanvas(APP, E);
      drawTrendCanvas(APP, E);
    },
  };

})(window.EPI_VIEWS);
