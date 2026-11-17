/* Los seis modelos precalculados sobre junio de 2025: uno a la vez sobre el real, con banda del 80 %
   cuando existe, y la tabla de métricas de todos. */
DEMOS.comparacion = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    el.classList.add("b4");
    const P = DATA.modelos.pronosticos;
    const jun = B4.junio();
    const hist = B4.historia().filter((d) => d.fecha >= U.dia("2025-05-01"));
    const NOMBRES = Object.keys(P.modelos);
    const M = {};
    NOMBRES.forEach((n) => (M[n] = B4.metricas(P.real, P.modelos[n].pred)));
    let modelo = "SARIMAX", orden = { col: "MAPE", asc: true };

    const hw = P.modelos["Holt-Winters"].params, cx = P.modelos.SARIMAX.coef;
    const ordenSar = (P.modelos.SARIMA.orden || "").replace(/7$/, "₇");
    const DESC = {
      "Ingenuo": "repite el último dato de entrenamiento (sábado 31/5) en los 28 días.",
      "Ingenuo estacional": "repite la última semana de entrenamiento, del 25 al 31/5.",
      "Holt-Winters": `nivel, tendencia y ciclo semanal con suavizado exponencial; statsmodels estimó α = ${U.fmt(hw.smoothing_level, 3)}, β = ${U.fmt(hw.smoothing_trend, 0)} y γ = ${U.fmt(hw.smoothing_seasonal, 3)}.`,
      "SARIMA": `orden ${ordenSar}, autorregresivo y de medias móviles con una diferencia estacional de 7 días.`,
      "SARIMAX": `el mismo SARIMA con variables externas (feriados, puentes y no laborables de lunes a viernes, y lluvia). Coeficientes: feriado ${B4.signo(cx.feriado)}, puente ${B4.signo(cx.puente)}, lluvia ${B4.signo(cx.lluvia_mm)} por mm.`,
      "Gradient boosting": "árboles de decisión en secuencia sobre la serie convertida en tabla: rezagos de 28 días o más, calendario, feriados, lluvia y temperatura.",
    };

    const grid = U.el("div", { class: "b4-grid ancho-panel-420" });
    const izq = U.el("div");
    const panel = U.el("div", { class: "b4-panel" });
    grafico.replaceWith(grid);
    grid.append(izq, panel);
    const tabla = U.el("table", { class: "b4-tabla" });
    izq.append(B4.leyenda([["linea", U.COLORES.ink3, "mayo"], ["punteada", U.COLORES.real, "real de junio"], ["linea", U.COLORES.modelo, "pronóstico"], ["banda", U.COLORES.modelo + "2e", "intervalo del 80 %"]]), grafico);
    panel.append(U.el("h4", {}, "Junio de 2025, 28 días"), tabla, U.el("div", { class: "b4-nota" }, "Clic en una fila para ver el modelo; clic en una columna para ordenar."));

    const botones = U.botones(NOMBRES.map((n) => [n, n]), modelo, (v) => { modelo = v; dibujar(); });

    function dibujarTabla() {
      const cols = ["MAE", "RMSE", "MAPE"];
      const filas = NOMBRES.slice().sort((a, b) => (orden.asc ? 1 : -1) * (M[a][orden.col] - M[b][orden.col]));
      tabla.replaceChildren();
      const th = U.el("tr", {}, U.el("th", {}, "Modelo"));
      cols.forEach((c) => {
        const h = U.el("th", { class: "ordenable" + (orden.col === c ? " activa" : "") }, c);
        h.addEventListener("click", () => { orden = { col: c, asc: true }; dibujarTabla(); });
        th.append(h);
      });
      tabla.append(U.el("thead", {}, th));
      const tb = U.el("tbody");
      filas.forEach((n) => {
        const tr = U.el("tr", { class: "clic" + (n === modelo ? " elegida" : "") });
        tr.innerHTML = `<td>${n}</td><td>${B4.num(M[n].MAE)}</td><td>${B4.num(M[n].RMSE)}</td><td>${B4.pct(M[n].MAPE)}</td>`;
        tr.addEventListener("click", () => botones.elegir(n));
        tb.append(tr);
      });
      tabla.append(tb);
    }

    function dibujar() {
      const md = P.modelos[modelo];
      const filas = jun.map((d, i) => ({ ...d, p: md.pred[i], lo: md.lo ? md.lo[i] : null, hi: md.hi ? md.hi[i] : null }));
      const ferJ = jun.filter((d) => d.feriado).map((d) => d.fecha);
      const Y0 = -1.5e5, Y1 = 1.15e6;
      const plot = Plot.plot(U.plotBase({
        width: 980, height: 480, marginLeft: 64, marginTop: 28,
        x: { label: null, domain: [U.sumarDias(hist[0].fecha, -1), U.sumarDias(jun[jun.length - 1].fecha, 1)], tickFormat: (d) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}`, ticks: d3.utcWeek.every(1) },
        y: { grid: true, tickFormat: (d) => (d < 0 ? "−" : "") + U.tickM(Math.abs(d)), label: null, domain: [Y0, Y1] },
        marks: [
          ...B4.marcasFeriados(ferJ, { y1: Y0, alto: Y1 }),
          Plot.ruleX([U.sumarDias(jun[0].fecha, -0.5)], { stroke: U.COLORES.ink3, strokeDasharray: "3,3" }),
          md.lo ? Plot.areaY(filas, { x: "fecha", y1: "lo", y2: "hi", fill: U.COLORES.modelo, fillOpacity: 0.13, curve: "linear" }) : null,
          Plot.lineY(hist, { x: "fecha", y: "valor", stroke: U.COLORES.ink3, strokeWidth: 1.2 }),
          Plot.dot(hist, { x: "fecha", y: "valor", r: 2, fill: U.COLORES.ink3 }),
          Plot.lineY(jun, { x: "fecha", y: "real", stroke: U.COLORES.real, strokeWidth: 1.8, strokeDasharray: "1.5,4", strokeLinecap: "round" }),
          Plot.dot(jun, { x: "fecha", y: "real", r: 2.6, fill: U.COLORES.real }),
          Plot.lineY(filas, { x: "fecha", y: "p", stroke: U.COLORES.modelo, strokeWidth: 2.2 }),
          Plot.ruleY([0], { stroke: U.COLORES.ink3 }),
          Plot.tip(filas, Plot.pointerX({
            x: "fecha", y: "real",
            title: (d) => `${U.fechaCorta(d.fecha)} (${B4.DIAS3[d.fecha.getUTCDay()]})${d.feriado ? ", feriado" : ""}\nreal: ${B4.num(d.real)}\n${modelo}: ${B4.num(d.p)}` + (d.lo != null ? `\nintervalo 80 %: ${B4.num(d.lo)} a ${B4.num(d.hi)}` : ""),
          })),
        ].filter(Boolean),
      }));
      U.reemplazar(grafico, plot);
      dibujarTabla();

      let txt = `<b>${modelo}</b>: ${DESC[modelo] || ""}`;
      if (md.lo) {
        const dentro = filas.filter((d) => d.real >= d.lo && d.real <= d.hi).length;
        txt += ` El intervalo del 80 % contiene al real en <b>${dentro} de los ${filas.length} días</b>.`;
      }
      lectura.innerHTML = txt;
    }

    controles.append(botones);
    dibujar();
    return {};
  },
};
