/* Bloque 6: lo que los números no dicen. Línea de tiempo de hechos, cobro de Ecobici y el error de fechas. */
(function () {
  // Hechos verificados (ver datos/eventos/hechos_contexto.md y eventos_verificados.csv)
  const HECHOS = [
    ["2013-07-26", "red", "Línea B: Echeverría y Juan Manuel de Rosas"],
    ["2013-09-27", "red", "Línea A: San Pedrito y Flores"],
    ["2015-12-18", "red", "Línea H: Córdoba y Las Heras"],
    ["2016-07-12", "red", "Línea H: Santa Fe"],
    ["2018-05-17", "red", "Línea H: Facultad de Derecho"],
    ["2019-06-03", "red", "Línea E: Correo Central, Catalinas y Retiro"],
    ["2020-03-20", "norma", "Aislamiento obligatorio (DNU 297/2020): transporte solo para exceptuados"],
    ["2021-08-24", "norma", "Fin de la restricción del transporte a esenciales (Res. 269/2021)"],
    ["2024-01-08", "red", "Línea D cerrada por obras de señalización hasta el 6/3"],
    ["2024-05-17", "precio", "El boleto pasa de $125 a $574; el 1/6, a $650"],
    ["2024-12-02", "medicion", "Se habilita el pago sin contacto con tarjetas y celulares"],
    ["2026-03-02", "red", "Tribunales (D) cerrada por renovación hasta el 5/10"],
  ];
  const TIPOS = { red: ["La red", U.COLORES.C], norma: ["Normas", U.COLORES.E], precio: ["Precio", U.COLORES.B], medicion: ["Lo que se mide", U.COLORES.H] };

  DEMOS.lineaTiempo = {
    montar(el) {
      const { controles, grafico, lectura } = U.armar(el);
      lectura.remove();
      const S = DATA.subteDiario;
      const diario = U.serie(S.inicio, S.total);
      const serie = U.serie(S.inicio, U.mediaMovil(S.total, 28, true));
      const hechos = HECHOS.map(([f, t, txt], i) => ({ fecha: U.dia(f), tipo: TIPOS[t][0], color: TIPOS[t][1], txt, n: i + 1 }));
      const i0 = U.dia(S.inicio);
      const idx = (f) => Math.round((f - i0) / 864e5);
      const prom = (a, b) => d3.mean(S.total.slice(Math.max(0, a), Math.max(0, b)).filter((v) => v != null));
      // Cambio de los 28 días siguientes contra los 28 anteriores, descontando lo que pasó en las mismas fechas un año antes
      hechos.forEach((h) => {
        const k = idx(h.fecha);
        h.antes = prom(k - 28, k); h.despues = prom(k, k + 28);
        const a1 = prom(k - 365 - 28, k - 365), d1 = k - 365 - 28 >= 0 ? prom(k - 365, k - 365 + 28) : null;
        h.bruto = h.despues / h.antes - 1;
        h.ajustado = d1 ? (h.despues / h.antes) / (d1 / a1) - 1 : null;
      });
      const fila = U.el("div", { class: "fila-panel" });
      const panel = U.el("div", { class: "panel-der" });
      grafico.replaceWith(fila);
      fila.append(grafico, panel);
      let elegido = 0;
      const opciones = [["0", "Toda la serie"], ...hechos.map((h) => [String(h.n), String(h.n)])];
      const botones = U.botones(opciones, "0", (v) => { elegido = +v; dibujar(); });
      controles.append(botones);
      const pctS = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + U.fmt(Math.abs(v * 100), 0) + " %";

      function dibujar() {
        const h = hechos[elegido - 1];
        const dom = h ? [U.sumarDias(h.fecha, -270), U.sumarDias(h.fecha, 270)] : [diario[0].fecha, diario[diario.length - 1].fecha];
        const enRango = (d) => d.fecha >= dom[0] && d.fecha <= dom[1];
        const vis = h ? [h] : hechos;
        U.reemplazar(grafico, Plot.plot(U.plotBase({
          width: 1040, height: 540, marginTop: 40,
          y: { grid: true, tickFormat: U.tickM, label: null, domain: [0, 1.4e6] },
          x: { label: null, domain: dom },
          marks: [
            h ? Plot.rectX([[-28, 0], [0, 28]], { x1: (d) => U.sumarDias(h.fecha, d[0]), x2: (d) => U.sumarDias(h.fecha, d[1]), y1: 0, y2: 1.4e6, fill: (d, i) => (i ? h.color : U.COLORES.ink3), fillOpacity: 0.1 }) : null,
            h ? Plot.lineY(diario.filter(enRango), { x: "fecha", y: "valor", stroke: U.COLORES.ink3, strokeWidth: 0.8, strokeOpacity: 0.6 }) : null,
            Plot.lineY(serie.filter(enRango), { x: "fecha", y: "valor", stroke: U.COLORES.ink, strokeWidth: 1.8 }),
            Plot.ruleX(vis, { x: "fecha", stroke: "color", strokeWidth: 1.5, strokeDasharray: "3 3" }),
            Plot.dot(vis, { x: "fecha", y: 1.33e6, fill: "color", r: 13, stroke: U.COLORES.surface, strokeWidth: 2 }),
            Plot.text(vis, { x: "fecha", y: 1.33e6, text: "n", fill: "white", fontWeight: 700, fontSize: 16 }),
          ].filter(Boolean),
        })));
        grafico.firstElementChild?.classList.add("aparece");
        if (!h) {
          panel.innerHTML = `<div class="panel-fecha">Doce hechos</div>` +
            `<div>Cada línea vertical es un hecho con fecha verificada: <b style="color:${TIPOS.red[1]}">cambios en la red</b>, <b style="color:${TIPOS.norma[1]}">normas</b>, <b style="color:${TIPOS.precio[1]}">precio</b> y <b style="color:${TIPOS.medicion[1]}">cambios en lo que se mide</b>.</div>` +
            `<div>La línea negra es la media móvil de 28 días del total diario. Con los números de arriba se ve cada hecho de cerca.</div>` +
            `<div>Cualquiera de estos cambios mueve la serie sin que cambie la demanda de la misma manera. Quien mira la serie sin esta lista se los atribuye a la demanda.</div>`;
          return;
        }
        panel.innerHTML = `<div class="panel-fecha aparece">${U.fechaLarga(h.fecha)}</div>` +
          `<div class="aparece"><b style="color:${h.color}">${h.tipo}</b>. ${h.txt}.</div>` +
          `<div class="aparece">Promedio diario de los 28 días anteriores: <b>${B4.mil(h.antes)}</b>; de los 28 siguientes: <b>${B4.mil(h.despues)}</b> (${pctS(h.bruto)}).</div>` +
          (h.ajustado != null ? `<div class="aparece">Esas mismas fechas un año antes cambiaron por la época del año. Descontando eso, el cambio es de <b>${pctS(h.ajustado)}</b>.</div>` : `<div class="aparece">No hay datos del año anterior para descontar el efecto de la época del año.</div>`) +
          `<div class="revelado aparece" style="color:var(--ink-3)">Gris: la serie diaria. Sombreado: las cuatro semanas antes y después.</div>`;
      }
      dibujar();
      return {};
    },
  };

  DEMOS.ecobiciCobro = {
    montar(el) {
      const { grafico, lectura } = U.armar(el);
      const E = DATA.ecobiciSeries, d0 = U.dia(E.inicio);
      // Por semana (lunes a domingo): promedio de sábado y domingo dividido el promedio de lunes a viernes
      const nh = new Set(DATA.feriados.map((f) => f.fecha));
      const semanas = new Map();
      E.viajes.forEach((v, i) => {
        if (v == null) return;
        const f = U.sumarDias(d0, i);
        if (f < U.dia("2019-03-04") || nh.has(U.iso(f))) return;
        const dow = (f.getUTCDay() + 6) % 7;
        const lunes = +U.sumarDias(f, -dow);
        const s = semanas.get(lunes) || { hab: [], fds: [] };
        (dow < 5 ? s.hab : s.fds).push(v);
        semanas.set(lunes, s);
      });
      const filas = [...semanas].filter(([, s]) => s.hab.length >= 3 && s.fds.length === 2)
        .map(([l, s]) => ({ fecha: new Date(l), r: d3.mean(s.fds) / d3.mean(s.hab) }));
      const corte = U.dia("2021-03-13");
      const antes = d3.median(filas.filter((d) => d.fecha < corte && d.fecha >= U.dia("2020-06-01")), (d) => d.r);
      const despues = d3.median(filas.filter((d) => d.fecha >= corte), (d) => d.r);
      U.reemplazar(grafico, Plot.plot(U.plotBase({
        height: 550, marginTop: 44,
        y: { grid: true, ticks: 8, domain: [0, Math.ceil(d3.max(filas, (d) => d.r) * 10) / 10], tickFormat: (d) => `${Math.round(d * 100)} %`, label: "fin de semana respecto de los días hábiles" },
        x: { label: null },
        marks: [
          Plot.ruleY([1], { stroke: U.COLORES.rule }),
          Plot.ruleX([corte], { stroke: U.COLORES.B, strokeWidth: 2 }),
          Plot.text([corte], { x: (d) => d, y: 1.32, text: () => "13/3/2021: empieza el cobro en fines de semana y feriados", textAnchor: "start", dx: 8, fill: U.COLORES.B, fontSize: 18 }),
          Plot.dot(filas, { x: "fecha", y: "r", r: 3, fill: U.COLORES.ecobici }),
          Plot.lineY(filas, Plot.windowY({ k: 8, anchor: "middle" }, { x: "fecha", y: "r", stroke: U.COLORES.ink, strokeWidth: 1.8 })),
          Plot.tip(filas, Plot.pointerX({ x: "fecha", y: "r", title: (d) => `semana del ${U.fechaCorta(d.fecha)}\nfin de semana: ${Math.round(d.r * 100)} % de un día hábil` })),
        ],
      })));
      lectura.innerHTML = `Cada punto es una semana: viajes promedio de sábado y domingo dividido el promedio de lunes a viernes. Mediana de junio de 2020 al 12/3/2021: <b>${Math.round(antes * 100)} %</b>; desde el 13/3/2021: <b>${Math.round(despues * 100)} %</b>. Los residentes siguieron viajando gratis de lunes a viernes.`;
      return {};
    },
  };

  DEMOS.errorFechas = {
    montar(el) {
      const { controles, grafico, lectura } = U.armar(el);
      const A = DATA.errorFechas;
      let vista = "antes";
      function dibujar() {
        const dias = vista === "antes" ? A.antes : A.despues;
        const filas = dias.flatMap((d) => d.perfil.map((v, s) => ({ fecha: d.etiqueta, hora: s / 4, valor: v }))).filter((p) => p.hora >= 5);
        U.reemplazar(grafico, Plot.plot(U.plotBase({
          height: 520,
          x: { domain: [5, 24], ticks: d3.range(5, 25, 2), tickFormat: (h) => `${h} h`, label: null },
          y: { grid: true, tickFormat: U.tickM, label: null, domain: [0, 52000] },
          color: { domain: dias.map((d) => d.etiqueta), range: [U.COLORES.B, U.COLORES.ink3, U.COLORES.C, U.COLORES.ink2], legend: true },
          marks: [
            Plot.lineY(filas, { x: "hora", y: "valor", stroke: "fecha", strokeWidth: 2, curve: "step-after" }),
            Plot.tip(filas, Plot.pointerX({ x: "hora", y: "valor", stroke: "fecha", title: (p) => `${p.fecha}\n${U.fmt(p.valor)} pasajeros en 15 min` })),
          ],
        })));
        const t = (k) => U.fmtK(d3.sum(dias[k].perfil));
        lectura.innerHTML = vista === "antes"
          ? `Con el primer procesamiento, el domingo 8 de junio de 2025 sumaba ${t(0)} pasajeros y tenía forma de día hábil; el miércoles 6 de agosto, ${t(2)}. El archivo de agosto venía con las fechas en formato mes/día: "8/6/2025" es el 6 de agosto, no el 8 de junio.`
          : `Leyendo cada fecha con el mes del archivo, el 8 de junio queda con ${t(0)} pasajeros, como cualquier domingo, y el 6 de agosto con ${t(2)}, como cualquier miércoles.`;
      }
      controles.append(U.botones([["antes", "Primer procesamiento"], ["despues", "Corregido"]], vista, (v) => { vista = v; dibujar(); }));
      dibujar();
      return {};
    },
  };
})();
