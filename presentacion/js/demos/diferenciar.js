/* Diferenciar: total diario del subte 2022 a 2025, en niveles, con diferencia de 1 día
   y con diferencia de 7 días, y la ACF de lo que se muestra. */
DEMOS.diferenciar = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    const S = DATA.subteDiario;
    const serie = U.recortar(U.serie(S.inicio, S.total), "2022-01-01", "2025-12-31");
    const x = serie.map((d) => d.valor);
    const K = 60, H = 530;
    const MODOS = {
      orig: { valores: x, titulo: "Total diario de pasajeros, 2022 a 2025" },
      d1: { valores: B3.dif(x, 1), titulo: "Diferencia de 1 día: cada día menos el día anterior" },
      d7: { valores: B3.dif(x, 7), titulo: "Diferencia de 7 días: cada día menos el mismo día de la semana anterior" },
    };
    for (const M of Object.values(MODOS)) M.acf = B3.acf(M.valores, K);
    let modo = "orig";

    const fila = U.el("div", { class: "b3-fila" });
    grafico.append(fila);
    const pS = B3.panel(fila, "", 900);
    const pA = B3.panel(fila, "ACF de lo que se muestra, rezagos 1 a 60", 500);
    const g = B3.graficoACF(pA.cuerpo, { ancho: 500, alto: H, K, dominio: [-0.6, 1], ticks: d3.range(7, K + 1, 7), etiquetaX: "Rezago (días)" });

    const diaCorto = (f) => `${U.DIAS[f.getUTCDay()].slice(0, 3)} ${U.fechaCorta(f)}`;

    function dibujar(animar = true) {
      const M = MODOS[modo];
      const datos = serie.map((d, i) => ({ fecha: d.fecha, valor: M.valores[i], i }));
      const enNiv = modo === "orig";
      const lag = modo === "d7" ? 7 : 1;
      const tope = d3.max(datos, (d) => (d.valor == null ? 0 : Math.abs(d.valor)));
      pS.titulo.textContent = M.titulo;
      U.reemplazar(pS.cuerpo, Plot.plot({
        width: 900, height: H, marginLeft: 72, marginRight: 14, marginTop: 12, marginBottom: 46,
        style: { fontFamily: "Inter, sans-serif", fontSize: "15px", color: U.COLORES.ink2, background: "transparent", overflow: "visible" },
        x: { label: null, ticks: "year", tickFormat: d3.utcFormat("%Y") },
        y: { label: null, grid: true, ticks: 6, tickFormat: U.tickM, domain: enNiv ? [0, Math.ceil(tope / 2.5e5) * 2.5e5] : [-tope * 1.04, tope * 1.04] },
        marks: [
          Plot.ruleY([0], { stroke: U.COLORES.ink3 }),
          Plot.lineY(datos, { x: "fecha", y: "valor", stroke: U.COLORES.ink, strokeWidth: 1 }),
          Plot.tip(datos, Plot.pointerX({
            x: "fecha", y: "valor",
            title: (d) => d.valor == null ? `${diaCorto(d.fecha)}: sin dato`
              : enNiv ? `${diaCorto(d.fecha)}\n${U.fmtK(d.valor)} pasajeros`
                : `${diaCorto(d.fecha)} menos ${diaCorto(serie[d.i - lag].fecha)}\n${B3.fmtSigno(d.valor)} pasajeros`,
          })),
        ],
      }));
      g.actualizar(M.acf, { animar });
      leer();
    }

    function leer() {
      const a = MODOS[modo].acf, r = (k) => B3.fmtR(a[k - 1].r);
      if (modo === "orig") {
        lectura.innerHTML = `La ACF tiene picos en 7, 14, 21… que bajan despacio (${r(7)} en 7, ${r(56)} en 56): además del ciclo semanal, el nivel de la serie cambia a lo largo del año y entre años.`;
      } else if (modo === "d1") {
        lectura.innerHTML = `Restar el día anterior saca el nivel, pero no el ciclo semanal: la ACF sigue en ${r(7)} en el rezago 7 y repite el pico en cada múltiplo de 7 (${r(56)} en 56).`;
      } else {
        const resto = d3.max(a.slice(7), (d) => Math.abs(d.r));
        lectura.innerHTML = `Restar el mismo día de la semana anterior saca el ciclo semanal: quedan ${r(1)} en el rezago 1 y ${r(7)} en el 7; desde el 8, ningún valor pasa de ${B3.fmtR(resto)} en valor absoluto. El negativo en 7 aparece porque un día atípico entra en la diferencia dos veces: sumando ese día y restando siete días después.`;
      }
    }

    controles.append(U.botones([["orig", "Original"], ["d1", "Diferencia de 1 día"], ["d7", "Diferencia de 7 días"]], modo, (v) => { modo = v; dibujar(); }));
    dibujar(false);
    return {};
  },
};
