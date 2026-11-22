/* ============================================================================
   MedLab Epidemiology — Step 5: Tab 3 (Swiss Canton Map) & Tab 4 (Burden/Onco)
   File: epi/views-part2.js
   ============================================================================ */
window.EPI_VIEWS = window.EPI_VIEWS || {};

(function (V) {
  'use strict';

  /* ==========================================================================
     TAB 3: INTERACTIVE 26-CANTON SWISS CHOROPLETH MAP
     ========================================================================== */
  const MAP = {
    layer: 'tbe',
    selectedId: 'BE',
  };

  function lerpHex(c1, c2, t) {
    const u = Math.max(0, Math.min(1, t));
    const a = parseInt(c1.slice(1), 16);
    const b = parseInt(c2.slice(1), 16);
    const r = Math.round(((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * u);
    const g = Math.round(((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * u);
    const bl = Math.round((a & 255) + ((b & 255) - (a & 255)) * u);
    return `rgb(${r},${g},${bl})`;
  }

  function cantonFill(val, layerObj, isDark) {
    if (layerObj.ramp === 'binary') {
      return val === 1
        ? (isDark ? '#14b8a6' : '#0f766e')
        : (isDark ? '#27272a' : '#e4e4e7');
    }
    const t = Math.max(0, Math.min(1, (val - layerObj.min) / (layerObj.max - layerObj.min)));
    if (layerObj.ramp === 'tealRose') {
      if (val <= 0.2) return isDark ? '#1e293b' : '#e2e8f0';
      return t < 0.5
        ? lerpHex(isDark ? '#115e59' : '#99f6e4', '#f59e0b', t * 2)
        : lerpHex('#f59e0b', '#e11d48', (t - 0.5) * 2);
    }
    if (layerObj.ramp === 'amberRose') {
      return t < 0.5
        ? lerpHex(isDark ? '#134e4a' : '#ccfbf1', '#f59e0b', t * 2)
        : lerpHex('#f59e0b', '#e11d48', (t - 0.5) * 2);
    }
    // emerald (life expectancy)
    return t < 0.5
      ? lerpHex(isDark ? '#3f3f46' : '#e4e4e7', '#14b8a6', t * 2)
      : lerpHex('#14b8a6', '#10b981', (t - 0.5) * 2);
  }

  function inspectCanton(APP, E, c) {
    if (!c) return;
    MAP.selectedId = c.id;
    const layer = E.MAP_LAYERS[MAP.layer];
    const val = c[MAP.layer];

    APP.setInspector({
      badge: `Canton ${c.id} · ${c.lang} · ~${c.pop}k pop.`,
      title: c.name,
      sub: `${layer.label}: ${layer.fmt(val)}`,
      sections: [
        { label: 'Regional Epidemiology Profile', text: c.note },
        { label: 'TBE / FSME Incidence (BAG)', text: `${c.tbe.toFixed(1)} / 100k/yr (${c.id === 'TI' ? 'Non-risk canton' : 'BAG vaccine risk zone'})` },
        { label: 'ANRESIS Antibiotic Use & MRSA', text: `${c.abx.toFixed(1)} DID outpatient consumption · ~${c.mrsa.toFixed(1)}% invasive MRSA` },
        { label: 'Prevention & Longevity', text: `Mammography: ${c.screen ? 'Organized program (50–74 y)' : 'Opportunistic only'} · Life expectancy: ${c.life.toFixed(1)} y` },
      ],
      links: [{ label: 'PharmaLab', href: 'pharma.html' }],
      anki: `Swiss Canton Epidemiology — {{c1::${c.name} (${c.id})}}: TBE {{c2::${c.tbe.toFixed(1)}/100k}}, Abx use {{c3::${c.abx.toFixed(1)} DID}} (MRSA ~${c.mrsa.toFixed(1)}%), Mammography: ${c.screen ? 'Organized' : 'Opportunistic'}.`,
    });
    renderMapSVG(APP, E);
    renderMapRankList(APP, E);
  }

  function renderMapControls(APP, E) {
    const btnBox = APP.el('map-layer-btns');
    if (btnBox) {
      btnBox.innerHTML = Object.values(E.MAP_LAYERS).map(l => `
        <button type="button" data-layer="${l.id}" class="map-layer-btn px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
          MAP.layer === l.id
            ? 'bg-teal-500/15 border-teal-500/45 text-tealLight dark:text-tealDark font-semibold'
            : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
        }">${l.label}</button>
      `).join('');

      btnBox.querySelectorAll('.map-layer-btn').forEach(b => {
        b.addEventListener('click', () => {
          MAP.layer = b.dataset.layer;
          renderMapControls(APP, E);
          renderMapSVG(APP, E);
          renderMapRankList(APP, E);
          const cur = E.CANTONS.find(x => x.id === MAP.selectedId);
          if (cur) inspectCanton(APP, E, cur);
          updateMapKPI(APP, E);
        });
      });
    }

    const layer = E.MAP_LAYERS[MAP.layer];
    const tEl = APP.el('map-title'), sEl = APP.el('map-sub'), legEl = APP.el('map-legend');
    if (tEl) tEl.textContent = layer.label;
    if (sEl) sEl.textContent = layer.sub;

    if (legEl) {
      const isDark = APP.palette().dark;
      if (layer.ramp === 'binary') {
        legEl.innerHTML = `
          <span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm" style="background:${isDark ? '#14b8a6' : '#0f766e'}"></span>Organized Program (14)</span>
          <span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm" style="background:${isDark ? '#27272a' : '#e4e4e7'}"></span>Opportunistic Only (12)</span>
        `;
      } else {
        const stops = [0, 0.33, 0.66, 1].map(f => cantonFill(layer.min + f * (layer.max - layer.min), layer, isDark));
        legEl.innerHTML = `
          <span class="font-mono text-[10px] text-zinc-500">${layer.legend[0]}</span>
          <div class="w-32 h-2.5 rounded-full border border-zinc-300/60 dark:border-zinc-700/60" style="background:linear-gradient(90deg, ${stops.join(',')})"></div>
          <span class="font-mono text-[10px] text-zinc-500">${layer.legend[layer.legend.length - 1]}</span>
        `;
      }
    }
  }

  function updateMapKPI(APP, E) {
    if (APP.state.tab !== 'map') return;
    if (MAP.layer === 'tbe') APP.updateKPI('TBE Risk Area', '25 / 26 Cantons', 'Only Ticino excluded (BAG)');
    else if (MAP.layer === 'abx') APP.updateKPI('Abx Röstigraben', '12.9 vs 8.1 DID', 'Latin CH vs German CH');
    else if (MAP.layer === 'screen') APP.updateKPI('Organized Screen', '14 / 26 Cantons', 'Breast mammography q2y');
    else APP.updateKPI('Top Longevity', 'ZG 85.2 · TI 85.0', 'CH avg ~84.0 years (BFS)');
  }

  function renderMapSVG(APP, E) {
    const svg = APP.el('map-svg');
    if (!svg) return;
    const pal = APP.palette();
    const layer = E.MAP_LAYERS[MAP.layer];
    const strokeCol = pal.dark ? '#09090b' : '#ffffff';
    const lakeFill = pal.dark ? 'rgba(56,189,248,0.22)' : 'rgba(14,165,233,0.24)';

    const paths = E.CANTONS.map(c => {
      const fill = cantonFill(c[MAP.layer], layer, pal.dark);
      const isSel = c.id === MAP.selectedId;
      return `
        <g class="canton-node cursor-pointer" data-cid="${c.id}">
          <path d="${c.d}" fill="${fill}" stroke="${isSel ? pal.text : strokeCol}" stroke-width="${isSel ? 2.6 : 1.35}" stroke-linejoin="round" style="transition:opacity 120ms ease" opacity="${isSel ? 1 : 0.90}">
            <title>${c.name} (${c.id}) — ${layer.label}: ${layer.fmt(c[MAP.layer])}</title>
          </path>
          <text x="${c.lx}" y="${c.ly}" text-anchor="middle" dominant-baseline="central" pointer-events="none"
            font-family="JetBrains Mono, monospace" font-size="${c.pop < 60 ? 8.5 : 10}" font-weight="${isSel ? 700 : 600}"
            fill="${pal.dark ? '#fafafa' : '#09090b'}" stroke="${pal.dark ? 'rgba(9,9,11,0.75)' : 'rgba(255,255,255,0.85)'}" stroke-width="2.4" paint-order="stroke">
            ${c.id}
          </text>
        </g>
      `;
    }).join('');

    const lakes = (E.CH_MAP.lakes || []).map(d => `<path d="${d}" fill="${lakeFill}" pointer-events="none" />`).join('');
    svg.innerHTML = paths + lakes;

    svg.querySelectorAll('.canton-node').forEach(node => {
      node.addEventListener('click', () => {
        const c = E.CANTONS.find(x => x.id === node.dataset.cid);
        inspectCanton(APP, E, c);
      });
    });
  }

  function renderMapRankList(APP, E) {
    const box = APP.el('map-rank-list');
    if (!box) return;
    const layer = E.MAP_LAYERS[MAP.layer];
    const sorted = [...E.CANTONS].sort((a, b) => b[MAP.layer] - a[MAP.layer]);
    const isDark = APP.palette().dark;

    box.innerHTML = sorted.map(c => {
      const sel = c.id === MAP.selectedId;
      const swatch = cantonFill(c[MAP.layer], layer, isDark);
      return `
        <button type="button" data-cid="${c.id}" class="map-rank-btn flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-colors ${
          sel ? 'border-teal-500/50 bg-teal-500/10' : 'border-zinc-200/70 dark:border-zinc-800/80 hover:border-teal-500/35'
        }">
          <span class="flex items-center gap-1.5 min-w-0">
            <span class="w-2.5 h-2.5 rounded-sm shrink-0" style="background:${swatch}"></span>
            <span class="font-mono text-[10.5px] font-semibold text-zinc-900 dark:text-white">${c.id}</span>
            <span class="text-[11px] text-zinc-500 truncate">${APP.esc(c.name.split('/')[0].trim())}</span>
          </span>
          <span class="font-mono text-[10.5px] tabular-nums text-zinc-700 dark:text-zinc-300 shrink-0">${MAP.layer === 'screen' ? (c.screen ? 'Yes' : 'No') : c[MAP.layer].toFixed(1)}</span>
        </button>
      `;
    }).join('');

    box.querySelectorAll('.map-rank-btn').forEach(b => {
      b.addEventListener('click', () => {
        const c = E.CANTONS.find(x => x.id === b.dataset.cid);
        inspectCanton(APP, E, c);
      });
    });
  }

  V.map = {
    init() {},
    render(APP, E) {
      renderMapControls(APP, E);
      renderMapSVG(APP, E);
      renderMapRankList(APP, E);
      updateMapKPI(APP, E);
    },
    redraw(APP, E) {
      renderMapControls(APP, E);
      renderMapSVG(APP, E);
      renderMapRankList(APP, E);
    },
  };

  /* ==========================================================================
     TAB 4: MORBIDITY VS. MORTALITY (WARD BUBBLES · NKRS QUADRANT · GBD YLL/YLD)
     ========================================================================== */
  const BURDEN = {
    wardSel: 'sepsis_ward',
    wardHover: null,
    wardHits: [],
    oncoSex: 'all',
    oncoSel: 'lung',
    oncoHover: null,
    oncoHits: [],
  };

  function drawWardCanvas(APP, E) {
    const setup = APP.setupCanvas('ward-canvas-wrap', 'ward-canvas');
    if (!setup) return;
    const { ctx, w, h } = setup;
    const pal = APP.palette();
    BURDEN.wardHits = [];

    const padL = 44, padR = 20, padT = 22, padB = 34;
    const plotW = Math.max(80, w - padL - padR);
    const plotH = Math.max(80, h - padT - padB);

    const xOf = adm => padL + (Math.min(86, adm) / 86) * plotW;
    // Log Y-axis (3 to 40 days) separates acute 4–12d stays while cleanly showing 33.5d Psychiatry
    const yLogMin = Math.log10(2.8), yLogMax = Math.log10(42);
    const yOf = los => padT + plotH - ((Math.log10(Math.max(2.8, los)) - yLogMin) / (yLogMax - yLogMin)) * plotH;
    const rOf = mort => 5 + Math.sqrt(Math.max(0.05, mort)) * 3.8;

    // Grid
    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = 1;
    ctx.font = '400 9px "JetBrains Mono", monospace';
    [3, 5, 10, 20, 35].forEach(d => {
      const y = Math.round(yOf(d)) + 0.5;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke();
      ctx.fillStyle = pal.faint;
      ctx.textAlign = 'right';
      ctx.fillText(d + 'd', padL - 6, y + 3);
    });
    [0, 20, 40, 60, 80].forEach(k => {
      const x = Math.round(xOf(k)) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + plotH); ctx.stroke();
      ctx.fillStyle = pal.faint;
      ctx.textAlign = 'center';
      ctx.fillText(k + 'k', x, padT + plotH + 14);
    });

    // Axis titles
    ctx.fillStyle = pal.muted;
    ctx.font = '500 9.5px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Annual Swiss Admissions (thousands)', padL + plotW / 2, h - 5);
    ctx.save();
    ctx.translate(12, padT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Mean Stay (log days)', 0, 0);
    ctx.restore();

    // Bubbles (largest first so smaller ones remain clickable)
    const sorted = [...E.WARD_BURDEN].sort((a, b) => b.mort - a.mort);
    sorted.forEach(item => {
      const cx = xOf(item.admK);
      const cy = yOf(item.los);
      const r = rOf(item.mort);
      const active = item.id === BURDEN.wardHover || item.id === BURDEN.wardSel;
      BURDEN.wardHits.push({ cx, cy, r: Math.max(10, r + 4), item });

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = item.col;
      ctx.globalAlpha = active ? 0.92 : 0.62;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = active ? 2 : 1;
      ctx.strokeStyle = active ? pal.text : item.col;
      ctx.stroke();

      // Label key landmarks
      if (active || item.mort >= 6.5 || item.los >= 15 || item.admK >= 55) {
        ctx.font = `${active ? '600' : '500'} 9.5px "Inter", sans-serif`;
        ctx.fillStyle = active ? pal.text : pal.muted;
        ctx.textAlign = cx > padL + plotW * 0.72 ? 'right' : 'left';
        const lx = cx > padL + plotW * 0.72 ? cx - r - 4 : cx + r + 4;
        ctx.fillText(item.name.split('(')[0].trim(), lx, cy + 3);
      }
    });

    // Bubble size legend
    ctx.font = '400 9px "JetBrains Mono", monospace';
    ctx.fillStyle = pal.faint;
    ctx.textAlign = 'right';
    ctx.fillText('Bubble size = In-hospital mortality (%)', padL + plotW, 13);
  }

  function getOncoVals(item) {
    if (BURDEN.oncoSex === 'm') return { inc: item.incM, deaths: item.deathsM };
    if (BURDEN.oncoSex === 'f') return { inc: item.incF, deaths: item.deathsF };
    return { inc: item.incAll, deaths: item.deathsAll };
  }

  function drawOncoCanvas(APP, E) {
    const setup = APP.setupCanvas('onco-canvas-wrap', 'onco-canvas');
    if (!setup) return;
    const { ctx, w, h } = setup;
    const pal = APP.palette();
    BURDEN.oncoHits = [];

    const padL = 42, padR = 20, padT = 22, padB = 34;
    const plotW = Math.max(80, w - padL - padR);
    const plotH = Math.max(80, h - padT - padB);

    const maxInc = BURDEN.oncoSex === 'all' ? 8000 : 7800;
    const xOf = inc => padL + (Math.min(maxInc, inc) / maxInc) * plotW;
    const yOf = surv => padT + plotH - (surv / 100) * plotH;
    const rOf = deaths => 5 + Math.sqrt(Math.max(10, deaths)) * 0.34;

    // 50% survival reference line
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = pal.dark ? 'rgba(244,63,94,0.35)' : 'rgba(225,29,72,0.30)';
    const y50 = Math.round(yOf(50)) + 0.5;
    ctx.beginPath(); ctx.moveTo(padL, y50); ctx.lineTo(padL + plotW, y50); ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = 1;
    ctx.font = '400 9px "JetBrains Mono", monospace';
    [0, 25, 50, 75, 100].forEach(s => {
      const y = Math.round(yOf(s)) + 0.5;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke();
      ctx.fillStyle = pal.faint;
      ctx.textAlign = 'right';
      ctx.fillText(s + '%', padL - 6, y + 3);
    });
    [0, 2000, 4000, 6000, 8000].forEach(v => {
      if (v > maxInc) return;
      const x = Math.round(xOf(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + plotH); ctx.stroke();
      ctx.fillStyle = pal.faint;
      ctx.textAlign = 'center';
      ctx.fillText(v === 0 ? '0' : (v / 1000) + 'k', x, padT + plotH + 14);
    });

    ctx.fillStyle = pal.muted;
    ctx.font = '500 9.5px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Annual New Cases in Switzerland (NKRS)', padL + plotW / 2, h - 5);
    ctx.save();
    ctx.translate(12, padT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('5-Year Relative Survival', 0, 0);
    ctx.restore();

    const items = E.NKRS_ONCOLOGY.filter(x => getOncoVals(x).inc > 0);
    items.sort((a, b) => getOncoVals(b).deaths - getOncoVals(a).deaths).forEach(item => {
      const vals = getOncoVals(item);
      const cx = xOf(vals.inc);
      const cy = yOf(item.surv5);
      const r = rOf(vals.deaths);
      const active = item.id === BURDEN.oncoHover || item.id === BURDEN.oncoSel;
      BURDEN.oncoHits.push({ cx, cy, r: Math.max(10, r + 4), item });

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = item.col;
      ctx.globalAlpha = active ? 0.92 : 0.65;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = active ? 2 : 1;
      ctx.strokeStyle = active ? pal.text : item.col;
      ctx.stroke();

      if (active || vals.inc >= 1500 || item.surv5 <= 26) {
        ctx.font = `${active ? '600' : '500'} 9.5px "Inter", sans-serif`;
        ctx.fillStyle = active ? pal.text : pal.muted;
        ctx.textAlign = cx > padL + plotW * 0.72 ? 'right' : 'left';
        const lx = cx > padL + plotW * 0.72 ? cx - r - 4 : cx + r + 4;
        ctx.fillText(item.name, lx, cy + 3);
      }
    });

    ctx.font = '400 9px "JetBrains Mono", monospace';
    ctx.fillStyle = pal.faint;
    ctx.textAlign = 'right';
    ctx.fillText('Bubble size = Annual deaths', padL + plotW, 13);
  }

  function renderGBDBars(APP, E) {
    const box = APP.el('gbd-bars');
    if (!box) return;
    const maxVal = 13;

    box.innerHTML = E.GBD_BURDEN.map((g, idx) => {
      const yllPct = (g.yll / maxVal) * 100;
      const yldPct = (g.yld / maxVal) * 100;
      return `
        <button type="button" data-gidx="${idx}" class="gbd-row w-full text-left grid grid-cols-12 items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-100/70 dark:hover:bg-zinc-900/60 transition-colors">
          <div class="col-span-4 text-[11.5px] font-medium text-zinc-800 dark:text-zinc-200 truncate">${APP.esc(g.name)}</div>
          <div class="col-span-4 flex items-center justify-end gap-1.5">
            <span class="font-mono text-[10px] text-rose-500 tabular-nums w-8 text-right">${g.yll > 0 ? g.yll.toFixed(1) : '—'}</span>
            <div class="flex-1 h-2.5 bg-zinc-100 dark:bg-zinc-900 rounded-l-full overflow-hidden flex justify-end">
              <div class="h-full bg-rose-500/85 rounded-l-full" style="width:${yllPct.toFixed(1)}%"></div>
            </div>
          </div>
          <div class="col-span-4 flex items-center gap-1.5">
            <div class="flex-1 h-2.5 bg-zinc-100 dark:bg-zinc-900 rounded-r-full overflow-hidden">
              <div class="h-full bg-amber-500/85 rounded-r-full" style="width:${yldPct.toFixed(1)}%"></div>
            </div>
            <span class="font-mono text-[10px] text-amber-500 tabular-nums w-8">${g.yld > 0 ? g.yld.toFixed(1) : '—'}</span>
          </div>
        </button>
      `;
    }).join('');

    box.querySelectorAll('.gbd-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const g = E.GBD_BURDEN[Number(btn.dataset.gidx)];
        if (!g) return;
        APP.setInspector({
          badge: 'GBD Switzerland · DALY Split',
          title: g.name,
          sub: `YLL (Mortality): ${g.yll.toFixed(1)}% · YLD (Disability): ${g.yld.toFixed(1)}%`,
          sections: [
            { label: 'Killers vs. Disablers Insight', text: g.note },
            { label: 'Why This Matters', text: 'Mortality tables hide chronic conditions (back pain, depression, migraine) that dominate Swiss outpatient medicine and economic burden.' },
          ],
        });
      });
    });
  }

  function renderOncoSexBtns(APP, E) {
    document.querySelectorAll('.onco-sex-btn').forEach(b => {
      const active = b.dataset.sex === BURDEN.oncoSex;
      b.className = `onco-sex-btn px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
        active ? 'bg-white dark:bg-zinc-800 text-tealLight dark:text-tealDark font-semibold shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
      }`;
    });
  }

  V.burden = {
    init(APP, E) {
      const wCan = APP.el('ward-canvas');
      if (wCan) {
        wCan.addEventListener('mousemove', e => {
          const r = wCan.getBoundingClientRect();
          const x = e.clientX - r.left, y = e.clientY - r.top;
          let hit = null, best = Infinity;
          for (const h of BURDEN.wardHits) {
            const d = Math.hypot(x - h.cx, y - h.cy);
            if (d <= h.r && d < best) { best = d; hit = h.item.id; }
          }
          if (hit !== BURDEN.wardHover) {
            BURDEN.wardHover = hit;
            wCan.style.cursor = hit ? 'pointer' : 'default';
            drawWardCanvas(APP, E);
          }
        });
        wCan.addEventListener('mouseleave', () => { BURDEN.wardHover = null; drawWardCanvas(APP, E); });
        wCan.addEventListener('click', () => {
          if (!BURDEN.wardHover) return;
          const it = E.WARD_BURDEN.find(x => x.id === BURDEN.wardHover);
          if (!it) return;
          BURDEN.wardSel = it.id;
          drawWardCanvas(APP, E);
          APP.setInspector({
            badge: `BFS Hospital Stats · ${it.cat}`,
            title: it.name,
            sub: `${it.admK}k admissions/yr · Mean stay ${it.los} d · In-hospital mort. ${it.mort}%`,
            sections: [
              { label: 'Ward Burden Takeaway', text: it.note },
              { label: 'Estimated Swiss Bed-Days', text: `~${APP.fmtNum(Math.round(it.admK * 1000 * it.los))} inpatient bed-days per year.` },
            ],
          });
        });
      }

      document.querySelectorAll('.onco-sex-btn').forEach(b => {
        b.addEventListener('click', () => {
          BURDEN.oncoSex = b.dataset.sex;
          renderOncoSexBtns(APP, E);
          drawOncoCanvas(APP, E);
        });
      });

      const oCan = APP.el('onco-canvas');
      if (oCan) {
        oCan.addEventListener('mousemove', e => {
          const r = oCan.getBoundingClientRect();
          const x = e.clientX - r.left, y = e.clientY - r.top;
          let hit = null, best = Infinity;
          for (const h of BURDEN.oncoHits) {
            const d = Math.hypot(x - h.cx, y - h.cy);
            if (d <= h.r && d < best) { best = d; hit = h.item.id; }
          }
          if (hit !== BURDEN.oncoHover) {
            BURDEN.oncoHover = hit;
            oCan.style.cursor = hit ? 'pointer' : 'default';
            drawOncoCanvas(APP, E);
          }
        });
        oCan.addEventListener('mouseleave', () => { BURDEN.oncoHover = null; drawOncoCanvas(APP, E); });
        oCan.addEventListener('click', () => {
          if (!BURDEN.oncoHover) return;
          const it = E.NKRS_ONCOLOGY.find(x => x.id === BURDEN.oncoHover);
          if (!it) return;
          BURDEN.oncoSel = it.id;
          drawOncoCanvas(APP, E);
          const vals = getOncoVals(it);
          APP.setInspector({
            badge: `NKRS Oncology · Median Age ${it.medAge} y`,
            title: `${it.name} Cancer`,
            sub: `${APP.fmtNum(vals.inc)} new/yr · ${APP.fmtNum(vals.deaths)} deaths/yr · 5-yr surv. ${it.surv5}%`,
            sections: [
              { label: 'Swiss Screening Status', text: it.screen },
              { label: 'Clinical Red Flags', text: it.redFlags },
            ],
            anki: `NKRS Swiss Oncology — {{c1::${it.name} Cancer}}: ~{{c2::${APP.fmtNum(it.incAll)}}} new/yr, ~${APP.fmtNum(it.deathsAll)} deaths/yr, 5-yr survival {{c3::${it.surv5}%}}. Screening: ${it.screen}`,
          });
        });
      }
    },
    render(APP, E) {
      renderOncoSexBtns(APP, E);
      drawWardCanvas(APP, E);
      drawOncoCanvas(APP, E);
      renderGBDBars(APP, E);
      APP.updateKPI('#1 Disabler (YLD)', 'Back Pain', 'Psych stays avg 33.5 days');
    },
    redraw(APP, E) {
      drawWardCanvas(APP, E);
      drawOncoCanvas(APP, E);
    },
  };

})(window.EPI_VIEWS);
