/* Gráficos chicos para las diapositivas de texto (portada, cierre, pregunta, definiciones, bloque 4). */

const ILUS = {
  diario() {
    if (!this._d) this._d = U.serie(DATA.subteDiario.inicio, DATA.subteDiario.total);
    return this._d;
  },
  semanal() {
    if (this._s) return this._s;
    const sem = d3.rollups(this.diario().filter((d) => d.valor != null), (v) => d3.mean(v, (d) => d.valor), (d) => +d3.utcMonday.floor(d.fecha));
    this._s = sem.map(([t, v]) => ({ fecha: new Date(t), valor: v })).sort((a, b) => a.fecha - b.fecha);
    return this._s;
  },
  base(extra) {
    return U.plotBase({ marginLeft: 0, marginRight: 0, marginTop: 10, marginBottom: 30, style: { fontFamily: "IBM Plex Sans, sans-serif", fontSize: "15px", color: U.COLORES.ink3, background: "transparent", overflow: "visible" }, ...extra });
  },
  pintar(el, nodo) { el.replaceChildren(nodo); return {}; },
};

/* Trece años de pasajeros, promedio semanal */
DEMOS.ilusSerie = {
  montar(el) {
    const s = ILUS.semanal();
    return ILUS.pintar(el, Plot.plot(ILUS.base({
      width: +el.dataset.ancho || 760, height: +el.dataset.alto || 360,
      x: { label: null, ticks: d3.utcYear.every(2), tickFormat: d3.utcFormat("%Y") },
      y: { axis: null, domain: [0, 1.3e6] },
      marks: [
        Plot.ruleY([0], { stroke: U.COLORES.rule }),
        Plot.lineY(s, { x: "fecha", y: "valor", stroke: U.COLORES.ink3, strokeWidth: 1.6 }),
      ],
    })));
  },
};

/* La pregunta: las últimas ocho semanas con datos y un lunes sin dato */
DEMOS.ilusPregunta = {
  montar(el) {
    const d = ILUS.diario().filter((p) => p.valor != null && p.fecha >= U.dia("2026-07-06"));
    const filas = d.map((p, i) => ({ ...p, i }));
    const n = filas.length, xq = n + 6;
    const ticks = filas.filter((p) => p.fecha.getUTCDate() === 1 || +p.fecha === +filas[0].fecha);
    return ILUS.pintar(el, Plot.plot(ILUS.base({
      width: 620, height: 420, marginBottom: 36,
      x: { axis: null, domain: [-1, xq + 2] },
      y: { axis: null, domain: [0, 1e6] },
      marks: [
        Plot.ruleY([0], { stroke: U.COLORES.rule }),
        Plot.lineY(filas, { x: "i", y: "valor", stroke: U.COLORES.ink3, strokeWidth: 1.4 }),
        Plot.dot(filas.filter((p) => p.fecha.getUTCDay() === 1), { x: "i", y: "valor", r: 4, fill: U.COLORES.ink }),
        Plot.text(ticks, { x: "i", y: 0, dy: 18, text: (p) => (p.fecha.getUTCDate() === 1 ? U.MESES[p.fecha.getUTCMonth()] : "julio"), textAnchor: "start", fill: U.COLORES.ink3 }),
        Plot.text([{ x: n + 2.2 }], { x: "x", y: 360e3, text: () => "···", fill: U.COLORES.ink3, fontSize: 30 }),
        Plot.text([{ x: xq }], { x: "x", y: 470e3, text: () => "?", fill: U.COLORES.B, fontSize: 96, fontFamily: "Fraunces, serif", fontWeight: 600 }),
        Plot.text([{ x: xq }], { x: "x", y: 0, dy: 18, text: () => "lunes 23/11", fill: U.COLORES.ink, fontWeight: 600 }),
        Plot.text([{ x: 0 }], { x: "x", y: 1e6, text: () => "pasajeros por día; puntos: lunes", textAnchor: "start", fill: U.COLORES.ink3 }),
      ],
    })));
  },
};

/* El orden importa: cuatro semanas en orden y las mismas filas mezcladas */
DEMOS.ilusOrden = {
  montar(el) {
    const d = U.recortar(ILUS.diario(), "2025-05-05", "2025-06-01").map((p, i) => ({ ...p, i }));
    const rng = d3.randomLcg(7);
    const mezcla = d3.shuffler(rng)(d.map((p) => p.valor)).map((v, i) => ({ i, valor: v }));
    const panel = (filas, titulo) => Plot.plot(ILUS.base({
      width: 660, height: 210, marginTop: 34,
      x: { axis: null }, y: { axis: null, domain: [0, 1e6] },
      marks: [
        Plot.ruleY([0], { stroke: U.COLORES.rule }),
        Plot.lineY(filas, { x: "i", y: "valor", stroke: U.COLORES.ink3, strokeWidth: 1.4 }),
        Plot.dot(filas, { x: "i", y: "valor", r: 3, fill: U.COLORES.ink }),
        Plot.text([titulo], { frameAnchor: "top-left", dy: -28, text: (t) => t, fill: U.COLORES.ink2, fontSize: 16 }),
      ],
    }));
    const c = U.el("div", { style: "display:flex; gap:56px;" });
    c.append(panel(d, "Mayo de 2025, en orden"), panel(mezcla, "Los mismos 28 días, mezclados"));
    return ILUS.pintar(el, c);
  },
};

/* Aditiva y multiplicativa, series simuladas */
DEMOS.ilusComponentes = {
  montar(el) {
    const N = 84;
    const filas = d3.range(N).map((t) => {
      const T = 10 + (t / N) * 22, S = Math.sin((2 * Math.PI * t) / 7);
      return { t, tend: T, adit: T + 4 * S, mult: T * (1 + 0.3 * S) };
    });
    const panel = (k, titulo) => Plot.plot(ILUS.base({
      width: 660, height: 200, marginTop: 34,
      x: { axis: null }, y: { axis: null, domain: [0, 44] },
      marks: [
        Plot.lineY(filas, { x: "t", y: "tend", stroke: U.COLORES.ink3, strokeDasharray: "4,4" }),
        Plot.lineY(filas, { x: "t", y: k, stroke: U.COLORES.ink, strokeWidth: 1.6 }),
        Plot.text([titulo], { frameAnchor: "top-left", dy: -28, text: (t) => t, fill: U.COLORES.ink2, fontSize: 16 }),
      ],
    }));
    const c = U.el("div", { style: "display:flex; gap:56px;" });
    c.append(panel("adit", "Aditiva: el ciclo tiene siempre el mismo ancho"), panel("mult", "Multiplicativa: el ciclo crece con el nivel"));
    return ILUS.pintar(el, c);
  },
};

/* Bloque 2: la serie y su tendencia */
DEMOS.ilusPiezas = {
  montar(el) {
    const d = U.recortar(ILUS.diario(), "2023-01-01", "2025-12-31");
    const mm = U.mediaMovil(d.map((p) => p.valor), 365, true);
    const prom = d3.rollups(d.filter((p) => p.valor != null), (v) => d3.mean(v, (p) => p.valor), (p) => (p.fecha.getUTCDay() + 6) % 7)
      .sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ k: ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"][k], v }));
    const arriba = Plot.plot(ILUS.base({
      width: 640, height: 220, marginBottom: 26,
      x: { label: null, ticks: d3.utcYear.every(1), tickFormat: d3.utcFormat("%Y") }, y: { axis: null, domain: [0, 1.1e6] },
      marks: [
        Plot.lineY(d, { x: "fecha", y: "valor", stroke: U.COLORES.rule, strokeWidth: 0.8 }),
        Plot.lineY(d.map((p, i) => ({ fecha: p.fecha, v: mm[i] })), { x: "fecha", y: "v", stroke: U.COLORES.ink, strokeWidth: 2 }),
      ],
    }));
    const abajo = Plot.plot(ILUS.base({
      width: 640, height: 190, marginTop: 56,
      x: { label: null, domain: prom.map((p) => p.k), padding: 0.25 }, y: { axis: null },
      marks: [
        Plot.barY(prom, { x: "k", y: "v", fill: U.COLORES.ink3 }),
        Plot.text(["Promedio por día de la semana"], { frameAnchor: "top-left", dy: -26, text: (t) => t, fill: U.COLORES.ink2, fontSize: 16 }),
      ],
    }));
    const c = U.el("div");
    const t = U.el("div", { style: "font-size:16px; color:var(--ink-2); margin-bottom:4px;" }, "Pasajeros por día y media móvil de 365 días, 2023 a 2025");
    c.append(t, arriba, abajo);
    return ILUS.pintar(el, c);
  },
};

/* Bloque 3: autocorrelación del total diario */
DEMOS.ilusAcf = {
  montar(el) {
    const v = U.recortar(ILUS.diario(), "2023-01-01", "2025-12-31").map((p) => p.valor);
    const m = d3.mean(v), den = d3.sum(v, (x) => (x == null ? 0 : (x - m) ** 2));
    const acf = d3.range(1, 36).map((k) => {
      let s = 0;
      for (let i = k; i < v.length; i++) if (v[i] != null && v[i - k] != null) s += (v[i] - m) * (v[i - k] - m);
      return { k, r: s / den };
    });
    return ILUS.pintar(el, Plot.plot(ILUS.base({
      width: 640, height: 360, marginTop: 40, marginLeft: 40,
      x: { label: null, ticks: [7, 14, 21, 28, 35], tickFormat: (d) => d }, y: { label: null, domain: [-0.5, 1], ticks: [0, 0.5, 1], tickFormat: (d) => U.fmt(d, 1) },
      marks: [
        Plot.ruleY([0], { stroke: U.COLORES.rule }),
        Plot.ruleX(acf, { x: "k", y1: 0, y2: "r", stroke: (d) => (d.k % 7 === 0 ? U.COLORES.B : U.COLORES.ink3), strokeWidth: 6 }),
        Plot.text(["Correlación de cada día con el de hace k días (k = 1 a 35), 2023 a 2025"], { frameAnchor: "top-left", dy: -36, text: (t) => t, fill: U.COLORES.ink2, fontSize: 16 }),
      ],
    })));
  },
};

/* Bloque 4: entrenamiento y prueba del ejercicio */
DEMOS.ilusParticion = {
  montar(el) {
    const d = U.recortar(ILUS.diario(), "2023-01-01", "2025-06-28");
    const corte = U.dia("2025-06-01");
    const ent = d.filter((p) => p.fecha < corte), pru = d.filter((p) => p.fecha >= corte);
    return ILUS.pintar(el, Plot.plot(ILUS.base({
      width: 1456, height: 300, marginTop: 34,
      x: { label: null, ticks: d3.utcMonth.every(6), tickFormat: (t) => `${["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][t.getUTCMonth()]} ${t.getUTCFullYear()}` },
      y: { axis: null, domain: [0, 1.15e6] },
      marks: [
        Plot.ruleX([corte], { stroke: U.COLORES.ink, strokeDasharray: "3,3" }),
        Plot.lineY(ent, { x: "fecha", y: "valor", stroke: U.COLORES.ink3, strokeWidth: 0.8 }),
        Plot.lineY(pru, { x: "fecha", y: "valor", stroke: U.COLORES.B, strokeWidth: 1.4 }),
        Plot.text([{ x: U.dia("2024-03-15") }], { x: "x", y: 1.15e6, text: () => "entrenamiento", fill: U.COLORES.ink2, fontSize: 16 }),
        Plot.text([{ x: corte }], { x: "x", y: 1.15e6, dx: 10, text: () => "prueba", textAnchor: "start", fill: U.COLORES.B, fontSize: 16 }),
      ],
    })));
  },
};
