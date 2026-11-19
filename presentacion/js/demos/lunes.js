/* El lunes que viene: el lunes siguiente a la clase (23/11/2026) es feriado.
   Lunes de 2025 y 2026, hábiles y feriados, y dos pronósticos para ese día:
   el seasonal naive (el último lunes con datos) y la mediana de los lunes feriados. */
DEMOS.lunesQueViene = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    const objetivo = U.dia("2026-11-23");
    const desde = U.dia("2025-01-01");
    const fer = new Map(DATA.feriados.map((f) => [f.fecha, f]));
    const serie = U.serie(DATA.subteDiario.inicio, DATA.subteDiario.total).filter((d) => d.valor != null);
    const ultimo = serie[serie.length - 1].fecha;
    const lunes = serie
      .filter((d) => d.fecha >= desde && d.fecha.getUTCDay() === 1)
      .map((d) => {
        const f = fer.get(U.iso(d.fecha));
        return { ...d, feriado: !!f && f.caracter === "feriado", nombre: f ? f.nombre : null };
      });
    const habiles = lunes.filter((d) => !fer.has(U.iso(d.fecha)));
    const feriados = lunes.filter((d) => d.feriado);
    const ultimoLunes = lunes[lunes.length - 1];
    const ingenuo = ultimoLunes.valor;
    const conCalendario = d3.median(feriados, (d) => d.valor);
    const soberania = serie.filter((d) => ["2023-11-20", "2024-11-18", "2025-11-24"].includes(U.iso(d.fecha)));
    const fObj = fer.get(U.iso(objetivo));
    let vista = "serie";

    // Al pasar a "Con el calendario", el pronóstico baja desde el seasonal naive hasta la mediana de los feriados,
    // los lunes feriados se destacan y los hábiles se apagan
    function dibujar() {
      graficar({ p: vista === "calendario" ? conCalendario : ingenuo, cal: vista === "calendario" ? 1 : 0 });
      textos();
    }
    function graficar(st) {
      const Y1 = 1e6, cal = st.cal;
      const pron = { fecha: objetivo, valor: st.p };
      const tramo = [ultimoLunes, pron];
      U.transicion(grafico, Plot.plot(U.plotBase({
        height: 470, marginLeft: 70, marginTop: 30, marginRight: 40,
        x: { label: null, domain: [desde, U.dia("2026-12-20")], ticks: d3.utcMonth.every(2), tickFormat: (d) => `${["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][d.getUTCMonth()]} ${d.getUTCFullYear()}` },
        y: { grid: true, tickFormat: U.tickM, label: "pasajeros por día", domain: [0, Y1] },
        opacity: { type: "identity" },
        marks: [
          Plot.rectX([{ a: U.sumarDias(ultimo, 1), b: U.sumarDias(objetivo, -4) }], { x1: "a", x2: "b", y1: 0, y2: Y1, fill: U.COLORES.ink3, fillOpacity: 0.07 }),
          Plot.text([{ x: U.sumarDias(ultimo, 6), y: Y1 * 0.96 }], { x: "x", y: "y", text: () => `sin datos desde el ${U.fechaCorta(U.sumarDias(ultimo, 1))}`, textAnchor: "start", fill: U.COLORES.ink2, fontSize: 16 }),
          // Línea que une todos los lunes, y su continuación punteada hasta el pronóstico
          Plot.lineY(lunes, { x: "fecha", y: "valor", stroke: U.COLORES.ink3, strokeWidth: 1, strokeOpacity: 0.55 - 0.3 * cal }),
          Plot.lineY(tramo, { x: "fecha", y: "valor", stroke: cal > 0.5 ? U.COLORES.B : U.COLORES.ink, strokeWidth: 1.6, strokeDasharray: "4 4" }),
          // Mediana de los lunes feriados, que aparece con el calendario
          Plot.ruleY([conCalendario], { x1: feriados[0].fecha, x2: objetivo, stroke: U.COLORES.B, strokeWidth: 1.4, strokeDasharray: "2 4", strokeOpacity: cal }),
          Plot.dot(habiles, { x: "fecha", y: "valor", r: 4, fill: U.COLORES.ink3, fillOpacity: 1 - 0.6 * cal }),
          Plot.dot(feriados, { x: "fecha", y: "valor", r: 5.5 + 2.5 * cal, fill: U.COLORES.B, fillOpacity: 0.55 + 0.4 * cal }),
          // El seasonal naive queda como referencia tenue
          Plot.dot([{ fecha: objetivo, valor: ingenuo }], { x: "fecha", y: "valor", r: 10, stroke: U.COLORES.ink, strokeWidth: 2, strokeOpacity: 0.35 * cal, fill: "none" }),
          Plot.text([{ fecha: objetivo, valor: ingenuo }], { x: "fecha", y: "valor", text: () => `${U.fmtK(ingenuo)}`, dy: -24, fill: U.COLORES.ink, fillOpacity: 0.4 * cal, fontSize: 17, fontWeight: 600 }),
          Plot.dot([pron], { x: "fecha", y: "valor", r: 10, fill: cal > 0.5 ? U.COLORES.B : "none", stroke: cal > 0.5 ? U.COLORES.surface : U.COLORES.ink, strokeWidth: 2.4 }),
          Plot.text([pron], { x: "fecha", y: "valor", text: (d) => `${U.fmtK(cal > 0.5 ? conCalendario : ingenuo)}`, dy: -24, fill: cal > 0.5 ? U.COLORES.B : U.COLORES.ink, fillOpacity: Math.abs(cal - 0.5) * 2, fontSize: 17, fontWeight: 600 }),
          Plot.text([{ fecha: objetivo }], { x: "fecha", y: 0, text: () => "lunes 23/11", dy: -14, fill: U.COLORES.ink, fontSize: 16 }),
          Plot.tip(lunes, Plot.pointer({
            x: "fecha", y: "valor",
            title: (d) => `lunes ${U.fechaCorta(d.fecha)}${d.nombre ? `\n${d.nombre}` : ""}\n${U.fmtK(d.valor)} pasajeros`,
          })),
        ],
      })), 1300);
    }
    function textos() {
      const sob = soberania.map((d) => `${U.fechaCorta(d.fecha)}: ${U.fmtK(d.valor)}`).join("; ");
      lectura.innerHTML = vista === "serie"
        ? `Los datos llegan hasta el ${U.fechaCorta(ultimo)}. El seasonal naive repite el último lunes con datos (${U.fechaCorta(ultimoLunes.fecha)}): <b>${U.fmtK(ingenuo)}</b> pasajeros para el lunes 23/11/2026.`
        : `El 23/11/2026 es feriado: ${fObj ? fObj.nombre : "Día de la Soberanía Nacional"} (Ley 27.399). La mediana de los ${feriados.length} lunes feriados desde enero de 2025 es <b>${U.fmtK(conCalendario)}</b>, un ${Math.round((conCalendario / ingenuo) * 100)} % del seasonal naive. El mismo feriado en años anteriores: ${sob}.`;
    }

    controles.append(U.botones([["serie", "Solo la serie"], ["calendario", "Con el calendario"]], vista, (v) => { vista = v; dibujar(); }));
    controles.append(B4.leyenda([["punto", U.COLORES.ink3, "lunes hábiles"], ["punto", U.COLORES.B, "lunes feriados"]]));
    dibujar();
    return {};
  },
};
