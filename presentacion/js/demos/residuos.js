/* Los residuos más grandes de la MSTL como juego, en subte o en Ecobici: se elige un día al azar entre
   los 40 más grandes, la clase propone qué pasó y después se muestra la explicación, con lo que hizo
   la otra serie ese mismo día. Al final, los 40 juntos, coloreados por feriado y lluvia. */
DEMOS.residuos = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    const fila = U.el("div", { class: "fila-panel" });
    const panel = U.el("div", { class: "panel-der" });
    el.insertBefore(fila, grafico);
    fila.append(grafico, panel);
    lectura.remove();
    let vistaPrevia = "";
    const DS = DATA.modelos.descomposicion, DE = DATA.residuosEcobici;
    const LLUVIA = 10;
    function armarSerie(D, inicio) {
      const d0 = U.dia(inicio);
      return D.residuo.map((r, i) => ({ fecha: U.sumarDias(d0, i), clave: U.sumarDias(d0, i).toISOString().slice(0, 10), valor: r, obs: D.observado[i], feriado: !!DE.feriado[i], lluvia: DE.lluvia[i] }));
    }
    const SERIES = {
      subte: { nombre: "Subte", otro: "Ecobici", unidad: "pasajeros", serie: armarSerie(DS, DS.inicio), casos: DATA.residuos.map((c) => ({ ...c, f: U.dia(c.fecha) })) },
      ecobici: { nombre: "Ecobici", otro: "El subte", unidad: "viajes", serie: armarSerie(DE, DE.inicio), casos: DE.casos.map((c) => ({ ...c, f: U.dia(c.fecha) })) },
    };
    for (const k in SERIES) {
      const S = SERIES[k];
      S.porClave = new Map(S.serie.map((d) => [d.clave, d]));
      S.top = [...S.serie].filter((d) => d.valor != null).sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor)).slice(0, 40)
        .map((d) => ({ ...d, cat: d.feriado ? "feriado" : d.lluvia >= LLUVIA ? "lluvia" : "otro" }));
    }
    const conDatos = SERIES.subte.serie.filter((d) => d.valor != null);
    const pctFer = (100 * d3.mean(conDatos, (d) => d.feriado)).toFixed(1).replace(".", ",");
    const pctLluvia = (100 * d3.mean(conDatos.filter((d) => !d.feriado), (d) => d.lluvia >= LLUVIA)).toFixed(0);
    const COLOR = { feriado: U.COLORES.B, lluvia: U.COLORES.lluvia, otro: U.COLORES.ink };
    const pct = (r, obs) => { const p = Math.round((100 * r) / (obs - r)); return p === 0 ? "0 %" : `${p > 0 ? "+" : "−"}${Math.abs(p)} %`; };
    const fmtR = (r) => `${r > 0 ? "+" : "−"}${Math.abs(r) < 1000 ? Math.round(Math.abs(r)) : U.fmtK(Math.abs(r))}`;

    let cual = "subte", revelado = false, todos = false, elegido = null;
    const estado = {};
    for (const k in SERIES) estado[k] = { orden: d3.shuffle(d3.range(SERIES[k].casos.length)), pos: 0 };

    const memoria = {};
    function dibujar() {
      actualizarAcciones();
      const S = SERIES[cual], E = estado[cual];
      const c = S.casos[E.orden[E.pos]];
      const marcas = [
        Plot.ruleY([0], { stroke: U.COLORES.rule }),
        Plot.lineY(S.serie, { x: "fecha", y: "valor", stroke: U.COLORES.ink3, strokeWidth: 1 }),
      ];
      if (todos) {
        marcas.push(Plot.dot(S.top, { x: "fecha", y: "valor", r: 7, fill: (d) => COLOR[d.cat], stroke: U.COLORES.surface, strokeWidth: 1.5, className: "puntos40" }));
        if (elegido) {
          marcas.push(Plot.dot([elegido], { x: "fecha", y: "valor", r: 11, fill: COLOR[elegido.cat], stroke: U.COLORES.ink, strokeWidth: 3, pointerEvents: "none" }));
          const der = elegido.fecha > U.dia("2025-10-01");
          marcas.push(Plot.text([elegido], { x: "fecha", y: "valor", text: (d) => `${U.DIAS[d.fecha.getUTCDay()]} ${U.fechaCorta(d.fecha)}`, dx: der ? -18 : 18, textAnchor: der ? "end" : "start", fill: U.COLORES.ink, stroke: U.COLORES.surface, strokeWidth: 5, fontSize: 18, fontWeight: 600 }));
        }
      } else {
        const der = c.f > U.dia("2025-10-01");
        marcas.push(
          Plot.dot(S.casos, { x: "f", y: "residuo", r: 5, stroke: U.COLORES.ink3, strokeWidth: 1.2 }),
          Plot.dot([c], { x: "f", y: "residuo", r: 11, fill: U.COLORES.B, stroke: U.COLORES.surface, strokeWidth: 2, className: "anim-caso" }),
          Plot.text([c], { x: "f", y: "residuo", text: (d) => `${U.DIAS[d.f.getUTCDay()]} ${U.fechaCorta(d.f)}`, dx: der ? -18 : 18, textAnchor: der ? "end" : "start", fill: U.COLORES.B, stroke: U.COLORES.surface, strokeWidth: 5, fontSize: 18, fontWeight: 600 }),
        );
      }
      U.reemplazar(grafico, Plot.plot(U.plotBase({
        height: 470, width: 1040, marginLeft: 80, marginTop: 30, marginBottom: 40,
        x: { label: null },
        y: { grid: true, tickFormat: U.tickM, label: `residuo (${S.unidad})` },
        marks: marcas,
      })));
      if (todos) {
        grafico.querySelectorAll("g.puntos40 circle").forEach((ci, i) => {
          ci.style.cursor = "pointer";
          ci.addEventListener("click", () => { elegido = S.top[i]; dibujar(); });
        });
      }
      if (!todos && memoria.cual !== cual) { delete memoria["anim-caso"]; memoria.cual = cual; }
      if (!todos) B4.animar(grafico, memoria, ["anim-caso"], 600); else delete memoria["anim-caso"];
      const vista = `${cual}|${todos}|${E.pos}|${revelado}`;
      const cambio = vista !== vistaPrevia, mismoDia = vistaPrevia.startsWith(`${cual}|false|${E.pos}|`);
      const vistaPreviaExistia = vistaPrevia !== "";
      vistaPrevia = vista;
      if (todos) {
        const n = (cat) => S.top.filter((d) => d.cat === cat).length;
        U.panelFundido(panel, `<div class="kicker" style="margin:0">${S.nombre}: los 40 residuos más grandes</div>` +
          `<div class="${cambio ? "aparece" : ""}"><b style="color:${U.COLORES.B}">${n("feriado")}</b> caen en un feriado o día no laborable, que son el ${pctFer} % de los días.</div>` +
          `<div class="${cambio ? "aparece" : ""}"><b style="color:${U.COLORES.lluvia}">${n("lluvia")}</b>, en un día con ${LLUVIA} mm de lluvia o más (el ${pctLluvia} % de los días restantes).</div>` +
          `<div class="${cambio ? "aparece" : ""}"><b>${n("otro")}</b>, en otros días.</div>` +
          detalle40(S) +
          `<div class="muted" style="font-size:0.9em">Estos días no se borran. Para pronosticar, se le dice al modelo qué días son feriado o llueven, como variables; si no, los trata como ruido y le contaminan el ciclo semanal y la tendencia.</div>`, false);
      } else {
        const obs = c.observado < 1000 && cual === "subte" ? "No viajó casi nadie" : `${cual === "subte" ? "Viajaron" : "Hubo"} ${U.fmtK(c.observado)}${cual === "ecobici" ? " viajes" : ""}`;
        let extra = "";
        if (c.comparar !== false) {
          const otra = SERIES[cual === "subte" ? "ecobici" : "subte"].porClave.get(c.fecha);
          if (otra && otra.valor != null) extra = `<div class="muted" style="margin-top:10px">${S.otro}, el mismo día: ${fmtR(otra.valor)} ${cual === "subte" ? "viajes" : "pasajeros"}, ${pct(otra.valor, otra.obs)} respecto de lo esperado.</div>`;
        }
        U.panelFundido(panel, `<div class="kicker" style="margin:0">${S.nombre}, día ${E.pos + 1} de ${S.casos.length}</div>` +
          `<div class="panel-fecha${cambio && !mismoDia ? " aparece" : ""}">${U.fechaLarga(c.f)}</div>` +
          `<div>${obs}. Residuo: <b>${fmtR(c.residuo)}</b>, ${pct(c.residuo, c.observado)} respecto de lo esperado.</div>` +
          (revelado ? `<div class="revelado${mismoDia ? " aparece" : ""}">${c.texto}${extra}</div>` : `<div class="pendiente">¿Qué pasó ese día?</div>`), cambio && !mismoDia && vistaPreviaExistia);
      }
    }

    function detalle40(S) {
      if (!elegido) return `<div class="revelado">Tocá un punto para ver qué pasó ese día.</div>`;
      const c = S.casos.find((x) => x.fecha === elegido.clave);
      return `<div class="revelado aparece"><b>${U.fechaLarga(elegido.fecha)}</b><br>Residuo: <b>${fmtR(elegido.valor)}</b>, ${pct(elegido.valor, elegido.obs)} respecto de lo esperado.<br>` +
        (c ? c.texto : "Para este día no tenemos una explicación revisada.") + `</div>`;
    }
    // Cambio con fundido: el gráfico y el panel se apagan, se redibujan y vuelven
    function fundir(fn) {
      grafico.style.transition = "opacity 0.18s"; grafico.style.opacity = 0;
      setTimeout(() => { fn(); dibujar(); grafico.style.opacity = 1; }, 180);
    }
    const bOtro = U.el("button", { type: "button", class: "boton" }, "Otro día al azar");
    const bVer = U.el("button", { type: "button", class: "boton" }, "Mostrar qué pasó");
    const acciones = U.el("div", { style: "display:flex; gap:10px;" });
    acciones.append(bOtro, bVer);
    const actualizarAcciones = () => {
      acciones.style.visibility = todos ? "hidden" : "visible";
      bVer.disabled = revelado; bVer.style.opacity = revelado ? 0.4 : 1;
    };
    const selector = U.botones([["subte", "Subte"], ["ecobici", "Ecobici"]], cual, (v) => fundir(() => { cual = v; revelado = false; elegido = null; }));
    const vistas = U.botones([["uno", "Un día por vez"], ["todos", "Los 40 juntos"]], "uno", (v) => fundir(() => { todos = v === "todos"; elegido = null; }));
    bOtro.addEventListener("click", () => {
      const E = estado[cual]; todos = false; revelado = false;
      E.pos = (E.pos + 1) % SERIES[cual].casos.length; if (E.pos === 0) E.orden = d3.shuffle(E.orden);
      dibujar();
    });
    bVer.addEventListener("click", () => { revelado = true; dibujar(); });
    controles.append(selector, vistas, acciones);
    dibujar();
    return {};
  },
};
