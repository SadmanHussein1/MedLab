  function ensureTopojsonClient() {
    if (window.topojson) return Promise.resolve(window.topojson);
    return new Promise(resolve => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js';
      s.onload = () => resolve(window.topojson || null);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
  }

  function geojsonToPath(geom, proj) {
    const ringStr = r => 'M' + r.map(pt => { const [x, y] = proj(pt); return x.toFixed(1) + ',' + y.toFixed(1); }).join('L') + 'Z';
    if (!geom) return '';
    if (geom.type === 'Polygon') return geom.coordinates.map(ringStr).join('');
    if (geom.type === 'MultiPolygon') return geom.coordinates.flatMap(poly => poly.map(ringStr)).join('');
    return '';
  }

  function centroidOfGeo(geom, proj) {
    let best = { x: 400, y: 260, area: -1 };
    const polys = geom.type === 'Polygon' ? [geom.coordinates] : (geom.type === 'MultiPolygon' ? geom.coordinates : []);
    for (const poly of polys) {
      if (!poly[0] || poly[0].length < 3) continue;
      const pts = poly[0].map(proj);
      const c = ringCentroid(pts);
      if (c.area > best.area) best = c;
    }
    return best;
  }

  async function loadHiResSwissMap(APP, E) {
    if (MAP.hiResLoaded || MAP.hiResLoading) return;
    MAP.hiResLoading = true;
    const tj = await ensureTopojsonClient();
    const urls = [
      'https://unpkg.com/swiss-maps/2021-07/ch-combined.json',
      'https://cdn.jsdelivr.net/npm/swiss-maps@1.0.1/topo/ch-cantons.json',
    ];
    let topo = null;
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) { topo = await res.json(); break; }
      } catch (_) {}
    }
    MAP.hiResLoading = false;
    if (!topo || !topo.objects) return;

    const objKey = topo.objects.cantons ? 'cantons' : Object.keys(topo.objects).find(k => /canton/i.test(k));
    if (!objKey) return;

    let features = [];
    if (tj && typeof tj.feature === 'function') {
      features = tj.feature(topo, topo.objects[objKey]).features || [];
    } else {
      const arcs = decodeTopoArcs(topo);
      features = (topo.objects[objKey].geometries || []).map(g => ({
        id: g.id, properties: g.properties || {},
        geometry: { type: g.type, coordinates: g.arcs.map(r => r.map(idx => idx >= 0 ? arcs[idx] : [...arcs[~idx]].reverse()).flat()) }
      }));
    }

    const byCode = {};
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const scanCoords = c => {
      if (!Array.isArray(c)) return;
      if (typeof c[0] === 'number') {
        if (c[0] < minX) minX = c[0]; if (c[0] > maxX) maxX = c[0];
        if (c[1] < minY) minY = c[1]; if (c[1] > maxY) maxY = c[1];
      } else c.forEach(scanCoords);
    };

    for (const f of features) {
      const props = f.properties || {};
      const code = props.abbr || BFS_TO_CODE[Number(f.id ?? props.id ?? props.KANTONSNR)];
      if (!code) continue;
      byCode[code] = f.geometry;
      scanCoords(f.geometry.coordinates);
    }

    if (!Object.keys(byCode).length || !Number.isFinite(minX)) return;

    const shC = byCode.SH ? centroidOfGeo(byCode.SH, p => p) : { y: 0 };
    const geC = byCode.GE ? centroidOfGeo(byCode.GE, p => p) : { y: 1 };
    const flipY = shC.y > geC.y;

    const pad = 16;
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const scale = Math.min((800 - pad * 2) / spanX, (520 - pad * 2) / spanY);
    const offX = (800 - spanX * scale) / 2;
    const offY = (520 - spanY * scale) / 2;
    const proj = ([x, y]) => [offX + (x - minX) * scale, flipY ? offY + (maxY - y) * scale : offY + (y - minY) * scale];

    for (const c of E.CANTONS) {
      const geom = byCode[c.id];
      if (!geom) continue;
      const dStr = geojsonToPath(geom, proj);
      if (!dStr) continue;
      c.d = dStr;
      const cent = centroidOfGeo(geom, proj);
      if (cent.area > 0) { c.lx = Math.round(cent.x); c.ly = Math.round(cent.y); }
      if (c.id === 'SG') { c.lx -= 16; c.ly += 20; }
      if (c.id === 'BL') { c.lx += 6; c.ly += 6; }
    }

    const lakeKey = topo.objects.lakes ? 'lakes' : Object.keys(topo.objects).find(k => /lake/i.test(k));
    if (lakeKey && tj && typeof tj.feature === 'function') {
      const lFeats = tj.feature(topo, topo.objects[lakeKey]).features || [];
      const lakePaths = lFeats.map(lf => geojsonToPath(lf.geometry, proj)).filter(Boolean);
      if (lakePaths.length) E.CH_MAP.lakes = lakePaths;
    }

    MAP.hiResLoaded = true;
    if (APP.state.tab === 'map') renderMapSVG(APP, E);
  }
