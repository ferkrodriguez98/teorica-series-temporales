/* AR(1): x_t = φ x_{t-1} + ε_t con 400 shocks fijos (semilla), así al mover φ cambia solo φ.
   A la derecha, la ACF muestral y, si |φ| < 1, la teórica φ^k. */
DEMOS.ar1 = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    const N = 400, K = 40, SEMILLA = 11;
    const rnd = B3.rng(SEMILLA);
    const eps = Array.from({ length: N }, () => B3.normal(rnd));
    const generar = (phi) => {
      const x = new Array(N);
      x[0] = eps[0];
      for (let t = 1; t < N; t++) x[t] = phi * x[t - 1] + eps[t];
      return x;
    };
    // Escala vertical fija para todo el rango de φ: así se ve cuánto se aleja la serie del cero
    const grillaPhi = d3.range(-90, 101).map((v) => v / 100);
    const ext = d3.extent(grillaPhi.flatMap((p) => d3.extent(generar(p))));
    const dominioY = [Math.floor(ext[0] / 5) * 5, Math.ceil(ext[1] / 5) * 5];
    let phi = 0;

    const fila = U.el("div", { class: "b3-fila" });
    grafico.append(fila);
    const pS = B3.panel(fila, "", 900);
    const pA = B3.panel(fila, "ACF de la serie simulada, lags 1 a 40", 500);
    const H = 530;
    const g = B3.graficoACF(pA.cuerpo, { ancho: 500, alto: H, K, dominio: [-1, 1], ticks: [1, 10, 20, 30, 40] });

    function dibujar() {
      const x = generar(phi);
      const datos = x.map((v, t) => ({ t, v }));
      pS.titulo.innerHTML = phi === 0 ? "White noise (φ = 0), 400 períodos" : phi === 1 ? "Random walk (φ = 1), 400 períodos" : `AR(1) con φ = ${U.fmt(phi, 2)}, 400 períodos`;
      U.reemplazar(pS.cuerpo, Plot.plot({
        width: 900, height: H, marginLeft: 50, marginRight: 14, marginTop: 12, marginBottom: 46,
        style: { fontFamily: "IBM Plex Sans, sans-serif", fontSize: "18px", color: U.COLORES.ink2, background: "transparent", overflow: "visible" },
        x: { label: "t →", labelAnchor: "right", domain: [0, N - 1], ticks: 8 },
        y: { label: null, domain: dominioY, grid: true, ticks: 6 },
        marks: [
          Plot.ruleY([0], { stroke: U.COLORES.ink3 }),
          Plot.lineY(datos, { x: "t", y: "v", stroke: U.COLORES.B, strokeWidth: 1.6, strokeLinejoin: "round" }),
        ],
      }));
      const acf = B3.acf(x, K);
      const teorica = Math.abs(phi) < 1 ? d3.range(1, K + 1).map((k) => ({ k, r: phi ** k })) : null;
      g.actualizar(acf, { referencia: teorica, animar: false });
      leer(acf);
    }

    function leer(acf) {
      const r1 = B3.fmtR(acf[0].r), f = U.fmt(phi, 2);
      const ref = " La línea punteada es φ<sup>k</sup>, la autocorrelación teórica del proceso.";
      let t;
      if (phi === 0) t = `Con φ = 0 cada valor es un shock nuevo, sin relación con el anterior: white noise. La ACF muestral queda cerca de cero en todos los lags (${r1} en el 1).`;
      else if (phi === 1) t = `Con φ = 1 los shocks se suman sin descontarse: random walk. La serie no vuelve a ningún nivel y la ACF muestral baja muy despacio (${r1} en el 1, ${B3.fmtR(acf[K - 1].r)} en el ${K}).`;
      else if (phi < 0) t = `Con φ = ${f} cada valor tiende a tener el signo contrario del anterior: la serie zigzaguea y la ACF alterna signos (${r1} en el 1).${ref}`;
      else {
        const vida = Math.log(0.5) / Math.log(phi);
        const media = vida < 0.95 ? "en menos de un período" : vida < 1.05 ? "en un período" : `en unos ${U.fmt(vida, vida < 10 ? 1 : 0)} períodos`;
        t = `Con φ = ${f}, un shock (una promoción, un paro, un día de lluvia) pierde la mitad de su efecto ${media}. ${phi >= 0.9 ? "La serie se aleja del cero y tarda en volver: es persistente." : "La serie vuelve rápido al cero."} ACF en el lag 1: ${r1}.${ref}`;
      }
      lectura.innerHTML = t;
    }

    const deslizador = U.slider({
      etiqueta: "φ", min: -0.9, max: 1, step: 0.01, valor: phi, formato: (v) => U.fmt(v, 2),
      alCambiar: (v) => { phi = Math.round(v * 100) / 100; dibujar(); },
    });
    const formula = U.el("span", { class: "b3-formula" });
    katex.render("x_t = \\phi\\, x_{t-1} + \\varepsilon_t", formula, { throwOnError: false });
    const atajos = U.el("span", { class: "b3-atajos" });
    [0, 0.5, 0.9, 0.99, 1].forEach((v) => {
      const b = U.el("button", { type: "button", class: "boton secundario" }, U.fmt(v, v === 0.99 ? 2 : v % 1 ? 1 : 0));
      b.addEventListener("click", () => deslizador.set(v));
      atajos.append(b);
    });
    controles.append(formula, deslizador, atajos);
    dibujar();
    return {};
  },
};
