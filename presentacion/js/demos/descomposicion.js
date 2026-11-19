/* Descomposición MSTL (statsmodels): observado = tendencia + ciclo semanal + ciclo anual + residuo. */
DEMOS.descomposicion = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    const D = DATA.modelos.descomposicion;
    const d0 = U.dia(D.inicio);
    const filas = D.observado.map((_, i) => ({
      fecha: U.sumarDias(d0, i), observado: D.observado[i], tendencia: D.tendencia[i], semanal: D.semanal[i],
      anual: D.anual[i], residuo: D.residuo[i], feriado: D.feriado[i],
    }));
    const PANELES = [
      ["observado", "Observado"], ["tendencia", "Tendencia"], ["semanal", "Ciclo semanal"], ["anual", "Ciclo anual"], ["residuo", "Residuo"],
    ];
    let rango = "todo";

    function dibujar() {
      const datos = rango === "todo" ? filas : filas.filter((d) => d.fecha >= U.dia("2025-03-01") && d.fecha <= U.dia("2025-08-31"));
      // Un panel por componente, cada uno con su propia escala vertical
      const xDom = d3.extent(datos, (d) => d.fecha);
      const cont = U.el("div");
      PANELES.forEach(([k, nombre], j) => {
        const ultimo = j === PANELES.length - 1;
        const serie = datos.map((d) => ({ fecha: d.fecha, valor: d[k], feriado: d.feriado }));
        const color = k === "observado" ? U.COLORES.ink : k === "residuo" ? U.COLORES.ink3 : U.COLORES.C;
        const marcas = [
          ...(k === "tendencia" ? [] : [Plot.ruleY([0], { stroke: U.COLORES.rule })]),
          Plot.lineY(serie, { x: "fecha", y: "valor", stroke: color, strokeWidth: rango === "todo" ? 1 : 1.6 }),
          Plot.text([nombre], { frameAnchor: "right", dx: 14, fill: U.COLORES.ink2, fontSize: 18, textAnchor: "start" }),
          Plot.tip(serie, Plot.pointerX({ x: "fecha", y: "valor", title: (d) => `${U.fechaCorta(d.fecha)}\n${nombre}: ${U.fmtK(d.valor)}${d.feriado ? "\nferiado o no laborable" : ""}` })),
        ];
        cont.append(Plot.plot(U.plotBase({
          height: ultimo ? 128 : 100, marginTop: 8, marginBottom: ultimo ? 34 : 6, marginLeft: 76, marginRight: 150,
          x: { domain: xDom, axis: ultimo ? "bottom" : null, label: null },
          y: { grid: true, tickFormat: U.tickM, label: null, ticks: 2, nice: true },
          marks: marcas,
        })));
      });
      U.reemplazar(grafico, cont);

      lectura.innerHTML = "El residuo es lo que la tendencia y los dos ciclos no explican. Un residuo grande es un día que no siguió el patrón: una anomalía. Los picos hacia abajo son los días a mirar.";
    }
    controles.append(U.botones([["todo", "Abril 2022 a agosto 2026"], ["zoom", "Marzo a agosto 2025"]], rango, (v) => { rango = v; dibujar(); }));
    dibujar();
    return {};
  },
};
