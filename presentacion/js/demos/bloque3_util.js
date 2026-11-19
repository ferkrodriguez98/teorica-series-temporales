/* Utilidades del bloque 3 (la memoria de una serie): generadores con semilla, correlaciones,
   ACF y piezas de gráficos en d3. Script clásico: deja todo en window.B3. */
(function () {
  const B3 = (window.B3 = window.B3 || {});

  /* ---------- Números al azar ---------- */
  /* Generador uniforme con semilla (mulberry32) */
  B3.rng = (semilla) => {
    let a = semilla >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* Normal estándar por Box-Muller */
  B3.normal = (rnd = Math.random) => {
    let u = 0;
    while (u === 0) u = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
  };

  /* Random walk de n puntos con pasos normales */
  B3.caminata = (n, { media = 0, desvio = 1, inicio = 0, rnd = Math.random } = {}) => {
    const x = new Array(n);
    x[0] = inicio;
    for (let i = 1; i < n; i++) x[i] = x[i - 1] + media + desvio * B3.normal(rnd);
    return x;
  };

  /* ---------- Estadística ---------- */
  B3.media = (a) => {
    let s = 0;
    for (const v of a) s += v;
    return s / a.length;
  };
  B3.desvio = (a) => {
    const m = B3.media(a);
    let s = 0;
    for (const v of a) s += (v - m) ** 2;
    return Math.sqrt(s / (a.length - 1));
  };

  B3.pearson = (xs, ys) => {
    const n = xs.length, mx = B3.media(xs), my = B3.media(ys);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      const a = xs[i] - mx, b = ys[i] - my;
      sxy += a * b; sxx += a * a; syy += b * b;
    }
    return sxy / Math.sqrt(sxx * syy);
  };

  /* Pares (x_t, x_{t-k}) sin nulos */
  B3.pares = (x, k) => {
    const out = [];
    for (let t = k; t < x.length; t++) if (x[t] != null && x[t - k] != null) out.push([t, x[t], x[t - k]]);
    return out;
  };

  /* Correlación de Pearson entre x_t y x_{t-k}, usando solo los pares sin nulos */
  B3.corrRezago = (x, k) => {
    const p = B3.pares(x, k);
    return B3.pearson(p.map((d) => d[1]), p.map((d) => d[2]));
  };

  /* ACF con el estimador clásico (media y varianza de toda la serie); los pares con nulos no suman */
  B3.acf = (x, K) => {
    const v = x.filter((z) => z != null);
    const m = B3.media(v);
    let c0 = 0;
    for (const z of v) c0 += (z - m) ** 2;
    const r = [];
    for (let k = 1; k <= K; k++) {
      let s = 0;
      for (let t = k; t < x.length; t++) if (x[t] != null && x[t - k] != null) s += (x[t] - m) * (x[t - k] - m);
      r.push({ k, r: s / c0 });
    }
    return r;
  };

  /* Diferencia de orden l (con nulos donde falta alguno de los dos valores) */
  B3.dif = (x, l = 1) => x.map((v, i) => (i >= l && v != null && x[i - l] != null ? v - x[i - l] : null));

  /* Cuantil de un arreglo (ordena una copia) */
  B3.cuantil = (a, q) => d3.quantileSorted(a.slice().sort((p, s) => p - s), q);

  /* ---------- Formatos ---------- */
  B3.fmtR = (r) => (Math.abs(r) < 0.005 ? "0,00" : U.fmt(r, 2));
  B3.fmtPct = (p, dec = 0) => U.fmt(100 * p, dec) + " %";
  B3.fmtSigno = (v, f = U.fmtK) => (v > 0 ? "+" : v < 0 ? "−" : "") + f(Math.abs(v));

  /* ---------- Piezas de gráficos ---------- */
  /* Panel con título chico arriba */
  B3.panel = (padre, titulo, ancho) => {
    const el = U.el("div", { class: "b3-panel", style: ancho ? `width:${ancho}px` : "" });
    const tit = U.el("div", { class: "b3-panel-titulo" });
    tit.innerHTML = titulo || "";
    const cuerpo = U.el("div", { class: "b3-panel-cuerpo" });
    el.append(tit, cuerpo);
    padre.append(el);
    return { el, titulo: tit, cuerpo };
  };

  /* Estilo de ejes d3 parecido al de Observable Plot */
  B3.estilarEjes = (sel) => {
    sel.selectAll(".domain").attr("stroke", U.COLORES.rule);
    sel.selectAll(".tick line").attr("stroke", U.COLORES.rule);
    sel.selectAll(".tick text").attr("fill", U.COLORES.ink2).attr("font-size", 18).attr("font-family", "IBM Plex Sans, sans-serif");
  };

  /* Tooltip HTML dentro de un contenedor posicionado */
  B3.tip = (cont) => {
    cont.style.position = "relative";
    const t = U.el("div", { class: "tip" });
    cont.append(t);
    return {
      mostrar(x, y, html) { t.innerHTML = html; t.style.left = x + "px"; t.style.top = y + "px"; t.classList.add("on"); },
      ocultar() { t.classList.remove("on"); },
    };
  };

  /* Gráfico de barras de la ACF (d3), con un lag resaltado y una curva de referencia opcional.
     Devuelve { actualizar(datos, { resaltar, referencia }) } con datos = [{k, r}]. */
  B3.graficoACF = (cont, { ancho, alto, K, dominio = [-0.5, 1], ticks, alClic, maxClic = K, etiquetaX = "Lag" }) => {
    const m = { t: 12, r: 12, b: 46, l: 56 };
    const svg = d3.select(cont).append("svg").attr("width", ancho).attr("height", alto).style("display", "block");
    const x = d3.scaleLinear([0.5, K + 0.5], [m.l, ancho - m.r]);
    const y = d3.scaleLinear(dominio, [alto - m.b, m.t]);
    const paso = (ancho - m.l - m.r) / K;
    const anchoBarra = Math.max(3, Math.min(18, paso * 0.62));

    const gy = svg.append("g").attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).ticks(6).tickSize(-(ancho - m.l - m.r)).tickPadding(8).tickFormat((d) => U.fmt(d, 1)));
    gy.select(".domain").remove();
    B3.estilarEjes(gy);
    gy.selectAll(".tick line").attr("stroke", U.COLORES.grid);
    const gx = svg.append("g").attr("transform", `translate(0,${alto - m.b})`)
      .call(d3.axisBottom(x).tickValues(ticks || d3.range(5, K + 1, 5)).tickFormat((d) => d).tickSizeOuter(0).tickSize(5));
    B3.estilarEjes(gx);
    svg.append("text").attr("x", ancho - m.r).attr("y", alto - 6).attr("text-anchor", "end")
      .attr("fill", U.COLORES.ink2).attr("font-size", 18).attr("font-family", "IBM Plex Sans, sans-serif").text(etiquetaX + " →");
    svg.append("line").attr("x1", m.l).attr("x2", ancho - m.r).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", U.COLORES.ink3).attr("stroke-width", 1);

    const gBarras = svg.append("g");
    const ref = svg.append("path").attr("fill", "none").attr("stroke", U.COLORES.ink).attr("stroke-width", 1.6).attr("stroke-dasharray", "4 4");
    const gHit = svg.append("g");
    const tip = B3.tip(cont);
    let datos = [], resaltado = null;

    const yc = (r) => y(Math.max(dominio[0], Math.min(dominio[1], r)));
    const color = (d) => (d.k === resaltado ? U.COLORES.B : U.COLORES.ink3);

    function actualizar(nuevos, { resaltar = null, referencia = null, animar = true } = {}) {
      datos = nuevos;
      resaltado = resaltar;
      const t = svg.transition().duration(animar ? 350 : 0).ease(d3.easeCubicOut);
      gBarras.selectAll("rect").data(datos, (d) => d.k).join(
        (enter) => enter.append("rect").attr("x", (d) => x(d.k) - anchoBarra / 2).attr("width", anchoBarra).attr("rx", 1.5)
          .attr("y", y(0)).attr("height", 0).attr("fill", color),
      ).transition(t)
        .attr("y", (d) => Math.min(y(0), yc(d.r))).attr("height", (d) => Math.abs(yc(d.r) - y(0))).attr("fill", color);
      if (referencia) ref.datum(referencia).transition(t).attr("opacity", 1).attr("d", d3.line().x((d) => x(d.k)).y((d) => yc(d.r)));
      else ref.transition(t).attr("opacity", 0);
    }

    gHit.selectAll("rect").data(d3.range(1, K + 1)).join("rect")
      .attr("x", (k) => x(k) - paso / 2).attr("width", paso).attr("y", m.t).attr("height", alto - m.t - m.b)
      .attr("fill", "transparent").style("cursor", (k) => (alClic && k <= maxClic ? "pointer" : "default"))
      .on("mouseenter", (ev, k) => {
        const d = datos.find((z) => z.k === k);
        if (!d) return;
        tip.mostrar(x(k), Math.min(yc(d.r), y(0)), `Lag ${k}: <b>${B3.fmtR(d.r)}</b>`);
      })
      .on("mouseleave", () => tip.ocultar())
      .on("click", (ev, k) => { if (alClic && k <= maxClic) alClic(k); });

    return { actualizar, svg, x, y };
  };
})();
