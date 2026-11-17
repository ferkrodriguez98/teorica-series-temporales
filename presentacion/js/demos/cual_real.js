/* ¿Cuál es la real? Tres caminatas aleatorias y el logaritmo del dólar blue en una ventana
   de 500 días (lunes a viernes) elegida al azar. Los pasos simulados son normales con la media y
   el desvío de los log-retornos diarios del dólar en esa misma ventana.
   La ventana empieza desde DESDE: antes de mayo de 2020 la serie incluye fines de semana (con el valor
   repetido) y está en pesos enteros con precios de 5 a 80, así que se ve como una escalera y el juego
   pierde sentido (entre 2014 y 2019, el 85 % al 99 % de los registros repite el valor anterior). */
DEMOS.cualReal = {
  montar(el) {
    const { controles, grafico, lectura } = U.armar(el);
    const DESDE = "2020-06-01";
    const D0 = DATA.dolarBlue;
    const D = { fechas: [], venta: [] };
    D0.fechas.forEach((f, i) => {
      const dia = U.dia(f).getUTCDay();
      if (f >= DESDE && dia !== 0 && dia !== 6) { D.fechas.push(f); D.venta.push(D0.venta[i]); }
    });
    const logv = D.venta.map(Math.log);
    const N = 500, AN = 700, AL = 200;

    const grilla = U.el("div", { class: "b3-cuatro" });
    grafico.append(grilla);
    const paneles = d3.range(4).map((i) => {
      const caja = U.el("div", { class: "b3-cr-panel", role: "button", tabindex: "0" });
      const cab = U.el("div", { class: "b3-cr-cab" });
      const cuerpo = U.el("div");
      caja.append(cab, cuerpo);
      grilla.append(caja);
      caja.addEventListener("click", () => elegir(i));
      return { caja, cab, cuerpo };
    });

    let E = null;

    function nueva() {
      const i0 = Math.floor(Math.random() * (logv.length - N + 1));
      const real = logv.slice(i0, i0 + N);
      const ret = real.slice(1).map((v, i) => v - real[i]);
      const media = B3.media(ret), desvio = B3.desvio(ret);
      const series = d3.range(3).map(() => B3.caminata(N, { media, desvio, inicio: real[0] }));
      const pos = Math.floor(Math.random() * 4);
      series.splice(pos, 0, real);
      E = { i0, series, pos, revelado: false, elegido: null, sinCambio: ret.filter((r) => r === 0).length / ret.length };
      dibujar();
    }

    function dibujar() {
      paneles.forEach((p, i) => {
        const s = E.series[i];
        const esReal = i === E.pos;
        const [lo, hi] = d3.extent(s), pad = (hi - lo) * 0.06 || 0.01;
        const color = !E.revelado ? U.COLORES.ink : esReal ? U.COLORES.ink : U.COLORES.B;
        U.reemplazar(p.cuerpo, Plot.plot({
          width: AN, height: AL, margin: 6,
          style: { background: "transparent", overflow: "visible" },
          x: { axis: null }, y: { axis: null, domain: [lo - pad, hi + pad] },
          marks: [Plot.lineY(s, { stroke: color, strokeWidth: 1.6, strokeLinejoin: "round" })],
        }));
        p.caja.classList.toggle("elegido", E.elegido === i);
        p.caja.classList.toggle("atenuado", E.revelado && !esReal);
        if (!E.revelado) p.cab.innerHTML = `<b>${i + 1}</b>`;
        else if (esReal) p.cab.innerHTML = `<b>${i + 1}</b> · Dólar blue (logaritmo), ${U.fechaCorta(U.dia(D.fechas[E.i0]))} a ${U.fechaCorta(U.dia(D.fechas[E.i0 + N - 1]))}`;
        else p.cab.innerHTML = `<b>${i + 1}</b> · Simulada`;
      });
      leer();
    }

    function leer() {
      if (!E.revelado) {
        lectura.innerHTML = "Tres paneles son caminatas aleatorias: cada paso es un sorteo normal independiente, con la media y el desvío de los log-retornos diarios del dólar blue en la misma ventana. El cuarto es el logaritmo del dólar blue en 500 días seguidos, de lunes a viernes.";
        return;
      }
      const a = D.venta[E.i0], b = D.venta[E.i0 + N - 1];
      const fmtP = (v) => "$" + U.fmt(v, v < 100 ? 2 : 0);
      lectura.innerHTML = `El real es el panel <b>${E.pos + 1}</b>: el dólar blue pasó de ${fmtP(a)} a ${fmtP(b)} en esos 500 días. En el ${B3.fmtPct(E.sinCambio)} de los días la cotización registrada no cambió respecto del día anterior; en las simuladas, el valor cambia todos los días.`;
    }

    function elegir(i) {
      if (E.revelado) return;
      E.elegido = E.elegido === i ? null : i;
      paneles.forEach((p, j) => p.caja.classList.toggle("elegido", E.elegido === j));
    }

    const bMostrar = U.el("button", { type: "button", class: "boton" }, "Mostrar cuál es");
    const bOtra = U.el("button", { type: "button", class: "boton secundario" }, "Otra vez");
    bMostrar.addEventListener("click", () => { E.revelado = true; dibujar(); });
    bOtra.addEventListener("click", nueva);
    controles.append(bMostrar, bOtra, U.el("span", { class: "b3-ayuda" }, "Sin fechas ni escala. Un clic en un panel lo marca."));
    nueva();
    return {};
  },
};
