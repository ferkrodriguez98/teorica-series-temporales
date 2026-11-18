/* Zoom temporal: la misma serie a distintas escalas, con transición animada. */
DEMOS.zoom = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    const S = DATA.subteDiario;
    const serie = U.serie(S.inicio, S.total);
    const W = 1440, H = 540, m = { t: 16, r: 20, b: 40, l: 76 };

    const NIVELES = {
      todo: { desde: "2013-06-01", hasta: "2026-08-31", texto: "Trece años: tendencia, un pozo enorme en 2020 y una recuperación que no vuelve al nivel de antes." },
      anio: { desde: "2019-01-01", hasta: "2019-12-31", texto: "Un año (2019): enero y febrero bajos por las vacaciones, julio con el receso de invierno, diciembre que se apaga." },
      mes: { desde: "2019-05-01", hasta: "2019-05-31", texto: "Un mes (mayo de 2019): el patrón semanal domina. Cinco días altos y dos bajos, y algunos días que no siguen el patrón." },
      semana: { desde: "2019-05-13", hasta: "2019-05-19", texto: "Una semana: de lunes a viernes casi iguales, sábado a la mitad, domingo a un cuarto." },
      dia: { fecha: "2019-05-15", texto: "Un día (miércoles 15 de mayo de 2019), cada 15 minutos: pico a la mañana, pico a la tarde, valle al mediodía." },
    };

    const svg = d3.select(grafico).append("svg").attr("width", W).attr("height", H);
    const x = d3.scaleUtc().range([m.l, W - m.r]);
    const y = d3.scaleLinear().range([H - m.b, m.t]);
    const gx = svg.append("g").attr("transform", `translate(0,${H - m.b})`);
    const gy = svg.append("g").attr("transform", `translate(${m.l},0)`);
    const clip = svg.append("clipPath").attr("id", "clip-zoom").append("rect").attr("x", m.l).attr("y", 0).attr("width", W - m.l - m.r).attr("height", H);
    const camino = svg.append("path").attr("clip-path", "url(#clip-zoom)").attr("fill", "none").attr("stroke", U.COLORES.ink).attr("stroke-width", 1.6).attr("stroke-linejoin", "round");
    const puntos = svg.append("g").attr("clip-path", "url(#clip-zoom)");

    const estilarEjes = () => {
      svg.selectAll(".domain").attr("stroke", U.COLORES.rule);
      svg.selectAll(".tick line").attr("stroke", U.COLORES.rule);
      svg.selectAll(".tick text").attr("fill", U.COLORES.ink2).attr("font-size", 18).attr("font-family", "Inter");
    };
    const linea = d3.line().defined((d) => d.valor != null).x((d) => x(d.fecha)).y((d) => y(d.valor));

    function ir(nivel, animar = true) {
      const N = NIVELES[nivel];
      let datos, fmtX;
      if (nivel === "dia") {
        const v = DATA.subte15min[N.fecha];
        const d0 = U.dia(N.fecha);
        datos = v.map((p, i) => ({ fecha: new Date(d0.getTime() + i * 9e5), valor: p }));
        x.domain([d0, new Date(d0.getTime() + 864e5)]);
        fmtX = d3.utcFormat("%H:%M");
      } else {
        datos = serie;
        x.domain([U.dia(N.desde), U.sumarDias(U.dia(N.hasta), 1)]);
        fmtX = nivel === "todo" ? d3.utcFormat("%Y") : nivel === "anio" ? d3.utcFormat("%b") : d3.utcFormat("%a %d");
      }
      const vis = datos.filter((d) => d.fecha >= x.domain()[0] && d.fecha <= x.domain()[1] && d.valor != null);
      y.domain([0, d3.max(vis, (d) => d.valor) * 1.08]).nice();
      const t = svg.transition().duration(animar ? 1100 : 0).ease(d3.easeCubicInOut);
      gx.transition(t).call(d3.axisBottom(x).ticks(nivel === "semana" ? 7 : 10).tickFormat(fmtX).tickSizeOuter(0)).on("end", estilarEjes);
      gy.transition(t).call(d3.axisLeft(y).ticks(6).tickFormat(U.tickM).tickSize(-(W - m.l - m.r))).on("end", estilarEjes);
      if (nivel === "dia" || camino.datum()?.length !== datos.length) {
        camino.datum(datos).attr("opacity", 0).attr("d", linea).transition(t).attr("opacity", 1);
      } else {
        camino.datum(datos).transition(t).attr("d", linea);
      }
      camino.attr("stroke-width", nivel === "todo" ? 1 : 1.8);
      const conPuntos = nivel === "mes" || nivel === "semana";
      const sel = puntos.selectAll("circle").data(conPuntos ? vis : [], (d) => +d.fecha);
      sel.exit().remove();
      sel.enter().append("circle").attr("r", 5).attr("fill", U.COLORES.ink).attr("stroke", U.COLORES.surface).attr("stroke-width", 2)
        .attr("cx", (d) => x(d.fecha)).attr("cy", (d) => y(d.valor)).attr("opacity", 0)
        .merge(sel).transition(t).attr("cx", (d) => x(d.fecha)).attr("cy", (d) => y(d.valor)).attr("opacity", 1);
      setTimeout(estilarEjes, animar ? 1150 : 0);
      estilarEjes();
      lectura.textContent = N.texto;
    }

    controles.append(U.botones([["todo", "13 años"], ["anio", "Un año"], ["mes", "Un mes"], ["semana", "Una semana"], ["dia", "Un día"]], "todo", (v) => ir(v)));
    ir("todo", false);
    return {};
  },
};
