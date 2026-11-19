/* Utilidades comunes y registro de demos.
   Cada demo se registra como DEMOS[nombre] = { montar(el, ctx), entrar(), salir() }
   y se monta la primera vez que se muestra su diapositiva. */
window.DEMOS = window.DEMOS || {};

const U = (window.U = {});

U.COLORES = {
  A: "#1a9fd0", B: "#d7182a", C: "#1d4f9c", D: "#008a57", E: "#6c2c87", H: "#e0a800", PM: "#8a6d3b",
  ink: "#141414", ink2: "#55534e", ink3: "#8a877f", rule: "#dcd6c9", grid: "#e6e1d6", surface: "#f4f1ea",
  ecobici: "#d4a017", lluvia: "#3b7dd8", modelo: "#d7182a", real: "#141414",
};
U.LINEAS = ["A", "B", "C", "D", "E", "H"];

U.fmt = (n, dec = 0) => (n == null || isNaN(n) ? "sin dato" : n.toLocaleString("es-AR", { maximumFractionDigits: dec, minimumFractionDigits: dec }));
U.fmtM = (n) => (n == null ? "sin dato" : (n / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 2 }) + " M");
U.fmtK = (n) => (n == null ? "sin dato" : n >= 1e6 ? U.fmtM(n) : Math.round(n / 1e3).toLocaleString("es-AR") + " mil");

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
U.MESES = MESES;
U.DIAS = DIAS;
U.fechaLarga = (d) => `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
U.fechaCorta = (d) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
U.iso = (d) => d.toISOString().slice(0, 10);
U.dia = (s) => new Date(s + "T00:00:00Z");
U.sumarDias = (d, n) => new Date(d.getTime() + n * 864e5);

/* Serie diaria como arreglo de {fecha, valor} a partir de {inicio, valores[]} */
U.serie = (inicio, valores) => {
  const d0 = U.dia(inicio);
  return valores.map((v, i) => ({ fecha: U.sumarDias(d0, i), valor: v }));
};

U.recortar = (serie, desde, hasta) => {
  const a = U.dia(desde), b = U.dia(hasta);
  return serie.filter((p) => p.fecha >= a && p.fecha <= b);
};

/* Media móvil (centrada o hacia atrás) que ignora los nulos */
U.mediaMovil = (valores, k, centrada = true) => {
  const out = new Array(valores.length).fill(null);
  const izq = centrada ? Math.floor((k - 1) / 2) : k - 1;
  const der = centrada ? k - 1 - izq : 0;
  for (let i = 0; i < valores.length; i++) {
    if (i - izq < 0 || i + der >= valores.length) continue;
    let s = 0, n = 0;
    for (let j = i - izq; j <= i + der; j++) if (valores[j] != null) { s += valores[j]; n++; }
    out[i] = n >= Math.ceil(k * 0.6) ? s / n : null;
  }
  return out;
};

/* Elemento helper */
U.el = (tag, attrs = {}, ...hijos) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k === "style") e.style.cssText = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const h of hijos) e.append(h);
  return e;
};

/* Slider con etiqueta y valor */
U.slider = ({ etiqueta, min, max, step = 1, valor, formato = (v) => v, alCambiar }) => {
  const out = U.el("output");
  const inp = U.el("input", { type: "range", min, max, step, value: valor });
  const set = () => { out.textContent = formato(+inp.value); alCambiar(+inp.value); };
  inp.addEventListener("input", set);
  const lab = U.el("label", {}, etiqueta, inp, out);
  out.textContent = formato(valor);
  lab.set = (v) => { inp.value = v; set(); };
  lab.input = inp;
  return lab;
};

/* Alto de la diapositiva para un ancho fijo de 1600: 900 en 16:9, más en pantallas más altas */
U.altoDiapositiva = () => Math.max(900, Math.min(1200, Math.round((1600 * window.innerHeight) / Math.max(1, window.innerWidth))));

/* Anima un gráfico entre dos estados de datos (números, arrays u objetos de números): redibuja en cada cuadro
   con los valores intermedios, así también se mueven los ejes. "anim" guarda el estado entre llamadas. */
U.animarDibujo = (anim, nuevo, dibujarCon, duracion = 650) => {
  cancelAnimationFrame(anim.raf);
  if (!anim.estado) { anim.estado = structuredClone(nuevo); dibujarCon(nuevo, false); return; }
  const interp = d3.interpolate(structuredClone(anim.estado), nuevo), t0 = performance.now();
  const paso = (ahora) => {
    const k = Math.min(1, (ahora - t0) / duracion), e = interp(d3.easeCubicInOut(k));
    anim.estado = structuredClone(e);
    dibujarCon(e, k < 1);
    if (k < 1) anim.raf = requestAnimationFrame(paso);
  };
  anim.raf = requestAnimationFrame(paso);
};

/* Transición entre dos gráficos de Plot. En lugar de redibujar cuadro por cuadro, pone el gráfico nuevo
   y lleva cada elemento desde donde estaba en el viejo hasta donde va: líneas, barras, puntos y textos se
   desplazan, y las marcas de los ejes se corren con la escala (las que sobran se apagan, las nuevas aparecen). */
U.transicion = (cont, nuevo, duracion = 900) => {
  if (cont._trans) cont._trans();
  const viejo = cont.firstElementChild;
  const esSvg = (n) => n && n.tagName && n.tagName.toLowerCase() === "svg";
  if (!esSvg(viejo) || !esSvg(nuevo) || typeof viejo.scale !== "function" || viejo.getAttribute("width") !== nuevo.getAttribute("width")) return U.reemplazar(cont, nuevo);
  const escala = (svg, k) => { try { const s = svg.scale(k); return s && s.invert && s.apply ? s : null; } catch (e) { return null; } };
  const ATTR = ["d", "x", "y", "x1", "x2", "y1", "y2", "cx", "cy", "r", "width", "height", "transform", "points", "fill", "stroke", "fill-opacity", "stroke-opacity", "opacity", "stroke-width"];
  const nums = (s) => (s.match(/-?[\d.]+(?:e[-+]?\d+)?/gi) || []).length;
  const tweens = [], salen = [], entran = [];
  // Una línea hecha solo de M y L: si cambia la cantidad de puntos, las dos se remuestrean a la misma cantidad
  const puntos = (d) => {
    if (!/^[ML\d.,\-eZ\s]+$/i.test(d) || /[^MLZ\d.,\-e\s]/.test(d)) return null;
    const v = (d.match(/-?[\d.]+(?:e[-+]?\d+)?/gi) || []).map(Number), p = [];
    for (let i = 0; i + 1 < v.length; i += 2) p.push([v[i], v[i + 1]]);
    return p.length > 1 ? p : null;
  };
  const remuestrear = (p, n) => d3.range(n).map((i) => {
    const t = (i * (p.length - 1)) / (n - 1), a = Math.floor(t), b = Math.min(p.length - 1, a + 1), f = t - a;
    return [p[a][0] + (p[b][0] - p[a][0]) * f, p[a][1] + (p[b][1] - p[a][1]) * f];
  });
  const OPACIDAD = new Set(["fill-opacity", "stroke-opacity", "opacity"]);
  const transparente = (c) => { const k = d3.color(c); return k ? (k.opacity = 0, k.toString()) : null; };
  const tween = (el, a, de, a2) => {
    if (OPACIDAD.has(a)) { if (de == null && a2 != null) de = "1"; if (a2 == null && de != null) { a2 = "1"; } }
    if ((a === "fill" || a === "stroke") && de !== a2) {
      if (de === "none" && transparente(a2)) { const f = d3.interpolateRgb(transparente(a2), a2); tweens.push((t) => el.setAttribute(a, t >= 1 ? a2 : f(t))); return; }
      if (a2 === "none" && transparente(de)) { const f = d3.interpolateRgb(de, transparente(de)); tweens.push((t) => el.setAttribute(a, t >= 1 ? "none" : f(t))); return; }
    }
    if (de == null || a2 == null || de === a2) return;
    if ((a === "d" || a === "points" || a === "transform") && nums(de) !== nums(a2)) {
      const p0 = a === "d" && puntos(de), p1 = a === "d" && puntos(a2);
      if (!p0 || !p1) return false;
      const n = Math.max(p0.length, p1.length), r0 = remuestrear(p0, n), r1 = remuestrear(p1, n);
      tweens.push((t) => el.setAttribute("d", t >= 1 ? a2 : "M" + r0.map((q, i) => `${q[0] + (r1[i][0] - q[0]) * t},${q[1] + (r1[i][1] - q[1]) * t}`).join("L")));
      return;
    }
    const f = d3.interpolate(de, a2);
    tweens.push((t) => el.setAttribute(a, t >= 1 ? a2 : f(t)));
  };
  const copiasTexto = [];
  const morfar = (o, n) => {
    // Un texto que cambia de contenido: el viejo viaja con el nuevo y se apaga mientras el nuevo aparece
    if (n.tagName === "text" && o.textContent !== n.textContent) {
      const c = o.cloneNode(true); copiasTexto.push([c, n]);
      ATTR.forEach((a) => tween(c, a, o.getAttribute(a), n.getAttribute(a)));
      entran.push(n);
    }
    ATTR.forEach((a) => { if (tween(n, a, o.getAttribute(a), n.getAttribute(a)) === false) { salen.push(o); entran.push(n); } });
    const oc = [...o.children], nc = [...n.children];
    // Si los elementos traen una clave (data-k), se emparejan por clave; si no, por orden
    if (nc.length && nc.every((c) => c.dataset && c.dataset.k != null) && oc.every((c) => c.dataset && c.dataset.k != null)) {
      const porK = new Map(oc.map((c) => [c.dataset.k, c]));
      nc.forEach((c) => { const v = porK.get(c.dataset.k); porK.delete(c.dataset.k); if (v && v.tagName === c.tagName) morfar(v, c); else entran.push(c); });
      salen.push(...porK.values());
      return;
    }
    const m = Math.min(oc.length, nc.length);
    for (let i = 0; i < m; i++) {
      if (oc[i].tagName === nc[i].tagName) morfar(oc[i], nc[i]); else { salen.push(oc[i]); entran.push(nc[i]); }
    }
    salen.push(...oc.slice(m)); entran.push(...nc.slice(m));
  };
  // Posición de una marca de eje: translate(x,y) en ticks y textos; x1/y1 en la grilla
  const pos = (el, ax) => {
    const tr = el.getAttribute("transform");
    if (tr) { const m = tr.match(/translate\(([-\d.e]+)[ ,]+([-\d.e]+)\)/); if (m) return +m[ax === "x" ? 1 : 2]; }
    return +el.getAttribute(ax + "1");
  };
  const ponerPos = (el, ax, v) => {
    const tr = el.getAttribute("transform");
    if (tr && /translate\(/.test(tr)) el.setAttribute("transform", tr.replace(/translate\(([-\d.e]+)[ ,]+([-\d.e]+)\)/, (m, a, b) => ax === "x" ? `translate(${v},${b})` : `translate(${a},${v})`));
    else { el.setAttribute(ax + "1", v); el.setAttribute(ax + "2", v); }
  };
  const ejes = (go, gn, ax) => {
    const so = escala(viejo, ax), sn = escala(nuevo, ax);
    if (!so || !sn) { salen.push(go); entran.push(gn); return; }
    const val = (s, el) => +s.invert(pos(el, ax));
    const tol = Math.abs(sn.domain[1] - sn.domain[0]) * 1e-6 + 1e-9;
    const oc = [...go.children], nc = [...gn.children], usados = new Set();
    const [r0, r1] = d3.extent([...sn.range, ...so.range]);
    const mover = (el, v) => { ponerPos(el, ax, v); el.style.visibility = v < r0 - 1 || v > r1 + 1 ? "hidden" : ""; };
    nc.forEach((n) => {
      const v = val(sn, n), p1 = pos(n, ax);
      const k = oc.findIndex((o, i) => !usados.has(i) && Math.abs(val(so, o) - v) <= tol);
      const p0 = k >= 0 ? pos(oc[k], ax) : so.apply(v);
      if (k >= 0) usados.add(k); else entran.push(n);
      if (isFinite(p0) && p0 !== p1) tweens.push((t) => mover(n, p0 + (p1 - p0) * t));
    });
    oc.forEach((o, i) => {
      if (usados.has(i)) return;
      const c = o.cloneNode(true), p0 = pos(o, ax), p1 = sn.apply(val(so, o));
      gn.append(c); salen.push(c);
      if (isFinite(p1)) tweens.push((t) => mover(c, p0 + (p1 - p0) * t));
    });
  };
  // Empareja los grupos de primer nivel por su rótulo (y por orden entre los que se llaman igual)
  const clave = (gs) => { const n = {}; return gs.map((g) => { const l = g.getAttribute("aria-label") || g.tagName; n[l] = (n[l] || 0) + 1; return l + "#" + n[l]; }); };
  const gv = [...viejo.children].filter((g) => g.tagName === "g"), gn = [...nuevo.children].filter((g) => g.tagName === "g");
  const kv = clave(gv), kn = clave(gn), porClave = new Map(kv.map((k, i) => [k, gv[i]]));
  const fueraClonar = [];
  kn.forEach((k, i) => {
    const g = gn[i], o = porClave.get(k), l = g.getAttribute("aria-label") || "";
    porClave.delete(k);
    if (l === "tip") return;
    if (!o) { entran.push(g); return; }
    const ax = (l.match(/^([xy])-(axis|grid)/) || [])[1];
    if (ax) ejes(o, g, ax);
    else morfar(o, g);
  });
  porClave.forEach((o) => fueraClonar.push(o));
  // Lo que sale se copia en el gráfico nuevo para apagarlo ahí
  const copias = salen.filter((el) => !nuevo.contains(el)).map((el) => {
    const c = el.cloneNode(true), padre = el.parentNode;
    const destino = padre === viejo ? nuevo : nuevo.querySelector(`g[aria-label="${padre.getAttribute("aria-label")}"]`) || nuevo;
    destino.append(c); return c;
  });
  fueraClonar.forEach((g) => { const c = g.cloneNode(true); nuevo.append(c); copias.push(c); });
  copiasTexto.forEach(([c, n]) => { n.parentNode.insertBefore(c, n); copias.push(c); });
  const apagar = [...salen.filter((el) => nuevo.contains(el)), ...copias];
  // Estado inicial: todo en el lugar viejo
  tweens.forEach((f) => f(0));
  entran.forEach((el) => (el.style.opacity = 0));
  U.reemplazar(cont, nuevo);
  const ease = d3.easeCubicInOut;
  const terminar = () => { timer.stop(); tweens.forEach((f) => f(1)); entran.forEach((el) => (el.style.opacity = "")); apagar.forEach((el) => el.remove()); cont._trans = null; };
  // Si llega otra transición a mitad de camino, se frena donde está y la nueva arranca desde ahí
  const frenar = () => { timer.stop(); entran.forEach((el) => (el.style.opacity = "")); apagar.forEach((el) => el.remove()); cont._trans = null; };
  const timer = d3.timer((ms) => {
    const k = Math.min(1, ms / duracion), e = ease(k);
    tweens.forEach((f) => f(e));
    entran.forEach((el) => (el.style.opacity = Math.max(0, (k - 0.35) / 0.65)));
    apagar.forEach((el) => (el.style.opacity = Math.max(0, 1 - k / 0.5)));
    if (k >= 1) terminar();
  });
  cont._trans = frenar;
  return nuevo;
};

/* Pone una clave a cada elemento de una marca de Plot (en el orden de los datos), para que U.transicion
   empareje por clave: grupo es el número de marca con ese rótulo (0 = la primera). */
U.claves = (plot, rotulo, claves, grupo = 0) => {
  const g = plot.querySelectorAll(`g[aria-label="${rotulo}"]`)[grupo];
  if (g) [...g.children].forEach((el, i) => { if (claves[i] != null) el.dataset.k = claves[i]; });
  return plot;
};

/* Grupo de botones excluyentes */
U.botones = (opciones, inicial, alCambiar) => {
  const g = U.el("div", { class: "botones", role: "group" });
  const bs = opciones.map(([valor, texto]) => {
    const b = U.el("button", { type: "button", "aria-pressed": String(valor === inicial) }, texto);
    b.addEventListener("click", () => {
      bs.forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      alCambiar(valor);
    });
    return b;
  });
  bs.forEach((b) => g.append(b));
  g.elegir = (valor) => bs[opciones.findIndex((o) => o[0] === valor)]?.click();
  return g;
};

/* Ícono de reproducir o pausar para los botones de las animaciones */
U.iconoPlay = (btn, enPausa) => {
  btn.classList.add("boton-icono");
  btn.setAttribute("aria-label", enPausa ? "Pausa" : "Reproducir");
  btn.title = enPausa ? "Pausa (barra espaciadora)" : "Reproducir (barra espaciadora)";
  btn.innerHTML = enPausa
    ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
    : '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
};

/* Cambia el contenido de un panel con un fundido: se apaga, cambia y vuelve a aparecer */
U.panelFundido = (panel, html, fundir) => {
  clearTimeout(panel._fundido);
  if (!fundir) { panel.style.opacity = ""; panel.innerHTML = html; return; }
  panel.style.transition = "opacity 0.15s";
  panel.style.opacity = 0;
  panel._fundido = setTimeout(() => { panel.innerHTML = html; panel.style.transition = "opacity 0.3s"; panel.style.opacity = 1; }, 150);
};

/* Esqueleto estándar de una demo: controles arriba, gráfico, lectura abajo */
U.armar = (el) => {
  el.classList.add("demo");
  const controles = U.el("div", { class: "controles" });
  const grafico = U.el("div", { class: "grafico" });
  const lectura = U.el("div", { class: "lectura" });
  el.append(controles, grafico, lectura);
  // Cuando cambia el texto, aparece con un fundido corto (no en cada cuadro de una animación)
  let previo = "", ultimoCambio = 0;
  new MutationObserver(() => {
    const txt = lectura.textContent;
    if (txt === previo) return;
    const habia = previo !== "", ahora = performance.now(), rapido = ahora - ultimoCambio < 400;
    previo = txt; ultimoCambio = ahora;
    if (!habia || rapido) return;
    lectura.classList.remove("cambia"); void lectura.offsetWidth; lectura.classList.add("cambia");
  }).observe(lectura, { childList: true, characterData: true, subtree: true });
  return { controles, grafico, lectura };
};

/* Opciones comunes de Observable Plot */
U.plotBase = (extra = {}) => ({
  width: 1440,
  height: 520,
  marginLeft: 70,
  marginBottom: 40,
  style: { fontFamily: "IBM Plex Sans, sans-serif", fontSize: "18px", color: U.COLORES.ink2, background: "transparent", overflow: "visible" },
  ...extra,
});

U.reemplazar = (cont, nodo) => { cont.replaceChildren(nodo); return nodo; };

U.locale = d3.formatLocale({ decimal: ",", thousands: ".", grouping: [3], currency: ["$", ""] });
U.tickM = (d) => (Math.abs(d) >= 1e6 ? U.locale.format(",.1~f")(d / 1e6) + " M" : Math.abs(d) >= 1e4 ? U.locale.format(",.0f")(d / 1e3) + " mil" : Math.abs(d) >= 1e3 ? U.locale.format(",.1~f")(d / 1e3) + " mil" : U.locale.format(",.0f")(d));
U.tickFecha = d3.utcFormat("%Y");
d3.timeFormatDefaultLocale({
  dateTime: "%A, %e de %B de %Y, %X", date: "%d/%m/%Y", time: "%H:%M:%S", periods: ["AM", "PM"],
  days: DIAS, shortDays: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
  months: MESES, shortMonths: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
});

/* Escenario fijo (detrás de las diapositivas) para los mapas de deck.gl */
U.escenario = () => document.getElementById("escenario");

/* Montaje perezoso de demos según la diapositiva activa */
U.iniciarDemos = (reveal) => {
  const activas = new Set();
  const procesar = (slide) => {
    activas.forEach((d) => d.salir && d.salir());
    activas.clear();
    document.body.classList.toggle("con-escena", slide.classList.contains("escena"));
    slide.querySelectorAll("[data-demo]").forEach((el) => {
      const nombre = el.dataset.demo;
      const demo = DEMOS[nombre];
      if (!demo) { console.warn("demo inexistente", nombre); return; }
      if (!el._montada) {
        try { el._inst = demo.montar(el, { reveal, slide }) || demo; }
        catch (err) { console.error(nombre, err); el.textContent = "Error en la demo " + nombre + ": " + err.message; return; }
        el._montada = true;
      }
      const inst = el._inst;
      inst.entrar && inst.entrar();
      activas.add(inst);
    });
    fijarCuerpo(slide);
  };
  /* El contenido se centra en el alto la primera vez que se ve la diapositiva y después queda fijo:
     si un botón cambia el largo de la lectura, crece hacia abajo en lugar de mover todo. */
  const fijarCuerpo = (slide) => {
    const cuerpo = slide.querySelector(":scope > .cuerpo");
    if (!cuerpo || cuerpo._fijo || !slide.querySelector("[data-demo]")) return;
    requestAnimationFrame(() => {
      const primero = cuerpo.firstElementChild;
      if (!primero || cuerpo._fijo) return;
      const esc = reveal.getScale() || 1;
      const arriba = (primero.getBoundingClientRect().top - cuerpo.getBoundingClientRect().top) / esc;
      cuerpo.style.paddingTop = Math.max(0, Math.round(arriba)) + "px";
      cuerpo.style.justifyContent = "flex-start";
      cuerpo._fijo = true;
    });
  };
  /* Barra espaciadora: en las diapositivas con animación, pausa y reanuda en lugar de avanzar */
  document.addEventListener("keydown", (e) => {
    if (e.key !== " " || e.shiftKey || reveal.isOverview()) return;
    const anim = [...activas].find((d) => d.alternar);
    if (!anim) return;
    e.preventDefault(); e.stopPropagation();
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    anim.alternar();
  }, true);
  reveal.on("ready", (e) => procesar(e.currentSlide));
  /* El alto de la diapositiva sigue la proporción de la pantalla (16:9 o más alta, como 16:10 en pantalla completa),
     así no sobra una franja abajo. Al cambiar, se vuelve a centrar el contenido. */
  window.addEventListener("resize", () => {
    const h = U.altoDiapositiva();
    if (reveal.getConfig().height === h) return;
    reveal.configure({ height: h });
    document.querySelectorAll(".cuerpo").forEach((c) => { c._fijo = false; c.style.paddingTop = ""; c.style.justifyContent = ""; });
    fijarCuerpo(reveal.getCurrentSlide());
  });
  reveal.on("slidechanged", (e) => procesar(e.currentSlide));
};

/* Escape saca el foco de un control para volver a navegar con las flechas */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.activeElement && document.activeElement.tagName === "INPUT") {
    document.activeElement.blur();
    e.preventDefault(); e.stopPropagation();
  }
}, true);
