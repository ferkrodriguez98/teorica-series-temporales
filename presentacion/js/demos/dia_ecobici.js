/* Escena: los viajes de Ecobici de un día, animados de estación a estación. Viernes seco contra viernes de lluvia. */
DEMOS.diaEcobici = {
  montar(el) {
    const E = DATA.ecobiciDias;
    let cual = E.seco, t = 8.5 * 60, play = false, ultimo = null, raf = null;
    const MIN_POR_SEG = 22;
    const AMARILLO = [245, 183, 0];

    const reloj = el.querySelector(".reloj");
    const hora = U.el("span"), sub = U.el("small");
    reloj.append(hora, sub);
    const panel = el.querySelector(".panel");
    const btn = U.el("button", { class: "boton", type: "button" }, "Reproducir");
    const rango = U.el("input", { type: "range", min: 0, max: 1439, step: 1, value: t });
    const etiqueta = (f) => `${U.DIAS[U.dia(f).getUTCDay()]} ${U.dia(f).getUTCDate()}/${U.dia(f).getUTCMonth() + 1}`;
    const dias = U.botones([[E.seco, `${etiqueta(E.seco)}, sin lluvia`], [E.lluvia, `${etiqueta(E.lluvia)}, con lluvia`]], cual, (v) => { cual = v; dibujarMini(); render(); });
    panel.append(btn, dias, rango);

    // Mini: viajes que empiezan por hora, y debajo la lluvia por hora (dos paneles, dos escalas)
    const mini = el.querySelector(".chart-mini");
    const W = 460, H1 = 104, H2 = 40;
    const svg = d3.select(mini).append("svg").attr("width", W).attr("height", H1 + H2 + 40);
    const x = d3.scaleLinear([0, 24], [0, W]);
    const g1 = svg.append("g"), g2 = svg.append("g").attr("transform", `translate(0,${H1 + 12})`);
    const cursor = svg.append("line").attr("y1", 0).attr("y2", H1 + H2 + 12).attr("stroke", "#f2f1ec").attr("stroke-dasharray", "3 3");
    svg.append("text").attr("x", 0).attr("y", 11).attr("fill", "#7d7b74").attr("font-size", 12).text("viajes que empiezan por hora");
    svg.append("text").attr("x", 0).attr("y", H1 + 24).attr("fill", "#7d7b74").attr("font-size", 12).text("lluvia, mm por hora");
    [0, 6, 12, 18, 24].forEach((h) => svg.append("text").attr("x", x(h)).attr("y", H1 + H2 + 34).attr("fill", "#7d7b74").attr("font-size", 12).attr("text-anchor", h === 0 ? "start" : h === 24 ? "end" : "middle").text(`${h} h`));
    const porHora = (f) => { const c = new Array(24).fill(0); E.dias[f].viajes.forEach((v) => c[Math.min(23, Math.floor(v[6] / 60))]++); return c; };
    const maxV = d3.max([E.seco, E.lluvia].flatMap(porHora));
    function dibujarMini() {
      const c = porHora(cual), ll = E.dias[cual].lluvia_hora;
      const y1 = d3.scaleLinear([0, maxV], [H1, 16]);
      g1.selectAll("rect").data(c).join("rect").attr("x", (d, h) => x(h) + 1).attr("width", x(1) - x(0) - 2).attr("y", (d) => y1(d)).attr("height", (d) => H1 - y1(d)).attr("rx", 2).attr("fill", "rgb(245,183,0)");
      const y2 = d3.scaleLinear([0, Math.max(10, d3.max(ll))], [H2, 18]);
      g2.selectAll("rect").data(ll).join("rect").attr("x", (d, h) => x(h) + 1).attr("width", x(1) - x(0) - 2).attr("y", (d) => y2(d)).attr("height", (d) => H2 - y2(d)).attr("rx", 2).attr("fill", "#5b9bf0");
    }

    function render() {
      const D = E.dias[cual];
      const hh = Math.floor(t / 60), mm = Math.floor(t % 60);
      hora.textContent = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
      const enCurso = D.viajes.reduce((n, v) => n + (v[6] <= t && v[7] >= t ? 1 : 0), 0);
      sub.textContent = `${U.fmt(enCurso)} bicicletas en viaje, ${U.fmt(D.total)} viajes en el día`;
      rango.value = t;
      cursor.attr("x1", x(t / 60)).attr("x2", x(t / 60));
      U.mapa().capas([
        new deck.ScatterplotLayer({ id: "eco-est", data: D.estaciones, getPosition: (d) => d, getRadius: 28, radiusMinPixels: 1.2, getFillColor: [242, 241, 236, 70] }),
        new deck.TripsLayer({
          id: "eco-viajes", data: D.viajes,
          getPath: (v) => [[v[0], v[1]], [v[2], v[3]], [v[4], v[5]]],
          getTimestamps: (v) => [v[6], (v[6] + v[7]) / 2, v[7]],
          getColor: AMARILLO, opacity: 0.85, widthMinPixels: 2.2, capRounded: true, jointRounded: true,
          fadeTrail: true, trailLength: 14, currentTime: t,
        }),
      ], { subte: 0.18 });
    }
    function paso(ts) {
      if (!play) return;
      if (ultimo != null) t = (t + ((ts - ultimo) / 1000) * MIN_POR_SEG) % 1440;
      ultimo = ts;
      render();
      raf = requestAnimationFrame(paso);
    }
    const reproducir = (on) => { play = on; ultimo = null; btn.textContent = on ? "Pausa" : "Reproducir"; if (on) raf = requestAnimationFrame(paso); else cancelAnimationFrame(raf); };
    btn.addEventListener("click", () => reproducir(!play));
    rango.addEventListener("input", () => { t = +rango.value; render(); });
    dibujarMini();
    return {
      entrar() { U.mapa().volar({ longitude: -58.425, latitude: -34.603, zoom: 12.25, pitch: 38, bearing: -10 }, 1200); render(); },
      salir() { reproducir(false); },
    };
  },
};
