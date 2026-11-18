/* Holt-Winters entrenado con distintas fechas de corte entre octubre de 2019 y mayo de 2020:
   pronóstico de 6 semanas contra lo que pasó. */
DEMOS.febrero2020 = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    el.classList.add("b4");
    const S = DATA.subteDiario;
    const serie = U.serie(S.inicio, S.total);
    const H = 42, VENTANA = 730;
    const AISLAMIENTO = U.dia("2020-03-20");
    const X0 = U.dia("2019-08-01"), X1 = U.dia("2020-07-14");

    /* Cortes: domingos entre el 6/10/2019 y el 31/5/2020 */
    const cortes = [];
    for (let d = U.dia("2019-10-06"); d <= U.dia("2020-05-31"); d = U.sumarDias(d, 7)) cortes.push(d);

    const fmtMape = (v) => U.fmt(v, v < 100 ? 1 : 0) + " %";
    const fmtPar = (v) => U.fmt(v, 2);

    /* Entrenar y pronosticar en cada corte (una vez, al montar) */
    const res = cortes.map((c) => {
      const desde = U.sumarDias(c, -(VENTANA - 1));
      const y = B4.interpolar(B4.tramo(U.iso(desde), U.iso(c)));
      const par = B4.hwOptimizar(y);
      const r = B4.hw(y, par);
      const pred = r.pronosticar(H);
      const fut = B4.tramo(U.iso(U.sumarDias(c, 1)), U.iso(U.sumarDias(c, H)));
      const m = B4.metricas(fut, pred);
      const dom = r.estacion[(7 - ((c.getUTCDay() + 1) % 7)) % 7]; // efecto estimado para el próximo domingo
      return { corte: c, par, r, pred: pred.map((v, i) => ({ fecha: U.sumarDias(c, i + 1), v, real: fut[i] })), MAPE: m.MAPE, efectoDomingo: dom };
    });

    const visible = serie.filter((d) => d.fecha >= X0 && d.fecha <= X1);
    let k = cortes.findIndex((c) => U.iso(c) === "2020-02-02");

    const g1 = U.el("div"), g2 = U.el("div");
    grafico.append(g1, g2);

    const tickMes = (d) => U.MESES[d.getUTCMonth()].slice(0, 3) + (d.getUTCMonth() === 0 ? " 2020" : "");
    const xBase = { label: null, domain: [X0, X1], ticks: d3.utcMonth.every(1), tickFormat: tickMes };

    function dibujar() {
      const R = res[k];
      const c = R.corte;
      const fin = U.sumarDias(c, H);
      const entren = visible.filter((d) => d.fecha <= c);
      const ventana = visible.filter((d) => d.fecha > c && d.fecha <= fin);
      const despues = visible.filter((d) => d.fecha > fin);
      const despuesDe = c >= AISLAMIENTO;

      const plot = Plot.plot(U.plotBase({
        width: 1440, height: 390, marginLeft: 70, marginTop: 26, marginBottom: 30,
        x: xBase,
        y: { grid: true, tickFormat: (d) => (d < 0 ? "−" : "") + U.tickM(Math.abs(d)), label: null, domain: [-4.6e5, 1.35e6], ticks: [-4e5, 0, 4e5, 8e5, 1.2e6] },
        marks: [
          Plot.rectX([{ a: U.sumarDias(c, 0.5), b: U.sumarDias(fin, 0.5) }], { x1: "a", x2: "b", y1: -4.6e5, y2: 1.35e6, fill: U.COLORES.ink3, fillOpacity: 0.07 }),
          Plot.ruleX([AISLAMIENTO], { stroke: U.COLORES.ink2, strokeDasharray: "2,3" }),
          Plot.text([AISLAMIENTO], { x: (d) => d, y: 1.35e6, text: () => "20/3/2020: aislamiento obligatorio", textAnchor: despuesDe ? "end" : "start", dx: despuesDe ? -6 : 6, dy: -8, fontSize: 16, fill: U.COLORES.ink2 }),
          Plot.ruleX([U.sumarDias(c, 0.5)], { stroke: U.COLORES.ink, strokeWidth: 1.2 }),
          Plot.text([U.sumarDias(c, 0.5)], { x: (d) => d, y: 1.35e6, text: () => "corte", textAnchor: despuesDe ? "start" : "end", dx: despuesDe ? 6 : -6, dy: -8, fontSize: 16, fill: U.COLORES.ink, fontWeight: 600 }),
          Plot.lineY(despues, { x: "fecha", y: "valor", stroke: U.COLORES.ink3, strokeWidth: 1, strokeOpacity: 0.3 }),
          Plot.lineY(entren, { x: "fecha", y: "valor", stroke: U.COLORES.ink3, strokeWidth: 1.1 }),
          Plot.lineY(ventana, { x: "fecha", y: "valor", stroke: U.COLORES.real, strokeWidth: 1.6, strokeDasharray: "1.5,3.5", strokeLinecap: "round" }),
          Plot.lineY(R.pred, { x: "fecha", y: "v", stroke: U.COLORES.modelo, strokeWidth: 1.8 }),
          Plot.ruleY([0], { stroke: U.COLORES.ink3 }),
          Plot.tip(R.pred, Plot.pointerX({ x: "fecha", y: "v", title: (d) => `${U.fechaCorta(d.fecha)} (${B4.DIAS3[d.fecha.getUTCDay()]})\nreal: ${B4.num(d.real)}\npronóstico: ${B4.num(d.v)}` })),
        ],
      }));
      U.reemplazar(g1, plot);

      const barras = res.map((r, i) => ({ fecha: r.corte, MAPE: r.MAPE, actual: i === k }));
      const plot2 = Plot.plot(U.plotBase({
        width: 1440, height: 150, marginLeft: 70, marginTop: 30, marginBottom: 26,
        x: { ...xBase, axis: null },
        y: { type: "log", domain: [5, 6000], ticks: [10, 100, 1000], tickFormat: (d) => U.fmt(d) + " %", grid: true, label: null },
        marks: [
          Plot.text(["MAPE de las 6 semanas siguientes a cada corte (escala logarítmica)"], { frameAnchor: "top-left", dy: -24, dx: 0, fontSize: 16, fill: U.COLORES.ink2 }),
          Plot.rectY(barras, { x1: (d) => U.sumarDias(d.fecha, -2.6), x2: (d) => U.sumarDias(d.fecha, 2.6), y1: 5, y2: "MAPE", fill: (d) => (d.actual ? U.COLORES.modelo : U.COLORES.ink3), fillOpacity: (d) => (d.actual ? 1 : 0.55) }),
          Plot.text(barras.filter((d) => d.actual), { x: "fecha", y: "MAPE", text: (d) => fmtMape(d.MAPE), dy: -9, fontSize: 16, fill: U.COLORES.ink, fontWeight: 600 }),
          Plot.ruleX([AISLAMIENTO], { stroke: U.COLORES.ink2, strokeDasharray: "2,3" }),
          Plot.tip(barras, Plot.pointerX({ x: "fecha", y: "MAPE", title: (d) => `corte ${U.fechaCorta(d.fecha)}\nMAPE: ${fmtMape(d.MAPE)}` })),
        ],
      }));
      U.reemplazar(g2, plot2);

      /* Lectura */
      const p = R.par;
      const ini = U.sumarDias(c, 1);
      let txt = `Corte: <b>${U.fechaLarga(c)}</b>. Parámetros estimados con los dos años anteriores: α = ${fmtPar(p.alfa)}, β = ${fmtPar(p.beta)}, γ = ${fmtPar(p.gamma)}. ` +
        `Pronóstico del ${U.fechaCorta(ini)} al ${U.fechaCorta(fin)}: MAPE <b>${fmtMape(R.MAPE)}</b>.`;
      const post = R.pred.filter((d) => d.fecha >= AISLAMIENTO);
      if (c < AISLAMIENTO && post.length) {
        txt += ` Desde el 20/3 viajaron en promedio <b>${B4.mil(d3.mean(post, (d) => d.real))}</b> por día; el pronóstico para esos ${post.length} días promedia <b>${B4.mil(d3.mean(post, (d) => d.v))}</b>.`;
      } else if (c >= AISLAMIENTO) {
        const neg = R.pred.filter((d) => d.v < 0).length;
        txt += ` Nivel estimado al corte: ${B4.mil(R.r.nivel)}; efecto estimado del domingo: ${B4.signo(R.efectoDomingo)}.` +
          (neg ? ` El pronóstico es negativo en <b>${neg} de los ${H} días</b>.` : "");
      }
      lectura.innerHTML = txt;
    }

    const s = U.slider({
      etiqueta: "Fecha de corte", min: 0, max: cortes.length - 1, step: 1, valor: k,
      formato: (i) => U.fechaCorta(cortes[i]), alCambiar: (i) => { k = i; dibujar(); },
    });
    s.input.style.width = "560px";
    controles.append(s, U.el("span", { class: "b4-sep" }),
      B4.leyenda([["linea", U.COLORES.ink3, "datos hasta el corte"], ["punteada", U.COLORES.real, "real, 6 semanas"], ["linea", U.COLORES.modelo, "pronóstico"]], "width:auto; font-size:1em;"));
    dibujar();
    return {};
  },
};
