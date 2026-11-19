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
U.tickM = (d) => (Math.abs(d) >= 1e6 ? U.locale.format(",.1~f")(d / 1e6) + " M" : Math.abs(d) >= 1e3 ? U.locale.format(",.0f")(d / 1e3) + " mil" : U.locale.format(",.0f")(d));
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
