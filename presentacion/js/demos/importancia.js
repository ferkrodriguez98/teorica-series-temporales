/* Gradient boosting: la serie convertida en tabla (una semana de junio de 2025) e importancia por permutación. */
(function () {
  const ETIQUETAS = {
    dia_semana: "día de la semana", feriado: "feriado", rezago_364: "pasajeros hace 364 días",
    media_28_hace_28: "media de 28 días, hace 28", mes: "mes", no_laborable: "día no laborable", puente: "puente",
    dia_mes: "día del mes", temperatura: "temperatura", lluvia_mm: "lluvia (mm)",
    rezago_35: "pasajeros hace 35 días", rezago_28: "pasajeros hace 28 días", rezago_42: "pasajeros hace 42 días",
  };
  const DIAS_PANDAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]; // dayofweek: 0 = lunes

  /* ---------- La serie como tabla ---------- */
  DEMOS.serieTabla = {
    montar(el) {
      const { controles, grafico, lectura } = U.armar(el);
      el.classList.add("b4");
      controles.remove();
      const P = DATA.modelos.pronosticos;
      const T = P.tabla_ejemplo.map((f) => ({ ...f, d: U.dia(f.fecha) }));
      const S = DATA.subteDiario;
      const serie = U.serie(S.inicio, S.total);
      let elegida = 0;

      const COLS = [
        { k: "rezago_28", t: "hace 28 días", f: B4.num, rez: 28 },
        { k: "rezago_35", t: "hace 35 días", f: B4.num, rez: 35 },
        { k: "rezago_364", t: "hace 364 días", f: B4.num, rez: 364 },
        { k: "media_28_hace_28", t: "media de 28 días, hace 28", f: B4.num },
        { k: "dia_semana", t: "día de la semana", f: (v) => `${v} (${DIAS_PANDAS[v]})` },
        { k: "feriado", t: "feriado", f: (v) => String(v) },
        { k: "lluvia_mm", t: "lluvia (mm)", f: (v) => U.fmt(v, 1) },
      ];
      const tabla = U.el("table", { class: "b4-tabla-serie" });
      const thead = U.el("thead");
      thead.innerHTML = `<tr class="grupo"><th></th><th colspan="${COLS.length}">variables: lo que se sabe 28 días antes, y el calendario</th><th>objetivo</th></tr>` +
        `<tr><th>fecha</th>${COLS.map((c) => `<th>${c.t}<code>${c.k}</code></th>`).join("")}<th class="objetivo">pasajeros<code>pax</code></th></tr>`;
      const tbody = U.el("tbody");
      tabla.append(thead, tbody);
      T.forEach((f, i) => {
        const tr = U.el("tr");
        tr.append(U.el("td", {}, `${U.DIAS[f.d.getUTCDay()]} ${U.fechaCorta(f.d)}`));
        COLS.forEach((c) => {
          const td = U.el("td", { class: c.rez ? "rezago" : "" }, c.f(f[c.k]));
          if (c.rez) td.title = `pasajeros del ${U.fechaLarga(U.sumarDias(f.d, -c.rez))}`;
          tr.append(td);
        });
        tr.append(U.el("td", { class: "objetivo" }, B4.num(f.pax)));
        tr.addEventListener("click", () => { elegida = i; dibujar(); });
        tbody.append(tr);
      });
      const mini = U.el("div", { style: "margin-top: 18px;" });
      grafico.append(tabla, mini);

      function dibujar() {
        tbody.querySelectorAll("tr").forEach((tr, i) => tr.classList.toggle("elegida", i === elegida));
        const f = T[elegida];
        const desde = U.sumarDias(f.d, -62), hasta = U.sumarDias(T[T.length - 1].d, 2);
        const tramo = serie.filter((p) => p.fecha >= desde && p.fecha <= hasta);
        const rez = [28, 35].map((k) => ({ k, fecha: U.sumarDias(f.d, -k), v: f["rezago_" + k] }));
        const ventana = { a: U.sumarDias(f.d, -55.5), b: U.sumarDias(f.d, -27.5) };
        const plot = Plot.plot(U.plotBase({
          width: 1440, height: 210, marginLeft: 70, marginTop: 26, marginBottom: 30,
          x: { label: null, domain: [desde, hasta], tickFormat: (d) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}`, ticks: d3.utcWeek.every(1) },
          y: { grid: true, tickFormat: U.tickM, label: null, domain: [0, 1.15e6], ticks: 3 },
          marks: [
            Plot.rectX([ventana], { x1: "a", x2: "b", y1: 0, y2: 1.15e6, fill: U.COLORES.ink3, fillOpacity: 0.1 }),
            Plot.text([ventana], { x: (d) => new Date((+d.a + +d.b) / 2), y: 1.15e6, text: () => `media de 28 días: ${B4.num(f.media_28_hace_28)}`, dy: -8, fontSize: 16, fill: U.COLORES.ink2 }),
            Plot.ruleY([f.media_28_hace_28], { x1: ventana.a, x2: ventana.b, stroke: U.COLORES.ink2, strokeDasharray: "4,3" }),
            Plot.lineY(tramo, { x: "fecha", y: "valor", stroke: U.COLORES.ink3, strokeWidth: 1.2 }),
            Plot.dot(tramo, { x: "fecha", y: "valor", r: 1.8, fill: U.COLORES.ink3 }),
            Plot.arrow(rez, { x1: "fecha", y1: "v", x2: () => f.d, y2: () => f.pax, bend: 14, stroke: U.COLORES.ink2, strokeWidth: 1.2, insetStart: 9, insetEnd: 10 }),
            Plot.dot(rez, { x: "fecha", y: "v", r: 6, fill: U.COLORES.real, stroke: U.COLORES.surface, strokeWidth: 2 }),
            Plot.text(rez, { x: "fecha", y: "v", text: (d) => `hace ${d.k} días`, dy: 18, fontSize: 16, fill: U.COLORES.ink, fontWeight: 600 }),
            Plot.dot([f], { x: "d", y: "pax", r: 7, fill: U.COLORES.modelo, stroke: U.COLORES.surface, strokeWidth: 2 }),
            Plot.text([f], { x: "d", y: "pax", text: () => "objetivo", dy: -16, fontSize: 16, fill: U.COLORES.modelo, fontWeight: 600 }),
          ],
        }));
        U.reemplazar(mini, plot);
        lectura.innerHTML = `Fila elegida: <b>${U.fechaLarga(f.d)}</b> (clic en otra fila para cambiarla). Los rezagos son de 28 días o más: con los datos hasta el 31 de mayo se arman las filas de los 28 días de junio sin usar pronósticos propios como dato.`;
      }
      dibujar();
      return {};
    },
  };

  /* ---------- Importancia por permutación ---------- */
  DEMOS.importancia = {
    montar(el) {
      const { controles, grafico, lectura } = U.armar(el);
      el.classList.add("b4");
      controles.remove();
      const P = DATA.modelos.pronosticos;
      const base = B4.metricas(P.real, P.modelos["Gradient boosting"].pred).MAE;
      const NOTAS = {
        mes: "constante en la prueba: los 28 días son de junio",
        no_laborable: "vale 0 en los 28 días de prueba",
        puente: "vale 0 en los 28 días de prueba",
      };
      const datos = P.importancia.map((d) => ({ ...d, etiqueta: ETIQUETAS[d.variable] || d.variable }));

      const grid = U.el("div", { class: "b4-grid" });
      const izq = U.el("div");
      const panel = U.el("div", { class: "b4-panel" });
      grafico.replaceWith(grid);
      grid.append(izq, panel);
      izq.append(grafico);
      panel.innerHTML = `<div class="b4-bloque"><h4>Cómo se calcula</h4>
        <ol style="margin:0 0 0 1.1em; padding:0; line-height:1.45;">
          <li>MAE del modelo en los 28 días de prueba: <b style="color:var(--ink)">${B4.num(base)}</b>.</li>
          <li>Se desordena una columna de la tabla de prueba y se vuelve a calcular el MAE.</li>
          <li>La diferencia, promediada en 30 desórdenes, es la importancia de esa variable.</li>
        </ol></div>`;

      const fmtS = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + U.fmt(Math.abs(v));
      const plot = Plot.plot(U.plotBase({
        width: 1020, height: 560, marginLeft: 210, marginRight: 90, marginTop: 10, marginBottom: 40,
        x: { grid: true, label: "aumento del MAE al desordenar (pasajeros)", labelAnchor: "center", labelArrow: "none", tickFormat: (d) => (d < 0 ? "−" : d > 0 ? "+" : "") + U.tickM(Math.abs(d)), domain: [-2e4, 1.6e5] },
        y: { domain: datos.map((d) => d.etiqueta), label: null, tickSize: 0, padding: 0.28 },
        marks: [
          Plot.barX(datos, { y: "etiqueta", x: "aumento_MAE", fill: (d) => (d.aumento_MAE > 0 ? U.COLORES.ink2 : U.COLORES.ink3), fillOpacity: (d) => (d.aumento_MAE > 0 ? 1 : 0.5), rx: 2 }),
          Plot.ruleX([0], { stroke: U.COLORES.ink }),
          Plot.text(datos, { y: "etiqueta", x: (d) => Math.max(0, d.aumento_MAE), text: (d) => fmtS(d.aumento_MAE), dx: 8, textAnchor: "start", fontSize: 17, fill: U.COLORES.ink }),
          Plot.tip(datos, Plot.pointerY({ y: "etiqueta", x: "aumento_MAE", title: (d) => `${d.etiqueta} (${d.variable})\naumento del MAE: ${fmtS(d.aumento_MAE)}` + (NOTAS[d.variable] ? `\n${NOTAS[d.variable]}` : "") })),
        ],
      }));
      U.reemplazar(grafico, plot);

      const top = datos.slice(0, 2);
      const resto = datos.slice(2);
      lectura.innerHTML = `Desordenar el <b>${top[0].etiqueta}</b> sube el MAE en ${B4.num(top[0].aumento_MAE)} pasajeros (de ${B4.num(base)} a ${B4.num(base + top[0].aumento_MAE)}); el <b>${top[1].etiqueta}</b>, en ${B4.num(top[1].aumento_MAE)}. ` +
        `En las otras ${resto.length} variables el cambio va de ${fmtS(d3.min(resto, (d) => d.aumento_MAE))} a ${fmtS(d3.max(resto, (d) => d.aumento_MAE))}; un valor negativo indica que el error bajó al desordenarla.`;
      return {};
    },
  };
})();
