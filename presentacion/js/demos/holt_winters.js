/* Holt-Winters aditivo con estacionalidad semanal, entrenado en el navegador (1/1/2023 a 31/5/2025)
   y evaluado en junio de 2025. Sliders de α, β y γ. */
DEMOS.holtWinters = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    el.classList.add("b4");
    const P = DATA.modelos.pronosticos;
    const DESDE = "2023-01-01", HASTA = "2025-05-31";
    const y = B4.interpolar(B4.tramo(DESDE, HASTA));
    const hist = B4.historia();
    const jun = B4.junio();
    const offset = B4.indice(P.historia_inicio) - B4.indice(DESDE);
    const SM = P.modelos["Holt-Winters"].params;
    const ref = P.modelos["Ingenuo estacional"];
    let par = { alfa: 0.5, beta: 0, gamma: 0.3 };

    const fmtPar = (v) => { let s = v.toFixed(3); if (s.endsWith("0")) s = s.slice(0, -1); return s.replace(".", ","); };
    const pct = (v) => U.fmt(v * 100, Math.abs(v * 100 - Math.round(v * 100)) < 1e-6 ? 0 : 1) + " %";

    /* Estructura: gráfico + panel, lectura en tres columnas */
    controles.classList.add("b4-sliders");
    const grid = U.el("div", { class: "b4-grid" });
    const izq = U.el("div");
    const panel = U.el("div", { class: "b4-panel" });
    grafico.replaceWith(grid);
    grid.append(izq, panel);
    izq.append(B4.leyenda([
      ["linea", U.COLORES.ink3, "abril y mayo"], ["linea", U.COLORES.modelo + "73", "ajuste a un paso"],
      ["linea", U.COLORES.modelo, "pronóstico"], ["punteada", U.COLORES.real, "real de junio"]]), grafico);

    const formula = U.el("div", { class: "b4-formula" });
    B4.tex(formula, String.raw`\hat y_{T+h} = \ell_T + h\, b_T + s_{T+h-7}`);
    const estado = U.el("div");
    const graficoS = U.el("div");
    const cifras = U.el("div", { class: "b4-cifras" });
    panel.append(
      U.el("div", { class: "b4-bloque" }, U.el("h4", {}, "Pronóstico"), formula,
        U.el("div", { class: "b4-nota", style: "margin-top:0" }, "ℓ: nivel · b: tendencia por día · s: efecto del día de la semana")),
      U.el("div", { class: "b4-bloque" }, U.el("h4", {}, "Estado al 31/5/2025"), estado, graficoS),
      U.el("div", { class: "b4-bloque" }, U.el("h4", {}, "Junio de 2025"), cifras,
        U.el("div", { class: "b4-nota" }, `Ingenuo estacional: MAE ${B4.num(ref.MAE)}, MAPE ${B4.pct(ref.MAPE)}.`)),
    );
    lectura.style.cssText = "display:grid; grid-template-columns: repeat(3, 1fr); gap: 32px; line-height: 1.4;";
    const lecA = U.el("div"), lecB = U.el("div"), lecG = U.el("div");
    lectura.append(lecA, lecB, lecG);

    const ORDEN = [1, 2, 3, 4, 5, 6, 0]; // lunes a domingo
    const NOMBRE = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

    function dibujar() {
      const r = B4.hw(y, par);
      const pred = r.pronosticar(jun.length);
      const m = B4.metricas(P.real, pred);
      const ajuste = hist.map((d, i) => ({ fecha: d.fecha, v: r.ajuste[offset + i] }));
      const pron = jun.map((d, i) => ({ fecha: d.fecha, v: pred[i], real: d.real, feriado: d.feriado }));
      const ferJ = jun.filter((d) => d.feriado).map((d) => d.fecha);
      const plot = Plot.plot(U.plotBase({
        width: 1024, height: 470, marginLeft: 64, marginTop: 28,
        x: { label: null, domain: [U.sumarDias(hist[0].fecha, -1), U.sumarDias(jun[jun.length - 1].fecha, 1)], tickFormat: (d) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}`, ticks: d3.utcWeek.every(1) },
        y: { grid: true, tickFormat: U.tickM, label: null, domain: [0, 1.15e6] },
        marks: [
          ...B4.marcasFeriados(ferJ, { alto: 1.15e6 }),
          Plot.ruleX([U.sumarDias(jun[0].fecha, -0.5)], { stroke: U.COLORES.ink3, strokeDasharray: "3,3" }),
          Plot.text([U.sumarDias(jun[0].fecha, -0.5)], { x: (d) => d, y: 1.15e6, text: () => "pronóstico →", dx: 6, dy: -8, textAnchor: "start", fontSize: 16, fill: U.COLORES.ink2 }),
          Plot.lineY(hist, { x: "fecha", y: "valor", stroke: U.COLORES.ink3, strokeWidth: 1.2 }),
          Plot.dot(hist, { x: "fecha", y: "valor", r: 2, fill: U.COLORES.ink3 }),
          Plot.lineY(ajuste, { x: "fecha", y: "v", stroke: U.COLORES.modelo, strokeWidth: 1.2, strokeOpacity: 0.45, clip: true }),
          Plot.lineY(jun, { x: "fecha", y: "real", stroke: U.COLORES.real, strokeWidth: 1.8, strokeDasharray: "1.5,4", strokeLinecap: "round" }),
          Plot.dot(jun, { x: "fecha", y: "real", r: 2.6, fill: U.COLORES.real }),
          Plot.lineY(pron, { x: "fecha", y: "v", stroke: U.COLORES.modelo, strokeWidth: 2.2, clip: true }),
          Plot.ruleY([0], { stroke: U.COLORES.rule }),
          Plot.tip([...hist.map((d, i) => ({ fecha: d.fecha, v: d.valor, t: `${U.fechaCorta(d.fecha)} (${B4.DIAS3[d.fecha.getUTCDay()]})\nreal: ${B4.num(d.valor)}\najuste a un paso: ${B4.num(ajuste[i].v)}` })),
                    ...pron.map((d) => ({ fecha: d.fecha, v: d.real, t: `${U.fechaCorta(d.fecha)} (${B4.DIAS3[d.fecha.getUTCDay()]})${d.feriado ? ", feriado" : ""}\nreal: ${B4.num(d.real)}\npronóstico: ${B4.num(d.v)}` }))],
            Plot.pointerX({ x: "fecha", y: "v", title: "t" })),
        ],
      }));
      U.reemplazar(grafico, plot);

      /* Estado final */
      estado.innerHTML = `<div class="b4-cifras" style="margin-bottom:10px"><div class="b4-cifra"><div class="v" style="font-size:1.35em">${B4.mil(r.nivel)}</div><div class="e">nivel ℓ</div></div>` +
        `<div class="b4-cifra"><div class="v" style="font-size:1.35em">${B4.signo(r.tendencia)}</div><div class="e">tendencia b, por día</div></div></div>`;
      const efectos = r.estacion.map((v, j) => ({ dia: (jun[0].fecha.getUTCDay() + j) % 7, v })); // j = 0 es el 1/6
      const datosS = ORDEN.map((d) => ({ nombre: NOMBRE[d], v: efectos.find((e) => e.dia === d).v }));
      U.reemplazar(graficoS, Plot.plot({
        width: 380, height: 130, marginLeft: 64, marginRight: 4, marginTop: 6, marginBottom: 22,
        style: { fontFamily: "IBM Plex Sans, sans-serif", fontSize: "16px", color: U.COLORES.ink2, background: "transparent" },
        x: { domain: datosS.map((d) => d.nombre), label: null, tickSize: 0, padding: 0.25 },
        y: { domain: [-5e5, 3e5], ticks: [-4e5, 0, 2e5], tickFormat: (d) => (d === 0 ? "0" : (d > 0 ? "+" : "−") + U.fmt(Math.abs(d) / 1e3) + " mil"), grid: true, label: null, tickSize: 0 },
        marks: [
          Plot.barY(datosS, { x: "nombre", y: "v", fill: U.COLORES.ink2, rx: 2, clip: true }),
          Plot.ruleY([0], { stroke: U.COLORES.ink3 }),
          Plot.tip(datosS, Plot.pointerX({ x: "nombre", y: "v", title: (d) => `${d.nombre}: ${B4.signo(d.v)} pasajeros` })),
        ],
      }));

      cifras.innerHTML = `<div class="b4-cifra"><div class="v">${B4.num(m.MAE)}</div><div class="e">MAE (pasajeros)</div></div>` +
        `<div class="b4-cifra"><div class="v">${B4.pct(m.MAPE)}</div><div class="e">MAPE</div></div>`;

      const a = par.alfa, b = par.beta, g = par.gamma;
      lecA.innerHTML = `<b>α = ${fmtPar(a)}</b> · ` + (a === 0 ? "El nivel no se actualiza: queda en su valor inicial."
        : a === 1 ? "El nivel es el último dato, descontado el efecto de su día de la semana."
        : `El nivel toma ${pct(a)} del último dato (descontado el efecto de su día) y ${pct(1 - a)} de lo que traía.`);
      lecB.innerHTML = `<b>β = ${fmtPar(b)}</b> · ` + (b === 0 ? "La tendencia no se actualiza: queda en su valor inicial, cero."
        : `La tendencia toma ${pct(b)} de cada cambio del nivel y ${pct(1 - b)} de la pendiente que traía.`);
      lecG.innerHTML = `<b>γ = ${fmtPar(g)}</b> · ` + (g === 0 ? "El efecto de cada día de la semana queda fijo en su valor inicial."
        : g === 1 ? "El efecto de cada día de la semana es el último desvío observado ese día."
        : `El efecto de cada día de la semana se corrige con ${pct(g)} del último desvío observado ese día.`);
    }

    const sA = U.slider({ etiqueta: "α nivel", min: 0, max: 1, step: 0.001, valor: par.alfa, formato: fmtPar, alCambiar: (v) => { par.alfa = v; dibujar(); } });
    const sB = U.slider({ etiqueta: "β tendencia", min: 0, max: 1, step: 0.001, valor: par.beta, formato: fmtPar, alCambiar: (v) => { par.beta = v; dibujar(); } });
    const sG = U.slider({ etiqueta: "γ estación", min: 0, max: 1, step: 0.001, valor: par.gamma, formato: fmtPar, alCambiar: (v) => { par.gamma = v; dibujar(); } });
    const bSM = U.el("button", { type: "button", class: "boton secundario" }, "Parámetros de statsmodels");
    bSM.addEventListener("click", () => {
      par = { alfa: SM.smoothing_level, beta: SM.smoothing_trend, gamma: SM.smoothing_seasonal };
      sA.input.value = par.alfa; sB.input.value = par.beta; sG.input.value = par.gamma;
      sA.querySelector("output").textContent = fmtPar(par.alfa);
      sB.querySelector("output").textContent = fmtPar(par.beta);
      sG.querySelector("output").textContent = fmtPar(par.gamma);
      dibujar();
    });
    controles.append(sA, sB, sG, bSM);
    dibujar();
    return {};
  },
};
