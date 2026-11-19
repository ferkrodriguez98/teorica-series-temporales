/* Mapa de calor: pasajeros promedio por hora y día de la semana (sin feriados ni no laborables), 2019, 2025 y la comparación. */
DEMOS.calor = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    lectura.remove();
    const noHabiles = new Set(DATA.feriados.map((f) => f.fecha));
    const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
    const HORAS = d3.range(5, 24);
    const CERRADO = 1000; // menos de mil pasajeros por hora en 2019: el subte estaba cerrado, abriendo o cerrando

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
    const total = (anio, d) => d3.sum(HORAS, (h) => P[anio].get(`${d}|${h}`));
    const pct = (x) => `${Math.round(x * 100)} %`;
    const razonDia = (dias) => d3.sum(dias, (d) => total(2025, d)) / d3.sum(dias, (d) => total(2019, d));
    let vista = "ratio";

    const fila = U.el("div", { class: "fila-panel" });
    const panel = U.el("div", { class: "panel-der" });
    grafico.replaceWith(fila);
    fila.append(grafico, panel);
    const texto = U.el("div", { style: "display:flex; flex-direction:column; gap:12px;" }), detalle = U.el("div", { class: "revelado" });
    panel.append(texto, detalle);

    function dibujar() {
      const celdas = [];
      for (let d = 0; d < 7; d++) for (const h of HORAS) {
        const k = `${d}|${h}`, a = P[2019].get(k), b = P[2025].get(k);
        const cerrado = vista === "ratio" && a < CERRADO;
        celdas.push({ d, dia: DIAS[d], hora: h, a, b, cerrado, valor: vista === "ratio" ? (cerrado ? null : b / a) : P[vista].get(k) });
      }
      const validas = celdas.filter((c) => !c.cerrado);
      const color = vista === "ratio"
        ? { type: "linear", domain: [0.45, 0.9], range: [U.COLORES.B, "#f6ece6"], clamp: true, legend: true, label: "pasajeros de 2025 como % de 2019", width: 420, ticks: [0.5, 0.6, 0.7, 0.8, 0.9], style: { fontSize: "16px" }, tickFormat: (d) => `${Math.round(d * 100)} %` }
        : { type: "linear", range: ["#f3f5fa", U.COLORES.C], domain: [0, d3.max([...P[2019].values()])], legend: true, label: "pasajeros por hora", width: 420, style: { fontSize: "16px" }, tickFormat: U.tickM };
      const plot = Plot.plot(U.plotBase({
        width: 1040, height: 520, marginLeft: 110, padding: 0.06,
        x: { label: null, tickFormat: (h) => `${h} h`, type: "band" },
        y: { label: null, domain: DIAS },
        color,
        marks: [
          Plot.cell(celdas.filter((c) => c.cerrado), { x: "hora", y: "dia", fill: (c) => c.b / c.a, stroke: U.COLORES.ink, strokeDasharray: "3 3", inset: 2, rx: 3, className: "cerradas" }),
          Plot.text(celdas.filter((c) => c.cerrado), { x: "hora", y: "dia", text: () => "?", fontSize: 20, fontWeight: 600, fill: U.COLORES.ink, pointerEvents: "none" }),
          Plot.cell(validas, { x: "hora", y: "dia", fill: "valor", inset: 1, rx: 3, className: "celdas" }),
        ],
      }));
      U.reemplazar(grafico, plot);
      // Detalle al pasar el mouse: se muestra en el panel (los tooltips de Plot se desfasan con el escalado de Reveal)
      const rectsV = [...plot.querySelectorAll("g.celdas rect")], rectsC = [...plot.querySelectorAll("g.cerradas rect")];
      const rects = [...rectsV, ...rectsC], datos = [...validas, ...celdas.filter((c) => c.cerrado)];
      rects.forEach((r, i) => {
        const c = datos[i];
        r.style.cursor = "default";
        r.addEventListener("mouseenter", () => {
          rects.forEach((x) => (x.style.opacity = 0.55)); r.style.opacity = 1;
          detalle.innerHTML = `<b>${c.dia}, ${c.hora} h</b><br>2019: ${U.fmt(Math.round(c.a))} pasajeros por hora<br>2025: ${U.fmt(Math.round(c.b))}` +
            (c.cerrado ? `<br>El cociente daría ${pct(c.b / c.a)}, pero sale de muy pocos pasajeros: es para revisar. Lo miramos en la que sigue.` : `<br>2025 es el ${pct(c.b / c.a)} de 2019.`);
        });
      });
      plot.addEventListener("mouseleave", () => { rects.forEach((x) => (x.style.opacity = 1)); detalle.innerHTML = "Pasá el mouse por una celda para ver los números."; });
      detalle.innerHTML = "Pasá el mouse por una celda para ver los números.";

      if (vista === "ratio") {
        texto.innerHTML = `<div class="panel-fecha">Se recuperó menos el día de trabajo</div>` +
          `<div>Cada celda compara 2025 con 2019 en la misma hora y el mismo día de la semana. Cuanto más rojo, más lejos de 2019.</div>` +
          `<div>Lo que bajó es la semana de trabajo entera: de lunes a viernes viajó el <b>${pct(razonDia([0, 1, 2, 3, 4]))}</b> de la gente de 2019, y el fin de semana, el <b>${pct(razonDia([5, 6]))}</b>. El viernes queda apenas abajo del resto (${pct(razonDia([4]))} contra ${pct(razonDia([0, 1, 2, 3]))} de lunes a jueves).</div>` +
          `<div>Las celdas con <b>?</b> son horas en que el subte estaba cerrado, abriendo o cerrando: el cociente sale de muy pocos pasajeros y no conviene leerlo. Las miramos de cerca en la que sigue.</div>`;
      } else {
        const rel = (d) => pct(total(vista, d) / d3.mean([0, 1, 2, 3], (x) => total(vista, x)));
        texto.innerHTML = `<div class="panel-fecha">Promedio de ${vista}</div>` +
          `<div>Pasajeros por hora en los días no feriados. De lunes a viernes hay dos picos, a las 8 y a las 18 h.</div>` +
          `<div>Un sábado tiene el <b>${rel(5)}</b> de los pasajeros de un día de lunes a jueves; un domingo, el <b>${rel(6)}</b>.</div>`;
      }
    }
    controles.append(U.botones([["2019", "2019"], ["2025", "2025"], ["ratio", "2025 contra 2019"]], vista, (v) => { vista = v; dibujar(); }));
    dibujar();
    return {};
  },
};
