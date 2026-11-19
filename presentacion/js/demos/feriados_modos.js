/* Un feriado no pesa igual en el subte y en Ecobici. Para cada domingo, feriado y día no laborable de lunes a viernes
   (abril de 2022 a agosto de 2026, sin lluvia), cuánto se viajó respecto de un día hábil comparable. */
DEMOS.feriadosModos = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    lectura.remove();
    const S = DATA.subteDiario, E = DATA.ecobiciSeries;
    const DESDE = "2022-04-01", HASTA = "2026-08-31";
    const sub = new Map(U.serie(S.inicio, S.total).map((d) => [U.iso(d.fecha), d.valor]));
    const eco = new Map(U.serie(E.inicio, E.viajes).map((d) => [U.iso(d.fecha), d.valor]));
    const llu = new Map(U.serie(E.inicio, E.lluvia_mm).map((d) => [U.iso(d.fecha), d.valor]));
    const fer = new Map(DATA.feriados.map((f) => [f.fecha, f]));
    const seco = (f) => (llu.get(f) ?? 0) < 1;
    const habilComun = (f) => { const w = U.dia(f).getUTCDay(); return w >= 1 && w <= 5 && !fer.has(f) && seco(f); };

    // Referencia: mediana de los días hábiles comunes de las dos semanas anteriores y las dos siguientes
    const referencia = (M, f) => {
      const vals = [];
      for (let k = -14; k <= 14; k++) {
        const g = U.iso(U.sumarDias(U.dia(f), k));
        if (k !== 0 && habilComun(g) && M.get(g) != null) vals.push(M.get(g));
      }
      return vals.length >= 5 ? d3.median(vals) : null;
    };
    const GRUPOS = ["Domingo", "Feriado de lunes a viernes", "No laborable de lunes a viernes"];
    const puntos = [];
    for (let d = U.dia(DESDE); d <= U.dia(HASTA); d = U.sumarDias(d, 1)) {
      const f = U.iso(d), w = d.getUTCDay();
      if (!seco(f)) continue;
      let g = null;
      if (w === 0 && !fer.has(f)) g = GRUPOS[0];
      else if (w >= 1 && w <= 5 && fer.has(f)) g = fer.get(f).caracter === "feriado" ? GRUPOS[1] : GRUPOS[2];
      if (!g) continue;
      [["Subte", sub], ["Ecobici", eco]].forEach(([modo, M]) => {
        const ref = referencia(M, f), v = M.get(f);
        if (ref && v != null) puntos.push({ grupo: g, modo, r: v / ref, fecha: d, nombre: fer.get(f)?.nombre || "domingo" });
      });
    }
    const med = (g, m) => d3.median(puntos.filter((p) => p.grupo === g && p.modo === m), (p) => p.r);
    const cuantos = (g) => puntos.filter((p) => p.grupo === g && p.modo === "Subte").length;
    const COL = { Subte: U.COLORES.C, Ecobici: U.COLORES.ecobici };
    // Desplazamiento horizontal estable para cada punto (sin azar, así la figura no cambia al recargar)
    puntos.forEach((p, i) => (p.j = ((i * 0.6180339887) % 1) - 0.5));

    const fila = U.el("div", { class: "fila-panel" });
    const panel = U.el("div", { class: "panel-der" });
    grafico.replaceWith(fila);
    fila.append(grafico, panel);
    controles.append(B4.leyenda([["punto", COL.Subte, "Subte"], ["punto", COL.Ecobici, "Ecobici"]], "width:auto;"));

    const x = (p) => GRUPOS.indexOf(p.grupo) * 3 + (p.modo === "Subte" ? 0.8 : 1.9) + p.j * 0.7;
    const medianas = GRUPOS.flatMap((g) => ["Subte", "Ecobici"].map((m) => ({ grupo: g, modo: m, r: med(g, m), j: 0 })));
    U.reemplazar(grafico, Plot.plot(U.plotBase({
      width: 1040, height: 560, marginTop: 30, marginBottom: 56, marginLeft: 70,
      x: { domain: [0, 9], axis: null },
      y: { grid: true, domain: [0, 1.2], ticks: [0, 0.2, 0.4, 0.6, 0.8, 1, 1.2], tickFormat: (d) => `${Math.round(d * 100)} %`, label: "respecto de un día hábil comparable", labelAnchor: "top", labelArrow: "none" },
      marks: [
        Plot.ruleY([1], { stroke: U.COLORES.ink3, strokeDasharray: "3 3" }),
        Plot.dot(puntos, { x, y: "r", r: 3.2, fill: (p) => COL[p.modo], fillOpacity: 0.45 }),
        Plot.ruleY(medianas, { x1: (m) => x(m) - 0.45, x2: (m) => x(m) + 0.45, y: "r", stroke: U.COLORES.ink, strokeWidth: 3 }),
        Plot.text(medianas, { x: (m) => x(m) + 0.5, y: "r", text: (m) => `${Math.round(m.r * 100)} %`, textAnchor: "start", fontSize: 17, fontWeight: 600, fill: U.COLORES.ink }),
        Plot.text(GRUPOS, { x: (g, i) => i * 3 + 1.35, y: 0, dy: 30, text: (g) => g, fontSize: 17, fill: U.COLORES.ink2 }),
        Plot.text(GRUPOS, { x: (g, i) => i * 3 + 1.35, y: 0, dy: 50, text: (g) => `${cuantos(g)} días`, fontSize: 15, fill: U.COLORES.ink3 }),
        Plot.tip(puntos, Plot.pointer({ x, y: "r", title: (p) => `${U.fechaCorta(p.fecha)}, ${p.nombre}\n${p.modo}: ${Math.round(p.r * 100)} % de un día hábil comparable` })),
      ],
    })));

    const pc = (g, m) => `${Math.round(med(g, m) * 100)} %`;
    panel.innerHTML =
      `<div>Cada punto es un día sin lluvia entre abril de 2022 y agosto de 2026, comparado con la mediana de los días hábiles comunes de las dos semanas anteriores y las dos siguientes. La raya es la mediana.</div>` +
      `<div>Un feriado de lunes a viernes deja al subte en el <b>${pc(GRUPOS[1], "Subte")}</b> de un día hábil, y a Ecobici en el <b>${pc(GRUPOS[1], "Ecobici")}</b>. Un domingo, <b>${pc(GRUPOS[0], "Subte")}</b> y <b>${pc(GRUPOS[0], "Ecobici")}</b>.</div>` +
      `<div>Una hipótesis: el subte se usa sobre todo para ir a trabajar o a estudiar, y la bici también para pasear. Va en contra del precio: desde 2021 Ecobici se paga los fines de semana y feriados.</div>` +
      `<div>En los dos, un día no laborable pesa menos que un feriado (subte ${pc(GRUPOS[2], "Subte")}, Ecobici ${pc(GRUPOS[2], "Ecobici")}), aunque son solo ${cuantos(GRUPOS[2])} días: en un no laborable cada empleador decide si se trabaja. Por eso el SARIMAX separa feriado, puente y no laborable.</div>`;
    return {};
  },
};
