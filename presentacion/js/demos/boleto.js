/* Precio del boleto (corriente o a precios constantes) y pasajeros por día, en dos paneles alineados. */
DEMOS.boleto = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    const B = DATA.boleto;
    const filas = B.meses.map((m, i) => ({ fecha: U.dia(m + "-15"), nominal: B.nominal[i], real: B.real[i], pax: B.pax_dia[i] }));
    const [ay, am] = B.base_ipc.split("-");
    const baseTxt = `${U.MESES[+am - 1]} de ${ay}`;
    let vista = "real";
    const dom = [U.dia("2013-06-01"), U.dia("2026-11-30")];
    const marcas = [
      { desde: U.dia("2020-03-20"), hasta: U.dia("2021-12-31"), texto: "pandemia" },
      { desde: U.dia("2024-01-08"), hasta: U.dia("2024-03-06"), texto: "línea D cerrada" },
    ];

    // Promedio de los días hábiles sin feriado de un mes ("aaaa-mm"), para comparar meses con distinto calendario
    const fer = new Set(DATA.feriados.map((f) => f.fecha));
    const diario = U.serie(DATA.subteDiario.inicio, DATA.subteDiario.total);
    const habil = (mes) => d3.mean(diario.filter((d) => {
      const f = U.iso(d.fecha), w = d.fecha.getUTCDay();
      return f.startsWith(mes) && w >= 1 && w <= 5 && !fer.has(f) && d.valor != null;
    }), (d) => d.valor);
    const cambio = (a, b) => { const c = habil(b) / habil(a) - 1; return (c > 0 ? "+" : "−") + U.fmt(Math.abs(c * 100), 0) + " %"; };

    function dibujar() {
      const arriba = Plot.plot(U.plotBase({
        height: 262, marginBottom: 8, marginTop: 24, marginLeft: 80, marginRight: 30,
        x: { domain: dom, axis: null },
        y: vista === "real"
          ? { grid: true, label: `pesos de ${baseTxt}`, tickFormat: (d) => `$${U.locale.format(",.0f")(d)}`, domain: [0, 1900] }
          : { grid: true, type: "log", label: "pesos corrientes (escala logarítmica)", tickFormat: (d) => `$${U.locale.format(",~f")(d)}`, ticks: 6 },
        marks: [
          Plot.rectY(marcas, { x1: "desde", x2: "hasta", y1: vista === "real" ? 0 : 1, y2: 2000, fill: U.COLORES.ink3, fillOpacity: 0.1 }),
          Plot.lineY(filas, { x: "fecha", y: vista, stroke: U.COLORES.B, strokeWidth: 2.2, curve: "step-after" }),
          Plot.tip(filas, Plot.pointerX({ x: "fecha", y: vista, title: (d) => `${U.MESES[d.fecha.getUTCMonth()]} ${d.fecha.getUTCFullYear()}\nboleto: $${U.fmt(d.nominal, 2)} corrientes\n$${U.fmt(Math.round(d.real))} de ${baseTxt}` })),
        ],
      }));
      const abajo = Plot.plot(U.plotBase({
        height: 262, marginTop: 40, marginLeft: 80, marginRight: 30,
        x: { domain: dom, label: null },
        y: { grid: true, label: "pasajeros por día (promedio del mes)", tickFormat: U.tickM, domain: [0, 1.2e6] },
        marks: [
          Plot.rectY(marcas, { x1: "desde", x2: "hasta", y1: 0, y2: 1.2e6, fill: U.COLORES.ink3, fillOpacity: 0.1 }),
          Plot.text(marcas, { x: (d) => new Date((+d.desde + +d.hasta) / 2), y: 1.15e6, text: "texto", fill: U.COLORES.ink2, fontSize: 17 }),
          Plot.lineY(filas.filter((d) => d.pax != null), { x: "fecha", y: "pax", stroke: U.COLORES.ink, strokeWidth: 1.8 }),
          Plot.tip(filas.filter((d) => d.pax != null), Plot.pointerX({ x: "fecha", y: "pax", title: (d) => `${U.MESES[d.fecha.getUTCMonth()]} ${d.fecha.getUTCFullYear()}\n${U.fmtK(d.pax)} pasajeros por día` })),
        ],
      }));
      const cont = U.el("div");
      cont.append(arriba, abajo);
      U.reemplazar(grafico, cont);
      const v = (m, k) => filas[B.meses.indexOf(m)][k];
      lectura.innerHTML = vista === "real"
        ? `En días hábiles sin feriado viajaron ${B4.mil(habil("2024-04"))} por día en abril de 2024 y ${B4.mil(habil("2024-07"))} en julio (${cambio("2024-04", "2024-07")}); entre abril y julio de 2023, que también tiene vacaciones de invierno, ${cambio("2023-04", "2023-07")}. ` +
          `La diferencia coincide con el aumento, pero en 2024 también cayó la actividad económica: la serie sola no separa una causa de la otra.`
        : "En pesos corrientes el boleto sube siempre: de $2,50 en 2013 a más de $1.800 en 2026. Sin deflactar, cualquier serie de precios argentina parece una tendencia.";
    }
    controles.append(U.botones([["real", `A precios de ${baseTxt}`], ["nominal", "Pesos corrientes"]], vista, (v) => { vista = v; dibujar(); }));
    dibujar();
    return {};
  },
};
