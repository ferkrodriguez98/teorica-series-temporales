/* Los residuos más grandes de la MSTL como juego: se elige un día al azar entre los 40 más grandes,
   la clase propone qué pasó y después se muestra la explicación. Al final, los 40 juntos. */
DEMOS.residuos = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    const D = DATA.modelos.descomposicion;
    const d0 = U.dia(D.inicio);
    const serie = D.residuo.map((r, i) => ({ fecha: U.sumarDias(d0, i), valor: r, feriado: D.feriado[i] })).filter((d) => d.valor != null);
    const casos = DATA.residuos.map((c) => ({ ...c, f: U.dia(c.fecha) }));
    const top = [...serie].sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor)).slice(0, 40);
    const enFeriado = top.filter((d) => d.feriado).length;
    const pctFer = (100 * d3.mean(serie, (d) => d.feriado)).toFixed(1).replace(".", ",");
    let orden = d3.shuffle(d3.range(casos.length)), pos = 0, revelado = false, todos = false;

    function dibujar() {
      const c = casos[orden[pos]];
      const marcas = [
        Plot.ruleY([0], { stroke: U.COLORES.rule }),
        Plot.lineY(serie, { x: "fecha", y: "valor", stroke: U.COLORES.ink3, strokeWidth: 1 }),
      ];
      if (todos) {
        marcas.push(Plot.dot(top, { x: "fecha", y: "valor", r: 6, fill: (d) => (d.feriado ? U.COLORES.B : U.COLORES.ink), stroke: U.COLORES.surface, strokeWidth: 1.5 }));
      } else {
        marcas.push(
          Plot.dot(casos, { x: "f", y: "residuo", r: 5, stroke: U.COLORES.ink3, strokeWidth: 1.2 }),
          Plot.dot([c], { x: "f", y: "residuo", r: 11, fill: U.COLORES.B, stroke: U.COLORES.surface, strokeWidth: 2 }),
          Plot.text([c], { x: "f", y: "residuo", text: (d) => `${U.DIAS[d.f.getUTCDay()]} ${U.fechaCorta(d.f)}`, dx: c.f > U.dia("2025-10-01") ? -18 : 18, textAnchor: c.f > U.dia("2025-10-01") ? "end" : "start", fill: U.COLORES.B, stroke: U.COLORES.surface, strokeWidth: 5, fontSize: 18, fontWeight: 600 }),
        );
      }
      U.reemplazar(grafico, Plot.plot(U.plotBase({
        height: 440, marginLeft: 80, marginTop: 30, marginBottom: 40,
        x: { label: null },
        y: { grid: true, tickFormat: U.tickM, label: "residuo (pasajeros)" },
        marks: marcas,
      })));
      if (todos) {
        lectura.innerHTML = `Los 40 residuos más grandes. En rojo, los que caen en un feriado o día no laborable: <b>${enFeriado}</b> de 40, aunque esos días son el ${pctFer} % del período.`;
      } else {
        const base = `Día ${pos + 1} de ${casos.length}: <b>${U.fechaLarga(c.f)}</b>. ${c.observado < 1000 ? "No viajó casi nadie" : `Viajaron ${U.fmtK(c.observado)}`}; el residuo es de ${c.residuo > 0 ? "+" : "−"}${U.fmtK(Math.abs(c.residuo))}.`;
        lectura.innerHTML = revelado ? `${base}<div class="revelado">${c.texto}</div>` : `${base} ¿Qué pasó ese día?`;
      }
    }

    const bOtro = U.el("button", { type: "button", class: "boton" }, "Otro día al azar");
    const bVer = U.el("button", { type: "button", class: "boton" }, "Qué pasó");
    const bTodos = U.el("button", { type: "button", class: "boton" }, "Ver los 40");
    bOtro.addEventListener("click", () => { todos = false; revelado = false; pos = (pos + 1) % casos.length; if (pos === 0) orden = d3.shuffle(orden); dibujar(); });
    bVer.addEventListener("click", () => { todos = false; revelado = true; dibujar(); });
    bTodos.addEventListener("click", () => { todos = true; dibujar(); });
    controles.append(bOtro, bVer, bTodos);
    dibujar();
    return {};
  },
};
