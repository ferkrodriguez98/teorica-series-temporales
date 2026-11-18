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
    let frec = "15min", agg = "suma";
    const REGLAS = {
      "15min": { ms: 9e5, texto: "15 minutos" }, hora: { ms: 36e5, texto: "1 hora" },
      dia: { ms: 864e5, texto: "1 día" }, semana: { ms: 7 * 864e5, texto: "1 semana" },
    };
    const lunes0 = U.dia("2019-04-29").getTime(); // las semanas arrancan el lunes

    function agregar() {
      if (frec === "15min") return base;
      const ms = REGLAS[frec].ms, origen = frec === "semana" ? lunes0 : U.dia(DESDE).getTime();
      const g = d3.rollups(base, (v) => (agg === "suma" ? d3.sum(v, (d) => d.valor) : d3.mean(v, (d) => d.valor)), (d) => origen + Math.floor((d.fecha - origen) / ms) * ms);
      return g.map(([t, v]) => ({ fecha: new Date(t), valor: v })).sort((a, b) => a.fecha - b.fecha);
    }
    function dibujar() {
      const datos = agregar();
      const marcas = [
        Plot.ruleY([0], { stroke: U.COLORES.rule }),
        frec === "semana" || frec === "dia"
          ? Plot.rectY(datos, { x1: "fecha", x2: (d) => new Date(+d.fecha + REGLAS[frec].ms), y: "valor", fill: U.COLORES.C, inset: frec === "dia" ? 2 : 4, rx: 3 })
          : Plot.lineY(datos, { x: "fecha", y: "valor", stroke: U.COLORES.C, strokeWidth: frec === "15min" ? 0.8 : 1.4 }),
        Plot.tip(datos, Plot.pointerX({ x: "fecha", y: "valor", title: (d) => `${d3.utcFormat(frec === "dia" || frec === "semana" ? "%a %d/%m" : "%a %d/%m %H:%M")(d.fecha)}\n${U.fmt(Math.round(d.valor))}` })),
      ];
      U.reemplazar(grafico, Plot.plot(U.plotBase({ height: 560, y: { grid: true, ticks: 8, tickFormat: U.tickM, label: null }, x: { label: null, domain: [U.dia(DESDE), U.dia("2019-06-01")] }, marks: marcas })));
      lectura.innerHTML = `<b>${datos.length}</b> observaciones de ${REGLAS[frec].texto}${frec === "15min" ? "" : `, agregadas con ${agg === "suma" ? "la suma" : "el promedio"}`}. ` +
        (frec === "15min" ? "Se ve el ciclo dentro del día y se pierde de vista el mes."
          : frec === "semana" ? "Las semanas que empiezan antes del 1 o terminan después del 31 quedan incompletas: con la suma parecen semanas flojas."
            : agg === "promedio" && frec === "dia" ? "El promedio de las franjas del día es la suma dividida 96: misma forma, otra unidad."
              : "Cada frecuencia deja ver un ciclo y esconde otro.");
    }
    controles.append(
      U.botones([["15min", "15 min"], ["hora", "Hora"], ["dia", "Día"], ["semana", "Semana"]], frec, (v) => { frec = v; dibujar(); }),
      U.botones([["suma", "Suma"], ["promedio", "Promedio"]], agg, (v) => { agg = v; dibujar(); }),
    );
    dibujar();
    return {};
  },
};
