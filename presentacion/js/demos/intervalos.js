/* Intervalos de predicción del 80 % de SARIMA y SARIMAX, lado a lado, con los días que quedan afuera. */
DEMOS.intervalos = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    el.classList.add("b4");
    controles.remove();
    const P = DATA.modelos.pronosticos;
    const jun = B4.junio();
    const ferJ = jun.filter((d) => d.feriado).map((d) => d.fecha);
    const Y0 = -1.5e5, Y1 = 1.15e6;
    const cont = U.el("div", { class: "b4-multiples" });
    grafico.append(B4.leyenda([["punteada", U.COLORES.real, "real"], ["linea", U.COLORES.modelo, "pronóstico"], ["banda", U.COLORES.modelo + "2e", "intervalo del 80 %"]], "margin-bottom: 8px;"), cont);

    const resumen = {};
    ["SARIMA", "SARIMAX"].forEach((n) => {
      const md = P.modelos[n];
      const filas = jun.map((d, i) => ({ ...d, p: md.pred[i], lo: md.lo[i], hi: md.hi[i], fuera: d.real < md.lo[i] || d.real > md.hi[i] }));
      const fuera = filas.filter((d) => d.fuera);
      const anchos = filas.map((d) => d.hi - d.lo);
      resumen[n] = { filas, fuera, anchoMedio: d3.mean(anchos), primero: anchos[0], ultimo: anchos[anchos.length - 1] };
      const caja = U.el("div");
      caja.append(
        U.el("h3", {}, n === "SARIMA" ? "SARIMA" : "SARIMAX: SARIMA con feriados y lluvia"),
        U.el("div", { class: "cifra-linea" }),
      );
      caja.lastChild.innerHTML = `Contiene al real en <b>${filas.length - fuera.length} de ${filas.length} días</b> · ancho medio <b>${B4.mil(resumen[n].anchoMedio)}</b>`;
      const plot = Plot.plot(U.plotBase({
        width: 696, height: 470, marginLeft: 64, marginTop: 24, marginRight: 16,
        x: { label: null, domain: [U.sumarDias(jun[0].fecha, -0.7), U.sumarDias(jun[jun.length - 1].fecha, 0.7)], tickFormat: (d) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}`, ticks: d3.utcWeek.every(1) },
        y: { grid: true, tickFormat: (d) => (d < 0 ? "−" : "") + U.tickM(Math.abs(d)), label: null, domain: [Y0, Y1] },
        marks: [
          ...B4.marcasFeriados(ferJ, { y1: Y0, alto: Y1 }),
          Plot.areaY(filas, { x: "fecha", y1: "lo", y2: "hi", fill: U.COLORES.modelo, fillOpacity: 0.13 }),
          Plot.lineY(filas, { x: "fecha", y: "p", stroke: U.COLORES.modelo, strokeWidth: 2 }),
          Plot.lineY(filas, { x: "fecha", y: "real", stroke: U.COLORES.real, strokeWidth: 1.4, strokeDasharray: "1.5,4", strokeLinecap: "round" }),
          Plot.dot(filas.filter((d) => !d.fuera), { x: "fecha", y: "real", r: 3, fill: U.COLORES.real }),
          Plot.dot(fuera, { x: "fecha", y: "real", r: 7, stroke: U.COLORES.real, strokeWidth: 2, fill: U.COLORES.surface }),
          Plot.text(fuera.filter((d) => d.real > d.hi), { x: "fecha", y: "real", text: (d) => B4.fechaDia(d.fecha), dy: -17, fontSize: 16, fill: U.COLORES.ink, fontWeight: 600 }),
          Plot.text(fuera.filter((d) => d.real < d.lo), { x: "fecha", y: "real", text: (d) => B4.fechaDia(d.fecha), dy: 19, fontSize: 16, fill: U.COLORES.ink, fontWeight: 600 }),
          Plot.ruleY([0], { stroke: U.COLORES.ink3 }),
          Plot.tip(filas, Plot.pointerX({ x: "fecha", y: "real", title: (d) => `${U.fechaCorta(d.fecha)} (${B4.DIAS3[d.fecha.getUTCDay()]})${d.feriado ? ", feriado" : ""}\nreal: ${B4.num(d.real)}\npronóstico: ${B4.num(d.p)}\nintervalo 80 %: ${B4.num(d.lo)} a ${B4.num(d.hi)}` })),
        ],
      }));
      caja.append(plot);
      cont.append(caja);
    });

    const S = resumen.SARIMA, X = resumen.SARIMAX;
    const lista = (fs) => fs.map((d) => B4.fechaDia(d.fecha) + (d.feriado ? " (feriado)" : "")).join(", ").replace(/, ([^,]*)$/, " y $1");
    lectura.innerHTML = `En el SARIMA el ancho del intervalo pasa de ${B4.mil(S.primero)} el primer día a ${B4.mil(S.ultimo)} el día 28. ` +
      (S.fuera.length ? `Quedan afuera: ${lista(S.fuera)}. ` : "") +
      `En el SARIMAX, de ${B4.mil(X.primero)} a ${B4.mil(X.ultimo)}` + (X.fuera.length ? `; quedan afuera: ${lista(X.fuera)}.` : `, sin días afuera.`);
    return {};
  },
};
