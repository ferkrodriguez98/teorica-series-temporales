/* Frecuencia y agregación: el mismo mes visto cada 15 minutos, por hora, por día y por semana. */
DEMOS.frecuencia = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    const DESDE = "2019-05-01", HASTA = "2019-05-31";
    const base = [];
    for (let d = U.dia(DESDE); d <= U.dia(HASTA); d = U.sumarDias(d, 1)) {
      const v = DATA.subte15min[U.iso(d)];
      if (!v) continue;
      v.forEach((p, i) => base.push({ fecha: new Date(d.getTime() + i * 9e5), valor: p }));
    }
    let frec = "15min";
    const REGLAS = {
      "15min": { ms: 9e5 }, hora: { ms: 36e5 }, dia: { ms: 864e5 }, semana: { ms: 7 * 864e5 },
    };
    const lunes0 = U.dia("2019-04-29").getTime(); // las semanas arrancan el lunes
    const TEXTO = {
      "15min": ["Cada 15 minutos", "Se ve la forma de cada día: un pico a la mañana, otro más alto a la tarde, y casi nada de noche. Es la frecuencia para decidir cuántos trenes poner en la hora pico."],
      hora: ["Por hora", "Lo mismo, con cuatro veces menos datos y la curva más lisa. La forma del día sigue ahí."],
      dia: ["Por día", "Desaparece la forma del día y aparece la semana: cinco días altos, el sábado más bajo y el domingo más bajo todavía. Es la frecuencia del ejercicio de pronóstico de esta clase."],
      semana: ["Por semana", "Desaparece la semana y queda el nivel del mes. Cuidado con las semanas en rojo: tienen menos días con datos y por eso parecen bajas, sin que haya viajado menos gente."],
    };

    function agregar() {
      if (frec === "15min") return base;
      const ms = REGLAS[frec].ms, origen = frec === "semana" ? lunes0 : U.dia(DESDE).getTime();
      const g = d3.rollups(base, (v) => ({ valor: d3.sum(v, (d) => d.valor), dias: new Set(v.map((d) => U.iso(d.fecha))).size }), (d) => origen + Math.floor((d.fecha - origen) / ms) * ms);
      return g.map(([t, v]) => ({ fecha: new Date(t), ...v, incompleta: frec === "semana" && v.dias < 7 })).sort((a, b) => a.fecha - b.fecha);
    }
    const fila = U.el("div", { class: "fila-panel" });
    const panel = U.el("div", { class: "panel-der" });
    grafico.replaceWith(fila);
    fila.append(grafico, panel);
    lectura.remove();

    function dibujar() {
      const datos = agregar();
      const finde = (d) => frec === "dia" && (d.fecha.getUTCDay() === 0 || d.fecha.getUTCDay() === 6);
      const sinDatos = ["2019-05-01", "2019-05-29"].map((f) => ({ fecha: U.dia(f) }));
      const marcas = [
        Plot.ruleY([0], { stroke: U.COLORES.rule }),
        frec === "semana" || frec === "dia"
          ? Plot.rectY(datos, { x1: "fecha", x2: (d) => new Date(+d.fecha + REGLAS[frec].ms), y: "valor", fill: (d) => (d.incompleta ? U.COLORES.B : finde(d) ? U.COLORES.A : U.COLORES.C), inset: frec === "dia" ? 2 : 4, rx: 3 })
          : Plot.lineY(datos, { x: "fecha", y: "valor", stroke: U.COLORES.C, strokeWidth: frec === "15min" ? 0.8 : 1.4 }),
        ...(frec === "semana" ? [Plot.text(datos.filter((d) => d.incompleta), { x: (d) => new Date(+d.fecha + 3.5 * 864e5), y: "valor", text: (d) => `${d.dias} ${d.dias === 1 ? "día" : "días"}`, dy: -16, fill: U.COLORES.B, fontSize: 18, fontWeight: 600 })] : []),
        ...(frec === "dia" ? [Plot.text(sinDatos, { x: (d) => new Date(+d.fecha + 432e5), y: 0, text: () => "sin datos", rotate: -90, textAnchor: "start", dy: 0, dx: 0, fontSize: 15, fill: U.COLORES.ink3 })] : []),
        Plot.tip(datos, Plot.pointerX({ x: "fecha", y: "valor", title: (d) => `${d3.utcFormat(frec === "dia" || frec === "semana" ? "%d/%m" : "%d/%m %H:%M")(d.fecha)}\n${U.fmt(Math.round(d.valor))} pasajeros` })),
      ];
      U.reemplazar(grafico, Plot.plot(U.plotBase({ width: 1040, height: 560, y: { grid: true, ticks: 8, tickFormat: U.tickM, label: "pasajeros en cada período", labelAnchor: "top", labelArrow: "none" }, x: { label: null, domain: frec === "semana" ? [U.dia("2019-04-29"), U.dia("2019-06-03")] : [U.dia(DESDE), U.dia("2019-06-01")] }, marks: marcas })));
      grafico.firstElementChild?.classList.add("aparece");
      const [tit, txt] = TEXTO[frec];
      panel.innerHTML = `<div class="panel-fecha aparece">${tit}</div>` +
        `<div class="aparece"><b>${U.fmt(datos.length)}</b> datos para el mismo mes, mayo de 2019.</div>` +
        `<div class="aparece">${txt}</div>` +
        (frec === "dia" ? `<div class="aparece"><b style="color:${U.COLORES.A}">Celeste</b>: sábados y domingos.</div>` : "") +
        `<div class="revelado">Los datos son los mismos; lo que cambia es qué se ve. La frecuencia se elige según la pregunta.</div>`;
    }
    controles.append(U.botones([["15min", "Cada 15 min"], ["hora", "Por hora"], ["dia", "Por día"], ["semana", "Por semana"]], frec, (v) => { frec = v; dibujar(); }));
    dibujar();
    return {};
  },
};
