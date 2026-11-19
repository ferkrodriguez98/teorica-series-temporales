/* Utilidades del bloque 4 (pronosticar): tramos de la serie, métricas, Holt-Winters aditivo
   y piezas comunes de los gráficos. Script clásico: deja todo en window.B4. */
(function () {
  const B4 = (window.B4 = window.B4 || {});

  /* ---------- Serie diaria total ---------- */
  B4.indice = (fecha) => Math.round((U.dia(fecha) - U.dia(DATA.subteDiario.inicio)) / 864e5);

  /* Valores (con nulos) entre dos fechas ISO, inclusive */
  B4.tramo = (desde, hasta) => DATA.subteDiario.total.slice(B4.indice(desde), B4.indice(hasta) + 1);

  /* Interpolación lineal de los nulos (como pandas interpolate("time") con frecuencia diaria) */
  B4.interpolar = (v) => {
    const out = v.slice();
    let i = 0;
    while (i < out.length) {
      if (out[i] != null) { i++; continue; }
      let j = i;
      while (j < out.length && out[j] == null) j++;
      const a = i > 0 ? out[i - 1] : out[j], b = j < out.length ? out[j] : out[i - 1];
      for (let k = i; k < j; k++) out[k] = a + ((b - a) * (k - i + 1)) / (j - i + 1);
      i = j;
    }
    return out;
  };

  /* ---------- Métricas ---------- */
  B4.metricas = (real, pred) => {
    let sa = 0, s2 = 0, sp = 0, n = 0;
    for (let i = 0; i < real.length; i++) {
      if (real[i] == null || pred[i] == null) continue;
      const e = real[i] - pred[i];
      sa += Math.abs(e); s2 += e * e; sp += Math.abs(e) / Math.abs(real[i]); n++;
    }
    return { MAE: sa / n, RMSE: Math.sqrt(s2 / n), MAPE: (100 * sp) / n };
  };

  /* ---------- Holt-Winters aditivo (misma recursión que statsmodels) ----------
     nivel:     l_t = α (y_t − s_{t−m}) + (1 − α)(l_{t−1} + b_{t−1})
     tendencia: b_t = β (l_t − l_{t−1}) + (1 − β) b_{t−1}
     estación:  s_t = γ (y_t − l_{t−1} − b_{t−1}) + (1 − γ) s_{t−m}
     pronóstico: ŷ_{T+h} = l_T + h b_T + s_{T+h−m} */

  /* Estado inicial: nivel = promedio de las primeras 4 semanas, tendencia 0,
     efecto de cada día = promedio de su desvío respecto de la media de su semana. */
  B4.hwInicial = (y, m = 7, semanas = 4) => {
    const k = Math.min(semanas, Math.floor(y.length / m));
    const s = new Array(m).fill(0);
    let total = 0;
    for (let w = 0; w < k; w++) {
      const sem = y.slice(w * m, (w + 1) * m);
      const media = sem.reduce((a, b) => a + b, 0) / m;
      total += media;
      sem.forEach((v, j) => (s[j] += (v - media) / k));
    }
    return { l: total / k, b: 0, s };
  };

  B4.hw = (y, { alfa, beta, gamma, m = 7, inicial }) => {
    const ini = inicial || B4.hwInicial(y, m);
    const n = y.length;
    const S = new Float64Array(n + m);
    for (let i = 0; i < m; i++) S[i] = ini.s[i];
    const ajuste = new Float64Array(n);
    let l = ini.l, b = ini.b, sse = 0;
    for (let t = 0; t < n; t++) {
      const sp = S[t];
      ajuste[t] = l + b + sp;
      const e = y[t] - ajuste[t];
      sse += e * e;
      const ln = alfa * (y[t] - sp) + (1 - alfa) * (l + b);
      const bn = beta * (ln - l) + (1 - beta) * b;
      S[t + m] = gamma * (y[t] - l - b) + (1 - gamma) * sp;
      l = ln; b = bn;
    }
    return {
      ajuste, sse, nivel: l, tendencia: b,
      /* efectos de los próximos m días (posición j = día T+1+j) */
      estacion: Array.from(S.slice(n, n + m)),
      pronosticar: (h) => Array.from({ length: h }, (_, k) => l + (k + 1) * b + S[n + (k % m)]),
    };
  };

  /* Ajuste de α, β, γ por mínimos cuadrados de los errores a un paso (Nelder-Mead acotado a [0, 1]) */
  B4.hwOptimizar = (y, m = 7, ini) => {
    const inicial = ini || B4.hwInicial(y, m);
    const acotar = (p) => p.map((v) => Math.min(1, Math.max(0, v)));
    const f = (p) => { const q = acotar(p); return B4.hw(y, { alfa: q[0], beta: q[1], gamma: q[2], m, inicial }).sse; };
    let simplex = [[0.2, 0.01, 0.1], [0.5, 0.01, 0.1], [0.2, 0.15, 0.1], [0.2, 0.01, 0.4]].map((p) => ({ p, v: f(p) }));
    for (let it = 0; it < 300; it++) {
      simplex.sort((a, b) => a.v - b.v);
      const [mejor, , , peor] = simplex;
      const c = [0, 1, 2].map((j) => (simplex[0].p[j] + simplex[1].p[j] + simplex[2].p[j]) / 3);
      const pt = (t) => c.map((cj, j) => cj + t * (peor.p[j] - cj));
      const r = pt(-1), vr = f(r);
      if (vr < mejor.v) {
        const e = pt(-2), ve = f(e);
        simplex[3] = ve < vr ? { p: e, v: ve } : { p: r, v: vr };
      } else if (vr < simplex[2].v) {
        simplex[3] = { p: r, v: vr };
      } else {
        const k = pt(0.5), vk = f(k);
        if (vk < peor.v) simplex[3] = { p: k, v: vk };
        else simplex = simplex.map((s, i) => (i === 0 ? s : { p: s.p.map((v, j) => mejor.p[j] + 0.5 * (v - mejor.p[j])), v: 0 })).map((s, i) => (i === 0 ? s : { p: s.p, v: f(s.p) }));
      }
      if (Math.abs(simplex[3].v - simplex[0].v) < 1e-9 * simplex[0].v) break;
    }
    simplex.sort((a, b) => a.v - b.v);
    const [alfa, beta, gamma] = acotar(simplex[0].p);
    return { alfa, beta, gamma, inicial };
  };

  /* ---------- Feriados y días no laborables (de la descomposición precalculada, 2022-04 a 2026-08) ---------- */
  B4.esFeriado = (fecha) => {
    const D = DATA.modelos && DATA.modelos.descomposicion;
    if (!D) return false;
    const i = Math.round((fecha - U.dia(D.inicio)) / 864e5);
    return i >= 0 && i < D.feriado.length && D.feriado[i] === 1;
  };

  /* ---------- Formatos ---------- */
  B4.pct = (v, dec = 1) => (v == null || !isFinite(v) ? "sin dato" : U.fmt(v, dec) + " %");
  B4.mil = (v) => (v == null ? "sin dato" : U.fmt(Math.round(v / 1000)) + " mil");
  B4.num = (v) => U.fmt(Math.round(v));
  B4.signo = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + U.fmt(Math.abs(Math.round(v)));
  B4.DIAS3 = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  B4.fechaDia = (d) => `${B4.DIAS3[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;

  /* Botones que se prenden y apagan de a uno. opciones: [[valor, texto, color]] */
  B4.alternar = (opciones, activos, alCambiar) => {
    const g = U.el("div", { class: "b4-alternar", role: "group" });
    opciones.forEach(([valor, texto, color]) => {
      const b = U.el("button", { type: "button", "aria-pressed": String(activos.has(valor)) },
        U.el("span", { class: "b4-muestra", style: `background:${color}` }), texto);
      b.addEventListener("click", () => {
        const on = b.getAttribute("aria-pressed") !== "true";
        b.setAttribute("aria-pressed", String(on));
        alCambiar(valor, on);
      });
      g.append(b);
    });
    return g;
  };

  /* Leyenda en línea. items: [[tipo ("linea" | "punteada" | "punto" | "banda"), color, texto]] */
  B4.leyenda = (items, estilo = "") => {
    const l = U.el("div", { class: "b4-leyenda", style: "font-size:18px; justify-content:flex-end; width:100%;" + estilo });
    items.forEach(([tipo, color, texto]) => {
      const fondo = tipo === "punteada" ? `repeating-linear-gradient(90deg, ${color} 0 2px, transparent 2px 6px)` : color;
      const clase = tipo === "punto" ? "b4-muestra punto" : "b4-muestra";
      const extra = tipo === "banda" ? "height:12px; vertical-align:-0.05em; opacity:1;" : tipo === "linea" || tipo === "punteada" ? "height:3px;" : "";
      l.append(U.el("span", {}, U.el("span", { class: clase, style: `background:${fondo};${extra}` }), texto));
    });
    return l;
  };

  /* Interruptor de encendido y apagado */
  B4.interruptor = (texto, inicial, alCambiar) => {
    const b = U.el("button", { type: "button", class: "b4-interruptor", role: "switch", "aria-checked": String(inicial) },
      U.el("span", { class: "pista" }), texto);
    b.addEventListener("click", () => {
      const on = b.getAttribute("aria-checked") !== "true";
      b.setAttribute("aria-checked", String(on));
      alCambiar(on);
    });
    return b;
  };

  /* Pronósticos precalculados de junio de 2025, con fechas */
  B4.junio = () => {
    const P = DATA.modelos.pronosticos;
    const d0 = U.dia(P.inicio);
    return P.real.map((v, i) => ({ i, fecha: U.sumarDias(d0, i), real: v, feriado: P.feriado[i] === 1, lluvia: P.lluvia_mm[i] }));
  };
  B4.historia = () => {
    const P = DATA.modelos.pronosticos;
    return U.serie(P.historia_inicio, P.historia);
  };

  /* Fórmula KaTeX en un elemento */
  B4.tex = (el, expr, display = true) => {
    try { katex.render(expr, el, { displayMode: display, throwOnError: false }); }
    catch (e) { el.textContent = expr; }
    return el;
  };

  /* Marcas de Plot para los feriados: banda vertical tenue con rótulo arriba */
  B4.marcasFeriados = (fechas, { y1 = 0, rotulo = true, alto } = {}) => {
    const datos = fechas.map((f) => ({ x1: U.sumarDias(f, -0.5), x2: U.sumarDias(f, 0.5), f }));
    const marcas = [Plot.rectX(datos, { x1: "x1", x2: "x2", y1, y2: alto, fill: U.COLORES.ink3, fillOpacity: 0.12 })];
    if (rotulo) {
      /* un solo rótulo para feriados que están a menos de una semana entre sí */
      const grupos = [];
      fechas.forEach((f) => {
        const g = grupos[grupos.length - 1];
        if (g && (f - g[g.length - 1]) / 864e5 < 7) g.push(f); else grupos.push([f]);
      });
      const rot = grupos.map((g) => ({ x: new Date((+g[0] + +g[g.length - 1]) / 2), t: g.length > 1 ? "feriados" : "feriado" }));
      marcas.push(Plot.text(rot, { x: "x", y: alto, text: "t", dy: -8, fontSize: 16, fill: U.COLORES.ink2 }));
    }
    return marcas;
  };

  /* Transición suave entre dos versiones del mismo gráfico de Plot. Las marcas que tienen className
     (por ejemplo "anim-pron") se interpolan desde su forma anterior; si antes no estaban, aparecen con un fundido.
     memoria guarda la forma anterior de cada marca entre llamadas. */
  B4.animar = (cont, memoria, clases, duracion = 450) => {
    clases.forEach((c) => {
      const nuevos = [...cont.querySelectorAll(`g.${c} > *`)];
      const viejos = memoria[c] || [];
      nuevos.forEach((nodo, i) => {
        const sel = d3.select(nodo), ant = viejos[i];
        if (nodo.tagName === "path" && ant && ant.d) {
          const d = nodo.getAttribute("d");
          if (d !== ant.d) sel.attr("d", ant.d).transition().duration(duracion).ease(d3.easeCubicOut).attr("d", d);
        } else if (nodo.tagName === "rect" && ant && ant.y != null) {
          const y = nodo.getAttribute("y"), h = nodo.getAttribute("height"), x = nodo.getAttribute("x");
          sel.attr("y", ant.y).attr("height", ant.h).attr("x", ant.x ?? x).transition().duration(duracion).ease(d3.easeCubicInOut).attr("y", y).attr("height", h).attr("x", x);
        } else if (!ant) {
          sel.style("opacity", 0).transition().duration(duracion).style("opacity", 1);
        }
      });
      memoria[c] = nuevos.map((n) => ({ d: n.getAttribute("d"), y: n.getAttribute("y"), h: n.getAttribute("height"), x: n.getAttribute("x") }));
    });
  };
})();
