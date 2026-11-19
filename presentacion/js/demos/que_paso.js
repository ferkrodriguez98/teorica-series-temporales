/* ¿Qué pasó este día? Perfil cada 15 minutos de un día raro contra el mismo día de la semana en semanas normales. */
DEMOS.quePaso = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    const casos = DATA.quePaso;
    let i = 0, etapa = 0; // 0: solo el día de la semana, 1: la fecha, 2: qué pasó

    // Gráfico a la izquierda y panel fijo a la derecha: revelar no mueve la diapositiva
    const fila = U.el("div", { class: "fila-panel" });
    const panel = U.el("div", { class: "panel-der" });
    el.insertBefore(fila, grafico);
    fila.append(grafico, panel);
    lectura.remove();
    let etapaPrevia = -1, casoPrevio = -1;
    const sel = U.botones(casos.map((c, k) => [k, String(k + 1)]), 0, (v) => { i = v; etapa = 0; dibujar(); });
    const bFecha = U.el("button", { class: "boton secundario", type: "button" }, "Mostrar la fecha");
    const bQue = U.el("button", { class: "boton", type: "button" }, "Qué pasó");
    bFecha.addEventListener("click", () => { etapa = Math.max(etapa, 1); dibujar(); });
    bQue.addEventListener("click", () => { etapa = 2; dibujar(); });
    controles.append(sel, bFecha, bQue);

    function dibujar() {
      const c = casos[i];
      const d = U.dia(c.fecha);
      const pts = (arr) => arr.map((v, s) => ({ hora: s / 4, valor: v })).filter((p) => p.hora >= 5);
      const dia = pts(c.perfil), ref = pts(c.referencia);
      const plot = Plot.plot(U.plotBase({
        height: 540, width: 1040,
        x: { domain: [5, 24], ticks: d3.range(5, 25, 2), tickFormat: (h) => `${h} h`, label: null },
        y: { grid: true, tickFormat: U.tickM, label: null, domain: [0, Math.max(d3.max(c.perfil), d3.max(c.referencia)) * 1.08] },
        marks: [
          Plot.areaY(ref, { x: "hora", y: "valor", fill: U.COLORES.ink3, fillOpacity: 0.16, curve: "step-after" }),
          Plot.lineY(ref, { x: "hora", y: "valor", stroke: U.COLORES.ink3, strokeWidth: 1.4, curve: "step-after" }),
          Plot.lineY(dia, { x: "hora", y: "valor", stroke: U.COLORES.B, strokeWidth: 2.2, curve: "step-after" }),
          Plot.text([{ hora: 5.2, valor: d3.max(c.referencia) }], { x: "hora", y: "valor", text: () => `${c.dia} normal`, fill: U.COLORES.ink3, textAnchor: "start", dy: -10, fontSize: 18 }),
          Plot.tip(dia, Plot.pointerX({ x: "hora", y: "valor", title: (p) => `${String(Math.floor(p.hora)).padStart(2, "0")}:${String((p.hora % 1) * 60).padStart(2, "0")}\neste día: ${U.fmt(p.valor)}\nnormal: ${U.fmt(c.referencia[p.hora * 4])}` })),
        ],
      }));
      U.reemplazar(grafico, plot);
      const tot = d3.sum(c.perfil), totRef = d3.sum(c.referencia);
      const nuevo = i !== casoPrevio;
      const anim = (k) => (!nuevo && etapa >= k && etapaPrevia < k ? " aparece" : "");
      const fecha = etapa >= 1 ? `<div class="panel-fecha${anim(1)}">${U.fechaLarga(d)}</div>` : `<div class="panel-fecha">Un ${c.dia}</div>`;
      panel.innerHTML = `<div class="kicker" style="margin:0">Caso ${i + 1} de ${casos.length}</div>${fecha}` +
        `<div>Ese día: <b>${U.fmt(tot)}</b> pasajeros, el ${Math.round((100 * tot) / totRef)} % de un ${c.dia} normal.</div>` +
        (etapa === 2 ? `<div class="revelado${anim(2)}">${c.descripcion} <span class="muted">Fuente: <a href="${c.fuente}" target="_blank">${new URL(c.fuente).hostname.replace("www.", "")}</a></span></div>` : `<div class="pendiente">¿Qué pasó ese día?</div>`);
      etapaPrevia = etapa; casoPrevio = i;
      bFecha.disabled = etapa >= 1;
    }
    dibujar();
    return {};
  },
};
