/* Doble click en las celdas raras del mapa de calor: de cuántos pasajeros sale cada cociente. */
DEMOS.revisarCociente = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    lectura.remove();
    const noHabiles = new Set(DATA.feriados.map((f) => f.fecha));
    // Perfil promedio cada 15 minutos para un día de la semana (0 = lunes) y un año, sin feriados
    const perfil = (anio, dow) => {
      const acc = new Array(96).fill(0); let n = 0;
      for (const [fecha, slots] of Object.entries(DATA.subte15min)) {
        if (!fecha.startsWith(anio) || noHabiles.has(fecha) || (U.dia(fecha).getUTCDay() + 6) % 7 !== dow) continue;
        n++; slots.forEach((v, i) => (acc[i] += v));
      }
      return acc.map((v) => v / n);
    };
    const P = { 5: { 2019: perfil("2019", 5), 2025: perfil("2025", 5) }, 6: { 2019: perfil("2019", 6), 2025: perfil("2025", 6) } };
    const porHora = (dow, anio, h) => d3.sum(P[dow][anio].slice(h * 4, h * 4 + 4));
    const COL = { 2019: U.COLORES.ink3, 2025: U.COLORES.B };

    const CASOS = {
      dom23: { dow: 6, hora: 23, desde: 20, hasta: 24, nombre: "domingo, 23 h",
        texto: "Los domingos los molinetes casi dejan de registrar pases hacia las 22:30. En la hora de las 23 quedan unos pocos pases sueltos, y con tan poco en el denominador cualquier diferencia se vuelve un cociente enorme." },
      dom6: { dow: 6, hora: 6, desde: 5, hasta: 10, nombre: "domingo, 6 h",
        texto: "Los domingos los pases empiezan a las 7:45. A las 6 no hay servicio y los molinetes registran un puñado de pases: el cociente compara un número casi cero con otro." },
      sab5: { dow: 5, hora: 5, desde: 4, hasta: 8, nombre: "sábado, 5 h",
        texto: "Los sábados los pases empiezan a las 5:45, así que esa hora tiene un solo cuarto de hora con servicio. El cociente mezcla cuánta gente viaja con el minuto exacto en que se abre." },
    };
    let caso = "dom23";

    const fila = U.el("div", { class: "fila-panel" });
    const panel = U.el("div", { class: "panel-der" });
    grafico.replaceWith(fila);
    fila.append(grafico, panel);
    controles.append(
      U.botones(Object.entries(CASOS).map(([k, c]) => [k, c.nombre]), caso, (v) => { caso = v; dibujar(true); }),
      B4.leyenda([["linea", COL[2019], "2019"], ["linea", COL[2025], "2025"]], "width:auto;"),
    );

    function dibujar(fundir) {
      const c = CASOS[caso];
      const puntos = [];
      for (const anio of [2019, 2025]) for (let i = c.desde * 4; i < c.hasta * 4; i++) puntos.push({ anio, t: i / 4, v: P[c.dow][anio][i] * 4 });
      const a = porHora(c.dow, 2019, c.hora), b = porHora(c.dow, 2025, c.hora);
      const tope = d3.max(puntos, (p) => p.v) * 1.12;
      U.reemplazar(grafico, Plot.plot(U.plotBase({
        width: 1040, height: 520, marginLeft: 80, marginTop: 30,
        x: { domain: [c.desde, c.hasta], label: null, ticks: d3.range(c.desde, c.hasta + 1), tickFormat: (h) => `${h} h` },
        y: { grid: true, domain: [0, tope], label: "pasajeros por hora (ritmo de cada cuarto de hora)", tickFormat: U.tickM, labelAnchor: "top", labelArrow: "none" },
        marks: [
          Plot.rectY([c], { x1: c.hora, x2: c.hora + 1, y1: 0, y2: tope, fill: U.COLORES.H, fillOpacity: 0.16 }),
          Plot.text([c], { x: c.hora + 0.5, y: tope, dy: 14, text: () => "la celda", fill: U.COLORES.ink2, fontSize: 16 }),
          Plot.text([c], { x: c.hora + 0.5, y: tope * 0.3, text: () => `2019: ${U.fmt(Math.round(a))} por hora\n2025: ${U.fmt(Math.round(b))} por hora`, fill: U.COLORES.ink, fontSize: 17, lineHeight: 1.3 }),
          Plot.lineY(puntos, { x: "t", y: "v", z: "anio", stroke: (p) => COL[p.anio], strokeWidth: 2.4, curve: "step-after" }),
          Plot.tip(puntos, Plot.pointerX({ x: "t", y: "v", title: (p) => `${p.anio}, ${Math.floor(p.t)}:${String((p.t % 1) * 60).padStart(2, "0")} h\n${U.fmt(Math.round(p.v / 4))} pasajeros en 15 minutos` })),
        ],
      })));
      const html =
        `<div class="panel-fecha">${c.nombre[0].toUpperCase() + c.nombre.slice(1)}</div>` +
        `<div style="font-size:1.25em; line-height:1.5;">2019: <b>${U.fmt(Math.round(a))}</b> pasajeros por hora<br>2025: <b>${U.fmt(Math.round(b))}</b><br>` +
        `${U.fmt(Math.round(b))} / ${U.fmt(Math.max(1, Math.round(a)))} = <b>${U.fmt(Math.round((b / a) * 100))} %</b></div>` +
        `<div>${c.texto}</div>` +
        `<div>En el resto del mapa cada celda sale de miles de pasajeros por hora. Antes de interpretar un color, conviene mirar de cuántos sale el cociente.</div>`;
      U.panelFundido(panel, html, fundir);
    }
    dibujar(false);
    return {};
  },
};
