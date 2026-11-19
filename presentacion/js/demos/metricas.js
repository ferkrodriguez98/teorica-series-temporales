/* Errores diarios de un modelo en junio de 2025 y las tres métricas, con un día de paro simulado. */
DEMOS.metricas = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    el.classList.add("b4");
    const P = DATA.modelos.pronosticos;
    const jun = B4.junio();
    const NOMBRES = Object.keys(P.modelos);
    const DIA_PARO = jun.findIndex((d) => U.iso(d.fecha) === "2025-06-11");
    const FACTOR = 0.03;
    let modelo = "Seasonal naive", paro = false;

    const grid = U.el("div", { class: "b4-grid" });
    const izq = U.el("div");
    const panel = U.el("div", { class: "b4-panel" });
    grafico.replaceWith(grid);
    grid.append(izq, panel);
    izq.append(grafico);

    const FORMULAS = {
      MAE: String.raw`\mathrm{MAE} = \frac{1}{n}\sum_{t=1}^{n} \lvert y_t - \hat y_t \rvert`,
      RMSE: String.raw`\mathrm{RMSE} = \sqrt{\frac{1}{n}\sum_{t=1}^{n} (y_t - \hat y_t)^2}`,
      MAPE: String.raw`\mathrm{MAPE} = \frac{100}{n}\sum_{t=1}^{n} \left\lvert \frac{y_t - \hat y_t}{y_t} \right\rvert`,
    };
    const tarjetas = {};
    ["MAE", "RMSE", "MAPE"].forEach((k) => {
      const t = {
        formula: B4.tex(U.el("div", { class: "formula" }), FORMULAS[k]),
        valor: U.el("div", { class: "valor" }),
        antes: U.el("div", { class: "antes" }),
      };
      tarjetas[k] = t;
      panel.append(U.el("div", { class: "b4-metrica" }, t.formula, t.valor, t.antes));
    });

    const fmtM = (k, v) => (k === "MAPE" ? B4.pct(v) : B4.num(v));

    function dibujar() {
      const pred = P.modelos[modelo].pred;
      const real = P.real.map((v, i) => (paro && i === DIA_PARO ? Math.round(v * FACTOR) : v));
      const filas = jun.map((d, i) => ({ ...d, real: real[i], pred: pred[i], e: real[i] - pred[i], paro: paro && i === DIA_PARO }));
      const m = B4.metricas(real, pred);
      const m0 = B4.metricas(P.real, pred);
      const ext = d3.extent(filas, (d) => d.e);
      const dom = [Math.min(-1e5, ext[0] * 1.08), Math.max(1e5, ext[1] * 1.08)];
      const ferJ = jun.filter((d) => d.feriado).map((d) => d.fecha);

      const plot = Plot.plot(U.plotBase({
        width: 1024, height: 530, marginLeft: 70, marginTop: 28,
        x: { label: null, domain: [U.sumarDias(jun[0].fecha, -0.5), U.sumarDias(jun[jun.length - 1].fecha, 0.5)], tickFormat: (d) => `${B4.DIAS3[d.getUTCDay()]} ${d.getUTCDate()}`, ticks: d3.utcWeek.every(1) },
        y: { grid: true, tickFormat: (d) => (d > 0 ? "+" : d < 0 ? "−" : "") + U.tickM(Math.abs(d)), label: "error (real − pronóstico)", labelAnchor: "top", labelArrow: "none", domain: dom },
        marks: [
          ...B4.marcasFeriados(ferJ, { y1: dom[0], alto: dom[1] }),
          Plot.rectY(filas, {
            x1: (d) => U.sumarDias(d.fecha, -0.5), x2: (d) => U.sumarDias(d.fecha, 0.5), y: "e", insetLeft: 4, insetRight: 4,
            fill: U.COLORES.modelo, fillOpacity: (d) => (d.paro ? 1 : 0.8),
            stroke: (d) => (d.paro ? U.COLORES.ink : "none"), strokeWidth: 1.5,
          }),
          Plot.ruleY([0], { stroke: U.COLORES.ink3 }),
          Plot.text(filas.filter((d) => d.paro), { x: "fecha", y: "e", text: () => "paro simulado", dy: 14, fontSize: 16, fill: U.COLORES.ink, fontWeight: 600 }),
          Plot.tip(filas, Plot.pointerX({
            x: "fecha", y: "e",
            title: (d) => `${U.fechaCorta(d.fecha)} (${B4.DIAS3[d.fecha.getUTCDay()]})${d.feriado ? ", feriado" : ""}${d.paro ? ", paro simulado" : ""}\nreal: ${B4.num(d.real)}\npronóstico: ${B4.num(d.pred)}\nerror: ${B4.signo(d.e)} (${U.fmt((100 * Math.abs(d.e)) / d.real, 1)} % del real)`,
          })),
        ],
      }));
      U.reemplazar(grafico, plot);

      ["MAE", "RMSE", "MAPE"].forEach((k) => {
        tarjetas[k].valor.textContent = fmtM(k, m[k]);
        tarjetas[k].antes.innerHTML = paro
          ? `sin el paro: ${fmtM(k, m0[k])} · <b>×${U.fmt(m[k] / m0[k], 2)}</b>`
          : k === "MAPE" ? "en porcentaje del valor real" : "en pasajeros por día";
      });

      if (paro) {
        const d = filas[DIA_PARO];
        lectura.innerHTML = `Paro simulado el ${B4.fechaDia(d.fecha)}: el real pasa de ${B4.num(P.real[DIA_PARO])} a <b>${B4.num(d.real)}</b> y el error de ese día es de ${B4.num(Math.abs(d.e))}. ` +
          `El MAE sube ${U.fmt(100 * (m.MAE / m0.MAE - 1))} %, el RMSE ${U.fmt(100 * (m.RMSE / m0.RMSE - 1))} % y el MAPE pasa de ${B4.pct(m0.MAPE)} a <b>${B4.pct(m.MAPE)}</b>: ese día el error equivale a ${U.fmt((100 * Math.abs(d.e)) / d.real)} % del valor real.`;
      } else {
        let peor = 0;
        filas.forEach((d, i) => { if (Math.abs(d.e) > Math.abs(filas[peor].e)) peor = i; });
        const d = filas[peor];
        const s2 = d3.sum(filas, (f) => f.e * f.e), s2f = d3.sum(filas.filter((f) => f.feriado), (f) => f.e * f.e);
        lectura.innerHTML = `${modelo}: el mayor error es el del ${B4.fechaDia(d.fecha)}${d.feriado ? " (feriado)" : ""}, ${B4.signo(d.e)} pasajeros. ` +
          `Los dos feriados aportan ${U.fmt((100 * s2f) / s2)} % de la suma de errores al cuadrado y ${U.fmt((100 * d3.sum(filas.filter((f) => f.feriado), (f) => Math.abs(f.e))) / d3.sum(filas, (f) => Math.abs(f.e)))} % de la suma de errores absolutos.`;
      }
    }

    controles.append(
      U.botones(NOMBRES.map((n) => [n, n]), modelo, (v) => { modelo = v; dibujar(); }),
      U.el("span", { class: "b4-sep" }),
      B4.interruptor("Simular un día de paro", paro, (v) => { paro = v; dibujar(); }),
    );
    dibujar();
    return {};
  },
};
