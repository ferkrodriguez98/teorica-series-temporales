/* Bloque 5: variables externas. Lluvia en subte y Ecobici; puentes obligatorios y optativos. */
(function () {
  // Cociente entre cada día y la mediana del mismo día de la semana en las 4 semanas anteriores y las 4 siguientes
  const relativo = (valores) => valores.map((v, i) => {
    if (v == null) return null;
    const vec = [-28, -21, -14, -7, 7, 14, 21, 28].map((k) => valores[i + k]).filter((x) => x != null);
    return vec.length >= 5 ? v / d3.median(vec) : null;
  });
  const noHabiles = () => new Set(DATA.feriados.map((f) => f.fecha));

  DEMOS.lluvia = {
    montar(el) {
      const { controles, grafico, lectura } = U.armar(el);
      const S = DATA.subteDiario, E = DATA.ecobiciSeries;
      const sub = relativo(S.total), eco = relativo(E.viajes);
      const d0s = U.dia(S.inicio), d0e = U.dia(E.inicio);
      const offset = Math.round((d0s - d0e) / 864e5); // índice de Ecobici para el día 0 del subte
      const nh = noHabiles();
      const BINS = [[0, 0.1, "sin lluvia"], [1, 5, "1 a 5 mm"], [5, 15, "5 a 15 mm"], [15, 30, "15 a 30 mm"], [30, 1e9, "más de 30 mm"]];
      const filas = [];
      for (let i = 0; i < S.total.length; i++) {
        const fecha = U.sumarDias(d0s, i), iso = U.iso(fecha), j = i + offset;
        if (fecha < U.dia("2022-04-01") || fecha.getUTCDay() === 0 || fecha.getUTCDay() === 6 || nh.has(iso)) continue;
        const mm = E.lluvia_mm[j];
        if (mm == null) continue;
        const bin = BINS.find(([lo, hi]) => mm >= lo && mm < hi);
        if (!bin) continue;
        if (sub[i] != null) filas.push({ serie: "Subte", bin: bin[2], r: sub[i] });
        if (eco[j] != null) filas.push({ serie: "Ecobici", bin: bin[2], r: eco[j] });
      }
      const res = d3.rollups(filas, (v) => ({ med: d3.median(v, (d) => d.r), n: v.length }), (d) => d.serie, (d) => d.bin)
        .flatMap(([serie, bins]) => bins.map(([bin, o]) => ({ serie, bin, ...o })));
      const plot = Plot.plot(U.plotBase({
        height: 470, marginLeft: 70,
        fx: { domain: BINS.map((b) => b[2]), label: null, padding: 0.12 },
        x: { domain: ["Subte", "Ecobici"], axis: null, padding: 0.12 },
        y: { domain: [0, 1.15], grid: true, tickFormat: (d) => `${Math.round(d * 100)} %`, label: "respecto de un día normal" },
        color: { domain: ["Subte", "Ecobici"], range: [U.COLORES.C, U.COLORES.ecobici], legend: true },
        marks: [
          Plot.barY(res, { fx: "bin", x: "serie", y: "med", fill: "serie", rx: 4, insetLeft: 2, insetRight: 2 }),
          Plot.ruleY([1], { stroke: U.COLORES.ink, strokeDasharray: "4 4" }),
          Plot.text(res, { fx: "bin", x: "serie", y: "med", text: (d) => `${Math.round(d.med * 100)} %`, dy: -10, fill: U.COLORES.ink2, fontSize: 14 }),
          Plot.tip(res, Plot.pointer({ fx: "bin", x: "serie", y: "med", title: (d) => `${d.serie}, ${d.bin}\nmediana: ${Math.round(d.med * 100)} % de un día normal\n${d.n} días hábiles` })),
        ],
      }));
      U.reemplazar(grafico, plot);
      const g = (s, b) => res.find((d) => d.serie === s && d.bin === b);
      lectura.innerHTML = `Días hábiles no feriados desde abril de 2022. Con más de 30 mm, el subte queda en el <b>${Math.round(g("Subte", "más de 30 mm").med * 100)} %</b> de un día normal y Ecobici en el <b>${Math.round(g("Ecobici", "más de 30 mm").med * 100)} %</b> (${g("Ecobici", "más de 30 mm").n} días).`;
      return {};
    },
  };

  DEMOS.puentes = {
    montar(el) {
      const { grafico, lectura } = U.armar(el);
      const S = DATA.subteDiario, d0 = U.dia(S.inicio);
      const rel = relativo(S.total);
      const puentes = DATA.feriados.filter((f) => /turísticos/.test(f.tipo)).map((f) => {
        const i = Math.round((U.dia(f.fecha) - d0) / 864e5);
        return { fecha: U.dia(f.fecha), anio: +f.fecha.slice(0, 4), caracter: f.caracter === "feriado" ? "Feriado (descanso obligatorio)" : "No laborable (decide el empleador)", r: rel[i] };
      }).filter((p) => p.r != null && !(p.fecha >= U.dia("2020-03-01") && p.fecha < U.dia("2020-12-01")));
      const COL = { "Feriado (descanso obligatorio)": U.COLORES.C, "No laborable (decide el empleador)": U.COLORES.B };
      const plot = Plot.plot(U.plotBase({
        height: 470,
        x: { label: null, tickFormat: "d", domain: [2013, 2027] },
        y: { domain: [0, 0.7], grid: true, tickFormat: (d) => `${Math.round(d * 100)} %`, label: "pasajeros respecto de un día normal" },
        color: { domain: Object.keys(COL), range: Object.values(COL), legend: true },
        marks: [
          Plot.dot(puentes, { x: (d) => d.fecha.getUTCFullYear() + d.fecha.getUTCMonth() / 12, y: "r", fill: "caracter", r: 8, stroke: U.COLORES.surface, strokeWidth: 2 }),
          Plot.tip(puentes, Plot.pointer({ x: (d) => d.fecha.getUTCFullYear() + d.fecha.getUTCMonth() / 12, y: "r", title: (d) => `${U.fechaLarga(d.fecha)}\n${d.caracter}\n${Math.round(d.r * 100)} % de un día normal` })),
        ],
      }));
      U.reemplazar(grafico, plot);
      const med = (c) => Math.round(100 * d3.median(puentes.filter((p) => p.caracter === c), (p) => p.r));
      lectura.innerHTML = `Mediana: <b>${med(Object.keys(COL)[0])} %</b> cuando el puente fue feriado y <b>${med(Object.keys(COL)[1])} %</b> cuando fue día no laborable. Mismo tipo de día en el calendario, distinto efecto. Se excluyen los puentes de marzo a noviembre de 2020.`;
      return {};
    },
  };
})();
