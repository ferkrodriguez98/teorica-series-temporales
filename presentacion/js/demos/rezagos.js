/* Rezagos: pasajeros de hoy contra los de hace k días (2023 a 2025) y la ACF de 1 a 60.
   Las barras de la ACF son la misma correlación de Pearson que la del diagrama, para cada k. */
DEMOS.rezagos = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    const S = DATA.subteDiario;
    const serie = U.recortar(U.serie(S.inicio, S.total), "2023-01-01", "2025-12-31");
    const x = serie.map((d) => d.valor);
    const KMAX = 30, KACF = 60;
    const acf = d3.range(1, KACF + 1).map((k) => ({ k, r: B3.corrRezago(x, k) }));
    const rDe = (k) => acf[k - 1].r;
    let k = 1;

    const fila = U.el("div", { class: "b3-fila" });
    grafico.append(fila);
    const pD = B3.panel(fila, "", 480);
    const pA = B3.panel(fila, "Autocorrelación (ACF): la misma correlación para cada rezago, de 1 a 60 días", 920);

    /* ---------- Diagrama de dispersión ---------- */
    const W = 480, H = 530, m = { t: 14, r: 16, b: 46, l: 66 };
    const tope = Math.ceil((d3.max(x) * 1.03) / 1e5) * 1e5;
    const sx = d3.scaleLinear([0, tope], [m.l, W - m.r]);
    const sy = d3.scaleLinear([0, tope], [H - m.b, m.t]);
    const svg = d3.select(pD.cuerpo).append("svg").attr("width", W).attr("height", H).style("display", "block");
    const ticks = d3.range(0, tope + 1, 5e5);
    const gx = svg.append("g").attr("transform", `translate(0,${H - m.b})`)
      .call(d3.axisBottom(sx).tickValues(ticks).tickFormat(U.tickM).tickSize(-(H - m.t - m.b)).tickPadding(8));
    const gy = svg.append("g").attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(sy).tickValues(ticks).tickFormat(U.tickM).tickSize(-(W - m.l - m.r)).tickPadding(8));
    [gx, gy].forEach((g) => { g.select(".domain").remove(); B3.estilarEjes(g); g.selectAll(".tick line").attr("stroke", U.COLORES.grid); });
    svg.append("line").attr("x1", sx(0)).attr("y1", sy(0)).attr("x2", sx(tope)).attr("y2", sy(tope))
      .attr("stroke", U.COLORES.ink3).attr("stroke-width", 1).attr("stroke-dasharray", "4 4");
    const etiq = (xx, yy, ancla, texto) => svg.append("text").attr("x", xx).attr("y", yy).attr("text-anchor", ancla)
      .attr("fill", U.COLORES.ink2).attr("font-size", 18).attr("font-family", "IBM Plex Sans, sans-serif").text(texto);
    etiq(m.l - 58, m.t - 2, "start", "↑ Hoy");
    const etiqX = etiq(W - m.r, H - 6, "end", "");
    const gPuntos = svg.append("g");
    const anillo = svg.append("circle").attr("r", 7).attr("fill", "none").attr("stroke", U.COLORES.B).attr("stroke-width", 2).attr("opacity", 0);
    const tip = B3.tip(pD.cuerpo);
    let delaunay = null, pares = [];

    function dibujarPuntos(animar) {
      pares = B3.pares(x, k);
      gPuntos.selectAll("circle").data(pares, (d) => d[0]).join(
        (enter) => enter.append("circle").attr("r", 2.6).attr("fill", U.COLORES.ink).attr("fill-opacity", 0.32)
          .attr("cx", (d) => sx(d[2])).attr("cy", (d) => sy(d[1])).attr("opacity", 0)
          .call((s) => s.transition().duration(animar ? 300 : 0).attr("opacity", 1)),
        (update) => update.call((s) => s.transition().duration(animar ? 300 : 0).ease(d3.easeCubicOut).attr("cx", (d) => sx(d[2]))),
        (exit) => exit.remove(),
      );
      delaunay = d3.Delaunay.from(pares, (d) => sx(d[2]), (d) => sy(d[1]));
      etiqX.text(`Hace ${k} ${k === 1 ? "día" : "días"} →`);
      pD.titulo.innerHTML = `Pasajeros de cada día contra ${k === 1 ? "los del día anterior" : `los de ${k} días antes`} <span class="b3-r">r = ${B3.fmtR(rDe(k))}</span>`;
    }

    svg.on("mousemove", (ev) => {
      const [px, py] = d3.pointer(ev, svg.node());
      const i = delaunay ? delaunay.find(px, py) : -1;
      const d = pares[i];
      if (!d || Math.hypot(sx(d[2]) - px, sy(d[1]) - py) > 24) { tip.ocultar(); anillo.attr("opacity", 0); return; }
      const fh = serie[d[0]].fecha, fa = serie[d[0] - k].fecha;
      anillo.attr("cx", sx(d[2])).attr("cy", sy(d[1])).attr("opacity", 1);
      tip.mostrar(sx(d[2]), sy(d[1]) - 4,
        `${U.DIAS[fh.getUTCDay()]} ${U.fechaCorta(fh)}: <b>${U.fmtK(d[1])}</b><br><span class="t2">${U.DIAS[fa.getUTCDay()]} ${U.fechaCorta(fa)}: ${U.fmtK(d[2])}</span>`);
    }).on("mouseleave", () => { tip.ocultar(); anillo.attr("opacity", 0); });

    /* ---------- ACF ---------- */
    const g = B3.graficoACF(pA.cuerpo, {
      ancho: 920, alto: H, K: KACF, dominio: [-0.4, 1], ticks: d3.range(7, KACF + 1, 7),
      etiquetaX: "Rezago (días)", maxClic: KMAX, alClic: (kk) => deslizador.set(kk),
    });

    /* Picos: múltiplos de 7 */
    const picos = [7, 14, 21, 28].map((kk) => `${B3.fmtR(rDe(kk))} en ${kk}`).join("; ");

    function leer() {
      const r = B3.fmtR(rDe(k));
      let t;
      if (k === 1) t = `Con k = 1, r = ${r}: los pares de dos días hábiles quedan cerca de la diagonal; los de viernes a sábado, sábado a domingo y domingo a lunes quedan lejos.`;
      else if (k % 7 === 0) t = `Con k = ${k}, cada día queda contra el mismo día de la semana, ${k / 7} ${k === 7 ? "semana" : "semanas"} antes: r = ${r}.`;
      else t = `Con k = ${k}, r = ${r}. ${k} no es múltiplo de 7, así que parte de los pares junta un día hábil con un sábado o un domingo.`;
      lectura.innerHTML = `${t} En la ACF, los picos están en los múltiplos de 7 (${picos}) por el ciclo semanal.`;
    }

    function cambiar(nuevo, animar = true) {
      k = nuevo;
      dibujarPuntos(animar);
      g.actualizar(acf, { resaltar: k, animar });
      leer();
    }

    const deslizador = U.slider({ etiqueta: "Rezago k (días)", min: 1, max: KMAX, valor: k, alCambiar: (v) => cambiar(v) });
    controles.append(deslizador);
    cambiar(k, false);
    return {};
  },
};
