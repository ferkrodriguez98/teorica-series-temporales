/* ¿Cambiaron los viernes? Pasajeros de un viernes respecto de un día de lunes a jueves, año por año y hora por hora. */
DEMOS.viernes = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    lectura.remove();
    const fer = new Set(DATA.feriados.map((f) => f.fecha));
    const pct = (x) => `${Math.round(x * 100)} %`;

    // Año por año: mediana de los viernes sobre mediana de lunes a jueves, sin feriados ni no laborables
    const diario = U.serie(DATA.subteDiario.inicio, DATA.subteDiario.total);
    const porAnio = d3.groups(diario.filter((d) => {
      const w = d.fecha.getUTCDay();
      return w >= 1 && w <= 5 && d.valor != null && d.valor > 0 && !fer.has(U.iso(d.fecha));
    }), (d) => d.fecha.getUTCFullYear()).map(([anio, ds]) => {
      const vie = ds.filter((d) => d.fecha.getUTCDay() === 5), lj = ds.filter((d) => d.fecha.getUTCDay() !== 5);
      return { anio, r: d3.median(vie, (d) => d.valor) / d3.median(lj, (d) => d.valor), n: vie.length };
    }).filter((d) => d.n >= 20 && d.anio >= 2014);
    const antes = porAnio.filter((d) => d.anio <= 2019);
    const rAnio = (a) => porAnio.find((d) => d.anio === a).r;

    // Hora por hora: viernes sobre el promedio de lunes a jueves, 2019 y 2025
    const HORAS = d3.range(6, 23); // a las 23 h el subte ya está cerrando y el cociente sale de pocos pasajeros
    const porHora = (anio) => {
      const acc = { vie: new Array(24).fill(0), lj: new Array(24).fill(0) }, n = { vie: 0, lj: 0 };
      for (const [fecha, slots] of Object.entries(DATA.subte15min)) {
        const w = U.dia(fecha).getUTCDay();
        if (!fecha.startsWith(anio) || fer.has(fecha) || w < 1 || w > 5) continue;
        const g = w === 5 ? "vie" : "lj"; n[g]++;
        for (let h = 0; h < 24; h++) acc[g][h] += slots[h * 4] + slots[h * 4 + 1] + slots[h * 4 + 2] + slots[h * 4 + 3];
      }
      return HORAS.map((h) => ({ anio: +anio, hora: h, r: acc.vie[h] / n.vie / (acc.lj[h] / n.lj) }));
    };
    const H = [...porHora("2019"), ...porHora("2025")];
    const hr = (anio, h) => H.find((d) => d.anio === anio && d.hora === h).r;
    const COL = { 2019: U.COLORES.ink3, 2025: U.COLORES.B };
    let vista = "anio";

    const fila = U.el("div", { class: "fila-panel" });
    const panel = U.el("div", { class: "panel-der" });
    grafico.replaceWith(fila);
    fila.append(grafico, panel);
    const ley = B4.leyenda([["linea", COL[2019], "2019"], ["linea", COL[2025], "2025"]], "width:auto;");
    controles.append(U.botones([["anio", "Año por año"], ["hora", "Hora por hora"]], vista, (v) => { vista = v; dibujar(true); }), ley);

    function dibujar(fundir) {
      ley.style.visibility = vista === "hora" ? "visible" : "hidden";
      let plot, html;
      if (vista === "anio") {
        plot = Plot.plot(U.plotBase({
          width: 1040, height: 520, marginLeft: 80, marginTop: 30,
          x: { label: null, tickFormat: (d) => String(d), type: "point", padding: 0.4 },
          y: { grid: true, domain: [0.9, 1.1], ticks: [0.9, 0.95, 1, 1.05, 1.1], tickFormat: pct, label: "un viernes respecto de un día de lunes a jueves", labelAnchor: "top", labelArrow: "none" },
          marks: [
            Plot.ruleY([1], { stroke: U.COLORES.ink3, strokeDasharray: "3 3" }),
            Plot.lineY(porAnio, { x: "anio", y: (d) => Math.min(d.r, 1.1), stroke: U.COLORES.rule, strokeWidth: 1.5 }),
            Plot.dot(porAnio, { x: "anio", y: (d) => Math.min(d.r, 1.1), r: 7, fill: (d) => d.anio === 2020 ? U.COLORES.grid : d.anio >= 2021 ? U.COLORES.B : U.COLORES.ink2, stroke: (d) => d.anio === 2020 ? U.COLORES.ink3 : "none" }),
            Plot.text(porAnio, { x: "anio", y: (d) => Math.min(d.r, 1.1), text: (d) => d.anio === 2020 ? `pandemia (${pct(d.r)})` : pct(d.r), dy: -18, fontSize: 15, fill: U.COLORES.ink2 }),
          ],
        }));
        html =
          `<div class="panel-fecha">Año por año</div>` +
          `<div>Cada punto divide la mediana de los viernes por la mediana de lunes a jueves de ese año, sin feriados.</div>` +
          `<div>De 2014 a 2019 el viernes estuvo siempre entre el <b>${pct(d3.min(antes, (d) => d.r))}</b> y el <b>${pct(d3.max(antes, (d) => d.r))}</b>: era un día más. Desde 2021 quedó por debajo casi todos los años: <b>${pct(rAnio(2023))}</b> en 2023 y <b>${pct(rAnio(2025))}</b> en 2025. 2024 es la excepción (${pct(rAnio(2024))}).</div>` +
          `<div>Son pocos puntos, y cada punto resume unos cincuenta viernes. Para saber de dónde salen hay que mirar la hora.</div>`;
      } else {
        plot = Plot.plot(U.plotBase({
          width: 1040, height: 520, marginLeft: 80, marginTop: 30,
          x: { label: null, domain: [6, 22], ticks: HORAS, tickFormat: (h) => `${h} h` },
          y: { grid: true, domain: [0.8, 1.25], ticks: [0.8, 0.9, 1, 1.1, 1.2], tickFormat: pct, label: "un viernes respecto de un día de lunes a jueves", labelAnchor: "top", labelArrow: "none" },
          marks: [
            Plot.rectY([{ a: 7, b: 10 }, { a: 17, b: 19 }], { x1: "a", x2: "b", y1: 0.8, y2: 1.25, fill: U.COLORES.H, fillOpacity: 0.12 }),
            Plot.ruleY([1], { stroke: U.COLORES.ink3, strokeDasharray: "3 3" }),
            Plot.lineY(H, { x: "hora", y: "r", z: "anio", stroke: (d) => COL[d.anio], strokeWidth: 2.6, marker: "circle" }),
            Plot.tip(H, Plot.pointer({ x: "hora", y: "r", title: (d) => `${d.anio}, ${d.hora} h\nviernes: ${pct(d.r)} de lunes a jueves` })),
          ],
        }));
        html =
          `<div class="panel-fecha">Hora por hora</div>` +
          `<div>A las 8 h, un viernes de 2019 tenía el <b>${pct(hr(2019, 8))}</b> de los pasajeros de lunes a jueves; uno de 2025, el <b>${pct(hr(2025, 8))}</b>. A las 18 h, <b>${pct(hr(2019, 18))}</b> y <b>${pct(hr(2025, 18))}</b>.</div>` +
          `<div>A la noche no cambió: a las 21 h, <b>${pct(hr(2019, 21))}</b> y <b>${pct(hr(2025, 21))}</b>. Lo que falta los viernes es el viaje de ida y vuelta al trabajo.</div>` +
          `<div>Es compatible con más trabajo remoto los viernes. La serie no lo prueba: para eso hacen falta datos de cómo trabaja la gente, que no están en los molinetes.</div>`;
      }
      U.reemplazar(grafico, plot);
      U.panelFundido(panel, html, fundir);
    }
    dibujar(false);
    return {};
  },
};
