/* Estacionariedad: cuatro series simuladas chicas (con semilla), una estacionaria y tres que no. */
DEMOS.estacionariedad = {
  montar(el) {
    el.classList.add("demo");
    const N = 240, rnd = B3.rng(7);
    const e = Array.from({ length: N }, () => B3.normal(rnd));
    let acum = 0;
    const casos = [
      { titulo: "Estacionaria: media y variabilidad fijas", v: e, color: U.COLORES.B },
      { titulo: "No estacionaria: la media sube (tendencia)", v: e.map((z, t) => z + 0.03 * t), color: U.COLORES.ink2 },
      { titulo: "No estacionaria: la variabilidad crece", v: e.map((z, t) => z * (0.25 + (2.2 * t) / N)), color: U.COLORES.ink2 },
      { titulo: "No estacionaria: caminata aleatoria", v: e.map((z) => (acum += z)), color: U.COLORES.ink2 },
    ];
    casos.forEach((c) => {
      const p = B3.panel(el, c.titulo, 640);
      p.el.classList.add("b3-mini");
      const [lo, hi] = d3.extent(c.v), pad = (hi - lo) * 0.08;
      p.cuerpo.append(Plot.plot({
        width: 640, height: 82, margin: 4,
        style: { background: "transparent", overflow: "visible" },
        x: { axis: null }, y: { axis: null, domain: [lo - pad, hi + pad] },
        marks: [Plot.lineY(c.v, { stroke: c.color, strokeWidth: 1.4, strokeLinejoin: "round" })],
      }));
    });
    return {};
  },
};
