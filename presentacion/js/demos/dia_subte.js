/* Escena de apertura: un día del subte, estación por estación, cada 15 minutos. */
DEMOS.diaSubte = {
  montar(el) {
    const datos = DATA.subteDiaTipico;
    const est = DATA.mapaBase.estaciones.filter((e) => datos.perfiles.habil[e.clave]);
    let tipo = "habil", t = 33, play = false, ultimo = null, raf = null, arranque = null, rampa = null;
    const SLOTS_POR_SEG = 4.8;

    const reloj = el.querySelector(".reloj");
    const hora = U.el("span");
    const sub = U.el("small");
    reloj.append(hora, sub);

    const panel = el.querySelector(".panel");
    const btn = U.el("button", { class: "boton", type: "button" }, "Reproducir");
    const rango = U.el("input", { type: "range", min: 0, max: 95.99, step: 0.01, value: t });
    const tipos = U.botones([["habil", "Día hábil"], ["sabado", "Sábado"], ["domingo", "Domingo"]], tipo, (v) => { tipo = v; dibujarCurva(); render(); });
    panel.append(btn, tipos, rango);

    // Curva del total del sistema por franja, con un cursor
    const mini = el.querySelector(".chart-mini");
    const W = 460, H = 130;
    const svg = d3.select(mini).append("svg").attr("width", W).attr("height", H + 22);
    const x = d3.scaleLinear([0, 95], [0, W]);
    const y = d3.scaleLinear().range([H, 6]);
    const area = svg.append("path").attr("fill", "rgba(242,241,236,0.16)");
    const linea = svg.append("path").attr("fill", "none").attr("stroke", "#f2f1ec").attr("stroke-width", 2);
    const cursor = svg.append("line").attr("y1", 0).attr("y2", H).attr("stroke", "#f2f1ec").attr("stroke-width", 1.5).attr("stroke-dasharray", "3 3");
    [0, 24, 48, 72, 95].forEach((s) => svg.append("text").attr("x", x(s)).attr("y", H + 18).attr("fill", "#7d7b74").attr("font-size", 15).attr("text-anchor", s === 0 ? "start" : s === 95 ? "end" : "middle").text(s === 95 ? "24 h" : `${s / 4} h`));
    let totales = [];
    function dibujarCurva() {
      const p = datos.perfiles[tipo];
      totales = d3.range(96).map((s) => d3.sum(est, (e) => p[e.clave][s]));
      y.domain([0, d3.max(datos.perfiles.habil ? d3.range(96).map((s) => d3.sum(est, (e) => datos.perfiles.habil[e.clave][s])) : totales)]);
      area.attr("d", d3.area().x((d, i) => x(i)).y0(H).y1((d) => y(d)).curve(d3.curveMonotoneX)(totales));
      linea.attr("d", d3.line().x((d, i) => x(i)).y((d) => y(d)).curve(d3.curveMonotoneX)(totales));
    }

    const valor = (e) => {
      const p = datos.perfiles[tipo][e.clave];
      const s = Math.floor(t), f = t - s;
      return p[s] * (1 - f) + p[Math.min(95, s + 1)] * f;
    };

    function render() {
      const hh = Math.floor(t / 4), mm = Math.floor((t % 4) * 15);
      hora.textContent = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
      sub.textContent = `pasajeros cada 15 min, promedio ${tipo === "habil" ? "de días hábiles" : tipo === "sabado" ? "de sábados" : "de domingos"} de ${datos.anio}`;
      rango.value = t;
      cursor.attr("x1", x(t)).attr("x2", x(t));
      U.mapa().capas([
        new deck.ColumnLayer({
          id: "columnas", data: est, diskResolution: 20, radius: 115, extruded: true, elevationScale: 1,
          getPosition: (e) => e.pos, getElevation: (e) => valor(e) * 1.05,
          getFillColor: (e) => U.rgb(U.COLORES[e.linea], 235),
          updateTriggers: { getElevation: [t, tipo] },
          pickable: true, material: { ambient: 0.55, diffuse: 0.6, shininess: 20 },
          tooltip: (e) => `<b>${e.nombre}</b> (línea ${e.linea})<br>${U.fmt(Math.round(valor(e)))} pasajeros en 15 min`,
        }),
      ]);
    }

    function paso(ts) {
      if (!play) return;
      if (rampa == null) rampa = ts;
      const f = Math.min(1, (ts - rampa) / 2500), suave = f * f * (3 - 2 * f);
      if (ultimo != null) t = (t + ((ts - ultimo) / 1000) * SLOTS_POR_SEG * suave) % 96;
      ultimo = ts;
      render();
      raf = requestAnimationFrame(paso);
    }
    const reproducir = (on) => {
      play = on; ultimo = null; rampa = null; btn.textContent = on ? "Pausa" : "Reproducir";
      if (on) raf = requestAnimationFrame(paso); else cancelAnimationFrame(raf);
    };
    btn.addEventListener("click", () => reproducir(!play));
    rango.addEventListener("input", () => { reproducir(false); t = +rango.value; render(); });

    dibujarCurva();
    return {
      entrar() { clearTimeout(arranque); reproducir(false); t = 20; U.mapa().volar(U.mapa().vistaCABA, 1200); render(); arranque = setTimeout(() => reproducir(true), 1200); },
      salir() { clearTimeout(arranque); reproducir(false); },
      alternar() { clearTimeout(arranque); reproducir(!play); },
    };
  },
};
