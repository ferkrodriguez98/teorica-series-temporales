/* Media móvil con ventana ajustable, centrada o hacia atrás. */
DEMOS.mediaMovil = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    const S = DATA.subteDiario;
    const serie = U.recortar(U.serie(S.inicio, S.total), "2022-01-01", "2025-12-31");
    let k = 7, centrada = true;

    function dibujar() {
      const mm = U.mediaMovil(serie.map((d) => d.valor), k, centrada);
      const suav = serie.map((d, i) => ({ fecha: d.fecha, valor: mm[i] }));
      const plot = Plot.plot(U.plotBase({
        height: 540,
        y: { grid: true, ticks: 8, tickFormat: U.tickM, label: null, domain: [0, 1.45e6] },
        x: { label: null },
        marks: [
          Plot.lineY(serie, { x: "fecha", y: "valor", stroke: U.COLORES.ink3, strokeWidth: 0.8, strokeOpacity: 0.55 }),
          Plot.lineY(suav, { x: "fecha", y: "valor", stroke: U.COLORES.B, strokeWidth: 2.4 }),
          Plot.ruleY([0], { stroke: U.COLORES.rule }),
          Plot.tip(suav, Plot.pointerX({ x: "fecha", y: "valor", title: (d) => `${U.fechaCorta(d.fecha)}\nmedia de ${k} días: ${U.fmtK(d.valor)}` })),
        ],
      }));
      U.reemplazar(grafico, plot);
      lectura.innerHTML = k === 1
        ? "Con ventana de 1 día la serie queda igual: cada punto es el promedio de sí mismo."
        : k < 7
          ? `Con ${k} días la ventana no llega a cubrir una semana completa: el ciclo semanal sigue apareciendo.`
          : k % 7 === 0 && k <= 28
            ? `Con <b>${k} días</b> (${k / 7} ${k === 7 ? "semana" : "semanas"} exactas) cada promedio tiene la misma cantidad de lunes, martes, sábados y domingos: el ciclo semanal desaparece.`
            : k < 60
              ? `Con ${k} días se ve el nivel de cada mes y las vacaciones de verano e invierno.`
              : `Con ${k} días queda la tendencia de fondo. ${centrada ? "" : "Hacia atrás, la curva llega tarde a cada cambio."}`;
    }
    controles.append(
      U.slider({ etiqueta: "Ventana (días)", min: 1, max: 365, valor: k, alCambiar: (v) => { k = v; dibujar(); } }),
      U.botones([[true, "Centrada"], [false, "Hacia atrás"]], true, (v) => { centrada = v; dibujar(); }),
    );
    dibujar();
    return {};
  },
};
