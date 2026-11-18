/* Pronósticos de referencia para junio de 2025, calculados en el navegador a partir de abril y mayo. */
DEMOS.referencias = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    el.classList.add("b4");
    const P = DATA.modelos.pronosticos;
    const hist = B4.historia();
    const jun = B4.junio();
    const h = jun.length;
    const H = hist.map((d) => d.valor);
    const n = H.length;
    const ult = hist[n - 1];

    const REFS = [
      {
        id: "ing", nombre: "Ingenuo", color: U.COLORES.modelo,
        pred: jun.map(() => H[n - 1]),
        texto: `<b>Ingenuo</b>: repite el último dato, ${B4.fechaDia(ult.fecha)} (${B4.num(ult.valor)}), en los ${h} días.`,
      },
      {
        id: "est", nombre: "Ingenuo estacional", color: U.COLORES.C,
        pred: jun.map((_, i) => H[n - 7 + (i % 7)]),
        texto: `<b>Ingenuo estacional</b>: repite la última semana, del ${B4.fechaDia(hist[n - 7].fecha)} al ${B4.fechaDia(ult.fecha)}.`,
      },
      {
        id: "prom", nombre: "Promedio de 4 semanas", color: U.COLORES.D,
        pred: jun.map((_, i) => [1, 2, 3, 4].reduce((s, w) => s + H[n - 7 * w + (i % 7)], 0) / 4),
        texto: `<b>Promedio de 4 semanas</b>: para cada día de la semana, el promedio de ese día entre el ${B4.fechaDia(hist[n - 28].fecha)} y el ${B4.fechaDia(ult.fecha)}.`,
      },
    ];
    REFS.forEach((r) => (r.m = B4.metricas(P.real, r.pred)));

    const activos = new Set(["ing"]);
    let ultimo = "ing";

    /* Feriados del período visible */
    const desde = hist[0].fecha, hasta = jun[h - 1].fecha;
    const feriados = [];
    for (let d = desde; d <= hasta; d = U.sumarDias(d, 1)) if (B4.esFeriado(d)) feriados.push(d);
    const ferJunio = feriados.filter((f) => f >= jun[0].fecha);
    const ferResto = feriados.filter((f) => f < jun[0].fecha);

    /* Panel con la tabla */
    const grid = U.el("div", { class: "b4-grid" });
    const izq = U.el("div");
    const panel = U.el("div", { class: "b4-panel" });
    grafico.replaceWith(grid);
    grid.append(izq, panel);
    izq.append(grafico);
    const tabla = U.el("table", { class: "b4-tabla" });
    panel.append(U.el("h4", {}, "Junio de 2025, 28 días"), tabla,
      U.el("div", { class: "b4-nota" }, "MAE: error absoluto medio, en pasajeros por día. MAPE: error absoluto medio en porcentaje del valor real."));

    function dibujarTabla() {
      tabla.innerHTML = "<thead><tr><th>Referencia</th><th>MAE</th><th>MAPE</th></tr></thead>";
      const tb = U.el("tbody");
      REFS.forEach((r) => {
        const tr = U.el("tr", { class: activos.has(r.id) ? "" : "tenue" });
        tr.innerHTML = `<td><span class="b4-muestra" style="background:${r.color}"></span>${r.nombre}</td><td>${B4.num(r.m.MAE)}</td><td>${B4.pct(r.m.MAPE)}</td>`;
        tb.append(tr);
      });
      tabla.append(tb);
    }

    function dibujar() {
      const vis = REFS.filter((r) => activos.has(r.id));
      const lineas = vis.map((r) => Plot.lineY(jun.map((d, i) => ({ fecha: d.fecha, v: r.pred[i] })), { x: "fecha", y: "v", stroke: r.color, strokeWidth: 2.2 }));
      const filasTip = [
        ...hist.map((d) => ({ fecha: d.fecha, v: d.valor, titulo: `${U.fechaCorta(d.fecha)} (${B4.DIAS3[d.fecha.getUTCDay()]})\nreal: ${B4.num(d.valor)}` })),
        ...jun.map((d, i) => ({
          fecha: d.fecha, v: d.real,
          titulo: `${U.fechaCorta(d.fecha)} (${B4.DIAS3[d.fecha.getUTCDay()]})${d.feriado ? ", feriado" : ""}\nreal: ${B4.num(d.real)}` + vis.map((r) => `\n${r.nombre.toLowerCase()}: ${B4.num(r.pred[i])}`).join(""),
        })),
      ];
      const plot = Plot.plot(U.plotBase({
        width: 1024, height: 560, marginLeft: 64, marginTop: 28,
        x: { label: null, domain: [U.sumarDias(desde, -1), U.sumarDias(hasta, 1)], tickFormat: (d) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}`, ticks: d3.utcWeek.every(1) },
        y: { grid: true, tickFormat: U.tickM, label: null, domain: [0, 1.15e6] },
        marks: [
          ...B4.marcasFeriados(ferResto, { alto: 1.15e6, rotulo: false }),
          ...B4.marcasFeriados(ferJunio, { alto: 1.15e6 }),
          Plot.ruleX([U.sumarDias(jun[0].fecha, -0.5)], { stroke: U.COLORES.ink3, strokeDasharray: "3,3" }),
          Plot.text([U.sumarDias(jun[0].fecha, -0.5)], { x: (d) => d, y: 1.15e6, text: () => "pronóstico →", dx: 6, dy: -8, textAnchor: "start", fontSize: 16, fill: U.COLORES.ink2 }),
          Plot.lineY(hist, { x: "fecha", y: "valor", stroke: U.COLORES.ink3, strokeWidth: 1.2 }),
          Plot.dot(hist, { x: "fecha", y: "valor", r: 2, fill: U.COLORES.ink3 }),
          Plot.lineY(jun, { x: "fecha", y: "real", stroke: U.COLORES.real, strokeWidth: 1.8, strokeDasharray: "1.5,4", strokeLinecap: "round" }),
          Plot.dot(jun, { x: "fecha", y: "real", r: 2.6, fill: U.COLORES.real }),
          ...lineas,
          Plot.ruleY([0], { stroke: U.COLORES.rule }),
          Plot.tip(filasTip, Plot.pointerX({ x: "fecha", y: "v", title: "titulo" })),
        ],
      }));
      U.reemplazar(grafico, plot);
      dibujarTabla();

      const r = REFS.find((x) => x.id === ultimo && activos.has(x.id)) || vis[vis.length - 1];
      if (!r) { lectura.innerHTML = "Sin referencias visibles."; return; }
      let peor = 0;
      r.pred.forEach((p, i) => { if (Math.abs(P.real[i] - p) > Math.abs(P.real[peor] - r.pred[peor])) peor = i; });
      const d = jun[peor];
      lectura.innerHTML = `${r.texto} Mayor error: ${B4.fechaDia(d.fecha)}${d.feriado ? " (feriado)" : ""}, pronóstico de <b>${B4.num(r.pred[peor])}</b> contra <b>${B4.num(d.real)}</b> pasajeros reales.`;
    }

    controles.append(
      B4.alternar(REFS.map((r) => [r.id, r.nombre, r.color]), activos, (id, on) => {
        on ? activos.add(id) : activos.delete(id);
        if (on) ultimo = id;
        dibujar();
      }),
      U.el("span", { class: "b4-sep" }),
      B4.leyenda([["linea", U.COLORES.ink3, "abril y mayo"], ["punteada", U.COLORES.real, "real de junio"]], "width:auto; font-size:1em;"),
    );
    dibujar();
    return {};
  },
};
