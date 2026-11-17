/* Mapa de calor: pasajeros promedio por hora y día de la semana (sin feriados ni no laborables). */
DEMOS.calor = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    const noHabiles = new Set(DATA.feriados.map((f) => f.fecha));
    const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
    const HORAS = d3.range(5, 24);

    const promedio = (anio) => {
      const acc = new Map();
      for (const [fecha, slots] of Object.entries(DATA.subte15min)) {
        if (!fecha.startsWith(anio) || noHabiles.has(fecha)) continue;
        const dow = (U.dia(fecha).getUTCDay() + 6) % 7;
        for (const h of HORAS) {
          const v = slots[h * 4] + slots[h * 4 + 1] + slots[h * 4 + 2] + slots[h * 4 + 3];
          const k = `${dow}|${h}`;
          const a = acc.get(k) || { s: 0, n: 0 };
          a.s += v; a.n += 1; acc.set(k, a);
        }
      }
      return new Map([...acc].map(([k, a]) => [k, a.s / a.n]));
    };
    const P = { 2019: promedio("2019"), 2025: promedio("2025") };
    let vista = "2025";

    function dibujar() {
      const celdas = [];
      for (let d = 0; d < 7; d++) for (const h of HORAS) {
        const k = `${d}|${h}`;
        const v = vista === "ratio" ? P[2025].get(k) / P[2019].get(k) : P[vista].get(k);
        celdas.push({ dia: DIAS[d], hora: h, valor: v });
      }
      const color = vista === "ratio"
        ? { type: "diverging", pivot: 1, scheme: "RdBu", domain: [0.3, 1.7], legend: true, label: "2025 / 2019", tickFormat: (d) => `${Math.round(d * 100)} %` }
        : { type: "linear", range: ["#f3f5fa", U.COLORES.C], domain: [0, d3.max([...P[2019].values()])], legend: true, label: "pasajeros por hora", tickFormat: U.tickM };
      const plot = Plot.plot(U.plotBase({
        height: 470, marginLeft: 110, padding: 0.06,
        x: { label: "hora", tickFormat: (h) => `${h} h`, type: "band" },
        y: { label: null, domain: DIAS },
        color,
        marks: [
          Plot.cell(celdas, { x: "hora", y: "dia", fill: "valor", inset: 1, rx: 3 }),
          Plot.tip(celdas, Plot.pointer({ x: "hora", y: "dia", title: (d) => `${d.dia}, ${d.hora} h\n${vista === "ratio" ? `${Math.round(d.valor * 100)} % de 2019` : U.fmt(Math.round(d.valor)) + " pasajeros"}` })),
        ],
      }));
      U.reemplazar(grafico, plot);
      if (vista === "ratio") {
        const media = (dias, horas) => d3.mean(dias.flatMap((d) => horas.map((h) => P[2025].get(`${d}|${h}`) / P[2019].get(`${d}|${h}`))));
        const pct = (x) => `${Math.round(x * 100)} %`;
        lectura.innerHTML = `Pico de la mañana (7 a 9 h) de lunes a jueves: ${pct(media([0, 1, 2, 3], [7, 8]))} del nivel de 2019. Viernes, mismo horario: ${pct(media([4], [7, 8]))}. Domingos: ${pct(media([6], HORAS))}.`;
      } else {
        const tot = (d) => d3.sum(HORAS, (h) => P[vista].get(`${d}|${h}`));
        lectura.innerHTML = `Promedio de los días no feriados de ${vista}. Un sábado tiene el ${Math.round((100 * tot(5)) / d3.mean([0, 1, 2, 3], tot))} % de los pasajeros de un día de lunes a jueves; un domingo, el ${Math.round((100 * tot(6)) / d3.mean([0, 1, 2, 3], tot))} %.`;
      }
    }
    controles.append(U.botones([["2019", "2019"], ["2025", "2025"], ["ratio", "2025 contra 2019"]], vista, (v) => { vista = v; dibujar(); }));
    dibujar();
    return {};
  },
};
