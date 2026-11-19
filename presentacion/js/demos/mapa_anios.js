/* Escena: promedio diario de pasajeros por estación, año por año (2013 a 2026). */
DEMOS.mapaAnios = {
  montar(el) {
    const A = DATA.subteAnualEstaciones;
    const anios = Object.keys(A).map(Number).sort();
    const est = DATA.mapaBase.estaciones;
    let i = anios.indexOf(2019), play = false, timer = null, arranque = null;

    const reloj = el.querySelector(".reloj");
    const grande = U.el("span");
    const sub = U.el("small");
    reloj.append(grande, sub);
    const panel = el.querySelector(".panel");
    const btn = U.el("button", { class: "boton", type: "button" });
    U.iconoPlay(btn, false);
    const rango = U.el("input", { type: "range", min: 0, max: anios.length - 1, step: 1, value: i });
    panel.append(btn, rango);

    // Barras del promedio diario de todo el sistema por año
    const mini = el.querySelector(".chart-mini");
    const W = 460, H = 130;
    const totales = anios.map((a) => d3.sum(Object.values(A[a])));
    const svg = d3.select(mini).append("svg").attr("width", W).attr("height", H + 22);
    const x = d3.scaleBand(anios, [0, W]).padding(0.18);
    const y = d3.scaleLinear([0, d3.max(totales)], [H, 4]);
    const barras = svg.selectAll("rect").data(anios).join("rect")
      .attr("x", (a) => x(a)).attr("width", x.bandwidth()).attr("y", (a, k) => y(totales[k])).attr("height", (a, k) => H - y(totales[k])).attr("rx", 2);
    svg.selectAll("text").data(anios.filter((a) => a % 2 === 1 || a === 2026)).join("text")
      .attr("x", (a) => x(a) + x.bandwidth() / 2).attr("y", H + 18).attr("text-anchor", "middle").attr("fill", "#7d7b74").attr("font-size", 15).text((a) => String(a).slice(2));

    const parcial = { 2013: "junio a diciembre", 2026: "enero a agosto" };
    function render() {
      const a = anios[i];
      const datos = A[a];
      grande.textContent = a;
      sub.textContent = `promedio diario por estación${parcial[a] ? ` (${parcial[a]})` : ""}: ${U.fmtK(totales[i])} pasajeros por día en total`;
      rango.value = i;
      barras.transition().duration(600).attr("fill", (b) => (b === a ? "#f2f1ec" : "rgba(242,241,236,0.25)"));
      U.mapa().capas([
        new deck.ColumnLayer({
          // Todas las estaciones siempre: las que todavía no existen tienen altura cero y son transparentes,
          // así al aparecer crecen en lugar de saltar
          id: "anios", data: est, diskResolution: 20, radius: 120, extruded: true,
          getPosition: (e) => e.pos, getElevation: (e) => (datos[e.clave] ?? 0) * 0.045,
          getFillColor: (e) => U.rgb(U.COLORES[e.linea], datos[e.clave] != null ? 235 : 0),
          updateTriggers: { getElevation: [a], getFillColor: [a] },
          transitions: { getElevation: { duration: 1100, easing: d3.easeCubicInOut }, getFillColor: { duration: 900 } },
          pickable: true, material: { ambient: 0.55, diffuse: 0.6, shininess: 20 },
          tooltip: (e) => `<b>${e.nombre}</b> (línea ${e.linea})<br>${a}: ${U.fmt(datos[e.clave])} pasajeros por día`,
        }),
      ]);
    }
    const reproducir = (on) => {
      play = on; U.iconoPlay(btn, on);
      clearTimeout(timer);
      if (on) { const paso = () => { i = (i + 1) % anios.length; render(); timer = setTimeout(paso, i === anios.length - 1 ? 3000 : 1400); }; timer = setTimeout(paso, i === anios.length - 1 ? 3000 : 1400); }
    };
    btn.addEventListener("click", () => { clearTimeout(arranque); reproducir(!play); });
    rango.addEventListener("input", () => { reproducir(false); i = +rango.value; render(); });
    return {
      entrar() { U.mapa().volar({ ...U.mapa().vistaCABA, pitch: 45, bearing: -8 }, 1200); i = 0; render(); arranque = setTimeout(() => reproducir(true), 1200); },
      salir() { clearTimeout(arranque); reproducir(false); },
      alternar() { clearTimeout(arranque); reproducir(!play); },
    };
  },
};
