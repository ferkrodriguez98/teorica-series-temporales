/* El mismo SARIMAX con dos definiciones de feriado: cualquier día o solo de lunes a viernes.
   El 25/5/2025 (domingo, feriado) arrastra todos los domingos del pronóstico de junio. */
DEMOS.feriadoDomingo = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    const P = DATA.modelos.pronosticos;
    const T = P.sarimax_todos_feriados, H = P.modelos.SARIMAX;
    const jun = B4.junio();
    const hist = B4.historia().filter((d) => d.fecha >= U.dia("2025-05-01"));
    const d25 = U.dia("2025-05-25");
    const y25 = hist.find((d) => +d.fecha === +d25).valor;
    const domingos = jun.filter((d) => d.fecha.getUTCDay() === 0);
    let vista = "todos";

    function dibujar() {
      const V = vista === "todos" ? T : H;
      const filas = jun.map((d, i) => ({ ...d, p: V.pred[i] }));
      const ferJ = jun.filter((d) => d.feriado).map((d) => d.fecha);
      const Y1 = 1.15e6;
      U.reemplazar(grafico, Plot.plot(U.plotBase({
        height: 480, marginLeft: 64, marginTop: 28,
        x: { label: null, domain: [U.sumarDias(hist[0].fecha, -1), U.sumarDias(jun[jun.length - 1].fecha, 1)], tickFormat: (d) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}`, ticks: d3.utcWeek.every(1) },
        y: { grid: true, tickFormat: U.tickM, label: null, domain: [0, Y1] },
        marks: [
          ...B4.marcasFeriados(ferJ, { y1: 0, alto: Y1 }),
          ...B4.marcasFeriados([d25], { y1: 0, alto: Y1, rotulo: false }),
          Plot.ruleX([U.sumarDias(jun[0].fecha, -0.5)], { stroke: U.COLORES.ink3, strokeDasharray: "3,3" }),
          Plot.lineY(hist, { x: "fecha", y: "valor", stroke: U.COLORES.ink3, strokeWidth: 1.2 }),
          Plot.dot(hist, { x: "fecha", y: "valor", r: 2, fill: U.COLORES.ink3 }),
          Plot.dot([{ fecha: d25, valor: y25 }], { x: "fecha", y: "valor", r: 9, stroke: U.COLORES.B, strokeWidth: 2.2 }),
          Plot.text([{ fecha: d25, valor: y25 }], { x: "fecha", y: "valor", text: () => "domingo 25/5, feriado", dy: 26, fill: U.COLORES.B, fontSize: 18 }),
          Plot.lineY(jun, { x: "fecha", y: "real", stroke: U.COLORES.real, strokeWidth: 1.8, strokeDasharray: "1.5,4", strokeLinecap: "round" }),
          Plot.dot(jun, { x: "fecha", y: "real", r: 2.6, fill: U.COLORES.real }),
          Plot.lineY(filas, { x: "fecha", y: "p", stroke: U.COLORES.modelo, strokeWidth: 2.2 }),
          Plot.dot(filas.filter((d) => d.fecha.getUTCDay() === 0), { x: "fecha", y: "p", r: 6, fill: U.COLORES.modelo, stroke: U.COLORES.surface, strokeWidth: 2 }),
          Plot.tip(filas, Plot.pointerX({
            x: "fecha", y: "real",
            title: (d) => `${U.fechaCorta(d.fecha)} (${B4.DIAS3[d.fecha.getUTCDay()]})${d.feriado ? ", feriado" : ""}\nreal: ${B4.num(d.real)}\npronóstico: ${B4.num(d.p)}`,
          })),
        ],
      })));
      const pd = d3.mean(domingos, (d) => V.pred[d.i]);
      const [mn, mx] = d3.extent(domingos, (d) => d.real);
      const dom = `Domingos de junio: pronostica ${B4.mil(pd)} en promedio; viajaron entre ${B4.mil(mn)} y ${B4.mil(mx)}.`;
      lectura.innerHTML = vista === "todos"
        ? `Con el feriado marcado en cualquier día, el modelo le resta ${B4.mil(-T.coef.feriado_todos)} al domingo 25/5: para el modelo, sin el feriado ese domingo habría tenido ${B4.mil(y25 - T.coef.feriado_todos)} pasajeros. Con la diferencia de 7 días, cada domingo se pronostica a partir de los domingos anteriores, y el 25/5 empuja hacia arriba los de junio. ${dom} MAPE: <b>${B4.pct(T.MAPE)}</b>.`
        : `Marcando solo los feriados de lunes a viernes, el 25/5 queda como un domingo más. ${dom} MAPE: <b>${B4.pct(H.MAPE)}</b>, contra ${B4.pct(T.MAPE)} de la otra versión. El modelo y los datos son los mismos; cambia qué se considera feriado.`;
    }

    controles.append(U.botones([["todos", "Feriado cualquier día"], ["habiles", "Feriado solo de lunes a viernes"]], vista, (v) => { vista = v; dibujar(); }));
    controles.append(B4.leyenda([["linea", U.COLORES.ink3, "mayo"], ["punteada", U.COLORES.real, "real de junio"], ["linea", U.COLORES.modelo, "pronóstico SARIMAX"], ["punto", U.COLORES.modelo, "domingos"]]));
    dibujar();
    return {};
  },
};
