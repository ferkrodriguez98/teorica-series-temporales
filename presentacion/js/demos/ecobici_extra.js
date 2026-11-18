/* Ecobici: perfil horario comparado con el subte, y la red de estaciones año por año. */
DEMOS.perfiles = {
  montar(el) {
    const { grafico, lectura } = U.armar(el);
    const T = DATA.subteDiaTipico.perfiles, P = DATA.ecobiciSeries.perfil2025;
    const TIPOS = [["habil", "Días hábiles"], ["sabado", "Sábados"], ["domingo", "Domingos"]];
    const filas = [];
    for (const [t, nombre] of TIPOS) {
      const sub = d3.range(24).map((h) => d3.sum(Object.values(T[t]), (v) => v[h * 4] + v[h * 4 + 1] + v[h * 4 + 2] + v[h * 4 + 3]));
      const sTot = d3.sum(sub), eTot = d3.sum(P[t]);
      d3.range(24).forEach((h) => {
        filas.push({ tipo: nombre, hora: h, serie: "Subte", p: sub[h] / sTot });
        filas.push({ tipo: nombre, hora: h, serie: "Ecobici", p: P[t][h] / eTot });
      });
    }
    U.reemplazar(grafico, Plot.plot(U.plotBase({
      height: 470, marginTop: 30,
      fx: { domain: TIPOS.map((t) => t[1]), label: null, padding: 0.08 },
      x: { domain: [0, 23], ticks: [0, 6, 12, 18], tickFormat: (h) => `${h} h`, label: null },
      y: { grid: true, tickFormat: (d) => `${Math.round(d * 100)} %`, label: null },
      color: { domain: ["Subte", "Ecobici"], range: [U.COLORES.C, U.COLORES.ecobici], legend: true },
      marks: [
        Plot.ruleY([0], { stroke: U.COLORES.rule }),
        Plot.lineY(filas, { fx: "tipo", x: "hora", y: "p", stroke: "serie", strokeWidth: 2.2, curve: "monotone-x" }),
        Plot.tip(filas, Plot.pointer({ fx: "tipo", x: "hora", y: "p", title: (d) => `${d.serie}, ${d.tipo.toLowerCase()}, ${d.hora} h\n${(d.p * 100).toFixed(1).replace(".", ",")} % del día` })),
      ],
    })));
    lectura.innerHTML = "Promedio de 2025 sin feriados. El subte cuenta entradas por molinete; Ecobici, retiros de bicicletas. Cada curva es el porcentaje de los viajes del día en cada hora y suma 100 %, así se comparan formas y no volúmenes.";
    return {};
  },
};

DEMOS.redEcobici = {
  montar(el) {
    const R = DATA.ecobiciRed.anios;
    const anios = Object.keys(R).map(Number).sort();
    let i = anios.indexOf(2019), play = false, timer = null, arranque = null;
    const reloj = el.querySelector(".reloj");
    const grande = U.el("span"), sub = U.el("small");
    reloj.append(grande, sub);
    const panel = el.querySelector(".panel");
    const btn = U.el("button", { class: "boton", type: "button" }, "Reproducir");
    const rango = U.el("input", { type: "range", min: 0, max: anios.length - 1, step: 1, value: i });
    panel.append(btn, rango);

    const mini = el.querySelector(".chart-mini");
    const W = 460, H = 120;
    const porDia = anios.map((a) => R[a].viajes / R[a].dias);
    const svg = d3.select(mini).append("svg").attr("width", W).attr("height", H + 40);
    svg.append("text").attr("x", 0).attr("y", 11).attr("fill", "#7d7b74").attr("font-size", 15).text("viajes por día con datos");
    const x = d3.scaleBand(anios, [0, W]).padding(0.18);
    const y = d3.scaleLinear([0, d3.max(porDia)], [H + 16, 22]);
    const barras = svg.selectAll("rect").data(anios).join("rect").attr("x", (a) => x(a)).attr("width", x.bandwidth())
      .attr("y", (a, k) => y(porDia[k])).attr("height", (a, k) => H + 16 - y(porDia[k])).attr("rx", 2);
    svg.selectAll(".t").data(anios.filter((a) => a % 2 === 0)).join("text").attr("x", (a) => x(a) + x.bandwidth() / 2).attr("y", H + 34)
      .attr("text-anchor", "middle").attr("fill", "#7d7b74").attr("font-size", 15).text((a) => String(a).slice(2));

    const SIS = { M: "sistema manual", A: "primer sistema automático", B: "sistema actual (desde 2019)" };
    function render() {
      const a = anios[i], D = R[a];
      grande.textContent = a;
      sub.textContent = `${D.estaciones.length} estaciones, ${U.fmt(Math.round(D.viajes / D.dias))} viajes por día`;
      rango.value = i;
      barras.attr("fill", (b) => (b === a ? "rgb(245,183,0)" : "rgba(242,241,236,0.25)"));
      U.mapa().capas([
        new deck.ScatterplotLayer({
          id: "eco-red", data: D.estaciones, getPosition: (d) => [d[0], d[1]], getRadius: (d) => 30 + Math.sqrt(d[2]) * 9,
          radiusUnits: "meters", getFillColor: [245, 183, 0, 200], stroked: true, getLineColor: [14, 16, 19, 255], lineWidthMinPixels: 0.5,
          pickable: true, updateTriggers: { getRadius: [a] }, transitions: { getRadius: 500 },
          tooltip: (d) => `${a}: ${U.fmt(d[2], 1)} retiros más devoluciones por día`,
        }),
      ], { subte: 0.15 });
    }
    const reproducir = (on) => {
      play = on; btn.textContent = on ? "Pausa" : "Reproducir"; clearTimeout(timer);
      if (on) { const paso = () => { i = (i + 1) % anios.length; render(); timer = setTimeout(paso, i === anios.length - 1 ? 3000 : 1000); }; timer = setTimeout(paso, i === anios.length - 1 ? 3000 : 1000); }
    };
    btn.addEventListener("click", () => { clearTimeout(arranque); reproducir(!play); });
    rango.addEventListener("input", () => { reproducir(false); i = +rango.value; render(); });
    return {
      entrar() { U.mapa().volar({ longitude: -58.445, latitude: -34.605, zoom: 11.9, pitch: 0, bearing: 0 }, 1200); i = 0; render(); arranque = setTimeout(() => reproducir(true), 1200); },
      salir() { clearTimeout(arranque); reproducir(false); },
      alternar() { clearTimeout(arranque); reproducir(!play); },
    };
  },
};
