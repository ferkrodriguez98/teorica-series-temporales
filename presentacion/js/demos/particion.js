/* Partición temporal (60 días) y validación con rolling origin (animación). */
DEMOS.particion = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    el.classList.add("b4");
    const DESDE = "2024-08-05", N = 60, NT = 12;
    const d0 = U.dia(DESDE);
    const datos = B4.tramo(DESDE, U.iso(U.sumarDias(d0, N - 1))).map((v, i) => ({ i, fecha: U.sumarDias(d0, i), v }));
    const C = { train: U.COLORES.ink2, test: U.COLORES.modelo, fuera: "#dedcd5" };

    const W = 1440, m = { l: 104, r: 16 };
    const x = d3.scaleUtc().domain([U.sumarDias(d0, -0.6), U.sumarDias(d0, N - 0.4)]).range([m.l, W - m.r]);
    const paso = x(U.sumarDias(d0, 1)) - x(d0);

    /* ---------- Panel superior: la serie ---------- */
    const H1 = 300, m1 = { t: 34, b: 30 };
    const y = d3.scaleLinear().domain([0, 1e6]).range([H1 - m1.b, m1.t]);
    const svg1 = d3.select(grafico).append("svg").attr("width", W).attr("height", H1);
    const estilar = (g) => {
      g.selectAll(".domain").remove();
      g.selectAll(".tick line").attr("stroke", U.COLORES.grid);
      g.selectAll(".tick text").attr("fill", U.COLORES.ink2).attr("font-size", 17).attr("font-family", "IBM Plex Sans");
    };
    svg1.append("g").attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).ticks(4).tickFormat(U.tickM).tickSize(-(W - m.l - m.r)).tickPadding(8)).call(estilar);
    svg1.append("g").attr("transform", `translate(0,${H1 - m1.b})`)
      .call(d3.axisBottom(x).ticks(d3.utcWeek.every(1)).tickFormat((d) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}`).tickSize(0).tickPadding(10)).call(estilar);
    svg1.append("path").datum(datos).attr("fill", "none").attr("stroke", U.COLORES.ink3).attr("stroke-width", 1).attr("stroke-opacity", 0.6)
      .attr("d", d3.line().x((d) => x(d.fecha)).y((d) => y(d.v)));
    const corte = svg1.append("g").attr("opacity", 0);
    corte.append("line").attr("y1", m1.t - 22).attr("y2", H1 - m1.b).attr("stroke", U.COLORES.ink2).attr("stroke-dasharray", "4,4");
    const rotIzq = corte.append("text").attr("y", m1.t - 12).attr("text-anchor", "end").attr("font-size", 17).attr("fill", U.COLORES.ink2).attr("font-family", "IBM Plex Sans").text("train ←");
    const rotDer = corte.append("text").attr("y", m1.t - 12).attr("font-size", 17).attr("fill", U.COLORES.modelo).attr("font-family", "IBM Plex Sans").text("→ test");
    const puntos = svg1.append("g").selectAll("circle").data(datos).join("circle")
      .attr("cx", (d) => x(d.fecha)).attr("cy", (d) => y(d.v)).attr("r", 6)
      .attr("fill", C.train).attr("stroke", U.COLORES.surface).attr("stroke-width", 2);

    /* ---------- Panel inferior: rolling origin ---------- */
    const FOLDS = [30, 36, 42, 48, 54].map((t) => ({ train: t, test: 6 }));
    const cab = U.el("div", { style: "display:flex; align-items:center; gap:22px; margin: 14px 0 6px; font-size: 0.52em; color: var(--ink-2);" });
    const bPlay = U.el("button", { type: "button", class: "boton" }, "▶ Reproducir");
    cab.append(U.el("b", { style: "color: var(--ink); font-weight:600;" }, "Validación con rolling origin"), bPlay,
      B4.leyenda([["banda", C.train, "train"], ["banda", C.test, "test"], ["banda", C.fuera, "sin usar"]], "width:auto; margin-left:auto; font-size:1em;"));
    const g2 = U.el("div");
    grafico.append(cab, g2);
    const FH = 26, FG = 9, H2 = FOLDS.length * (FH + FG) + 4;
    const svg2 = d3.select(g2).append("svg").attr("width", W).attr("height", H2);
    const filas = svg2.selectAll("g").data(FOLDS).join("g").attr("transform", (_, k) => `translate(0,${k * (FH + FG)})`);
    filas.append("text").attr("x", m.l - 14).attr("y", FH / 2 + 5).attr("text-anchor", "end").attr("font-size", 17).attr("font-family", "IBM Plex Sans").attr("fill", U.COLORES.ink2).text((_, k) => `Partición ${k + 1}`);
    const celdas = filas.selectAll("rect").data((f, k) => datos.map((d) => ({ ...d, k, f }))).join("rect")
      .attr("x", (d) => x(d.fecha) - paso / 2 + 1.5).attr("width", paso - 3).attr("y", 0).attr("height", FH).attr("rx", 3)
      .attr("fill", C.fuera);
    const rolCelda = (d) => (d.i < d.f.train ? "train" : d.i < d.f.train + d.f.test ? "test" : "fuera");

    /* ---------- Estados ---------- */
    let modo = "temporal", sorteo = []; // la partición al azar ya no se muestra: la diapositiva arranca en la temporal
    const sortear = () => { sorteo = d3.shuffle(d3.range(N)).slice(0, NT).sort((a, b) => a - b); };
    sortear();
    const fmtD = (d) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;

    function pintarSerie(rol, { animar = true, orden = (d) => d.i } = {}) {
      const t = puntos.transition().duration(animar ? 450 : 0).delay((d) => (animar ? orden(d) * 22 : 0));
      t.attr("fill", (d) => C[rol(d)]).attr("r", (d) => (rol(d) === "test" ? 7 : 6));
    }
    function mostrarCorte(i) {
      if (i == null) { corte.transition().duration(300).attr("opacity", 0); return; }
      const xc = x(U.sumarDias(d0, i - 0.5));
      corte.transition().duration(450).attr("opacity", 1);
      corte.select("line").transition().duration(450).attr("x1", xc).attr("x2", xc);
      rotIzq.transition().duration(450).attr("x", xc - 8);
      rotDer.transition().duration(450).attr("x", xc + 8);
    }

    function aplicar(animar = true) {
      if (modo === "azar") {
        const s = new Set(sorteo);
        pintarSerie((d) => (s.has(d.i) ? "test" : "train"), { animar });
        mostrarCorte(null);
        const conPosterior = sorteo.filter((i) => d3.range(i + 1, N).some((j) => !s.has(j))).length;
        lectura.innerHTML = `Test: <b>${NT} días sorteados</b> entre los ${N}. ${conPosterior === NT ? `Para los ${NT}` : `Para ${conPosterior} de ellos`}, el set de train incluye días posteriores: el modelo se evalúa en fechas rodeadas por datos que ya vio.`;
      } else {
        pintarSerie((d) => (d.i >= N - NT ? "test" : "train"), { animar, orden: (d) => Math.max(0, d.i - (N - NT)) });
        mostrarCorte(N - NT);
        lectura.innerHTML = `Test: <b>los últimos ${NT} días</b> (${fmtD(datos[N - NT].fecha)} al ${fmtD(datos[N - 1].fecha)}). El train termina el ${fmtD(datos[N - NT - 1].fecha)}: el modelo solo ve fechas anteriores a las que se evalúan.`;
      }
    }

    /* Reproducción del rolling origin: cada partición se dibuja y la serie de arriba la acompaña */
    let corriendo = null;
    function reproducir() {
      if (corriendo) clearTimeout(corriendo);
      botones.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", "false"));
      celdas.interrupt().attr("fill", C.fuera);
      let k = 0;
      const unaFold = () => {
        const f = FOLDS[k];
        celdas.filter((d) => d.k === k).transition().duration(260).delay((d) => d.i * 9).attr("fill", (d) => C[rolCelda(d)]);
        pintarSerie((d) => rolCelda({ ...d, f }), { animar: true, orden: (d) => d.i * 0.4 });
        mostrarCorte(f.train);
        lectura.innerHTML = `Partición ${k + 1} de ${FOLDS.length}: train con los primeros <b>${f.train} días</b> (hasta el ${fmtD(datos[f.train - 1].fecha)}), test con los <b>${f.test} siguientes</b>.` +
          (k === FOLDS.length - 1 ? ` El error de validación es el promedio de los errores de las ${FOLDS.length} tests.` : "");
        k++;
        corriendo = k < FOLDS.length ? setTimeout(unaFold, 1500) : null;
      };
      unaFold();
    }

    const botones = U.botones([["azar", "Al azar"], ["temporal", "Temporal"]], modo, (v) => {
      if (corriendo) { clearTimeout(corriendo); corriendo = null; celdas.interrupt().attr("fill", (d) => C[rolCelda(d)]); }
      modo = v; bSortear.disabled = v !== "azar"; bSortear.style.opacity = v === "azar" ? 1 : 0.35; aplicar();
    });
    const bSortear = U.el("button", { type: "button", class: "boton secundario" }, "Nuevo sorteo");
    bSortear.addEventListener("click", () => { if (modo !== "azar") return; sortear(); aplicar(); });
    bPlay.addEventListener("click", reproducir);
    controles.remove();

    /* Estado inicial: todas las particiones dibujadas, sin animación */
    celdas.attr("fill", (d) => C[rolCelda(d)]);
    aplicar(false);
    let arranque = null;
    return {
      entrar() { arranque = setTimeout(reproducir, 800); },
      alternar() { clearTimeout(arranque); if (corriendo) { clearTimeout(corriendo); corriendo = null; } else reproducir(); },
      salir() { clearTimeout(arranque); if (corriendo) { clearTimeout(corriendo); corriendo = null; celdas.interrupt().attr("fill", (d) => C[rolCelda(d)]); } },
    };
  },
};
