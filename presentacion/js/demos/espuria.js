/* Correlación espuria.
   DEMOS.espuria: dos random walks independientes de 48 pasos, su dispersión y la
   distribución de la correlación en 500 pares simulados, en niveles y en diferencias.
   DEMOS.espuriaReal: pasajeros del subte contra dólar blue, promedios mensuales de 2022 a 2025. */
(function () {
  const N = 48, PARES = 500, SEMILLA = 20261120;
  const CORTES = d3.range(-1, 1.0001, 0.05).map((v) => Math.round(v * 100) / 100);
  const estilo = { fontFamily: "IBM Plex Sans, sans-serif", fontSize: "18px", color: U.COLORES.ink2, background: "transparent", overflow: "visible" };

  /* Las 500 correlaciones se calculan una sola vez (con semilla, para que la lectura sea estable) */
  let cache = null;
  const simulacion = () => {
    if (cache) return cache;
    const rnd = B3.rng(SEMILLA);
    const niv = [], dif = [];
    for (let i = 0; i < PARES; i++) {
      const a = B3.caminata(N, { rnd }), b = B3.caminata(N, { rnd });
      niv.push(B3.pearson(a, b));
      dif.push(B3.pearson(B3.dif(a).slice(1), B3.dif(b).slice(1)));
    }
    cache = { niv, dif };
    return cache;
  };
  const shareMasExtremo = (arr, r) => arr.filter((v) => Math.abs(v) >= Math.abs(r)).length / arr.length;

  DEMOS.espuria = {
    montar(el) {
      const { controles, grafico, lectura } = U.armar(el);
      const sim = simulacion();
      const binear = (arr) => d3.bin().domain([-1, 1]).thresholds(CORTES)(arr);
      const bins = { niv: binear(sim.niv), dif: binear(sim.dif) };
      const yMax = d3.max([...bins.niv, ...bins.dif], (b) => b.length) * 1.2;
      const medNiv = B3.cuantil(sim.niv.map(Math.abs), 0.5);
      const q95Dif = B3.cuantil(sim.dif.map(Math.abs), 0.95);

      let modo = "niv", par = null;

      const fila = U.el("div", { class: "b3-fila" });
      grafico.append(fila);
      const pS = B3.panel(fila, "", 520);
      const pD = B3.panel(fila, "", 420);
      const pH = B3.panel(fila, `Correlación en ${PARES} pares simulados`, 420);

      function nuevoPar() {
        const a = B3.caminata(N), b = B3.caminata(N);
        const da = B3.dif(a).slice(1), db = B3.dif(b).slice(1);
        par = { a, b, da, db, rNiv: B3.pearson(a, b), rDif: B3.pearson(da, db) };
        dibujar();
      }

      function dibujar() {
        const enNiv = modo === "niv";
        const A = enNiv ? par.a : par.da, Bs = enNiv ? par.b : par.db;
        const r = enNiv ? par.rNiv : par.rDif;
        const t0 = enNiv ? 0 : 1;
        const filas = A.map((v, i) => ({ t: i + t0, a: v, b: Bs[i] }));

        // Series en el tiempo
        pS.titulo.innerHTML = enNiv ? `Dos random walks independientes, ${N} pasos` : "Sus diferencias: el paso de cada período";
        const ult = filas[filas.length - 1];
        U.reemplazar(pS.cuerpo, Plot.plot({
          width: 520, height: 510, marginLeft: 46, marginRight: 28, marginBottom: 40, marginTop: 30, style: estilo,
          x: { label: "Período →", labelAnchor: "right", domain: [0, N - 1], ticks: 6 },
          y: { label: null, grid: true, ticks: 6 },
          marks: [
            Plot.ruleY([0], { stroke: U.COLORES.rule }),
            Plot.lineY(filas, { x: "t", y: "a", stroke: U.COLORES.B, strokeWidth: 2 }),
            Plot.lineY(filas, { x: "t", y: "b", stroke: U.COLORES.ink2, strokeWidth: 2 }),
            Plot.text([ult], { x: "t", y: "a", text: () => "A", dx: 10, fill: U.COLORES.B, fontWeight: 600, textAnchor: "start" }),
            Plot.text([ult], { x: "t", y: "b", text: () => "B", dx: 10, fill: U.COLORES.ink2, fontWeight: 600, textAnchor: "start" }),
          ],
        }));

        // Dispersión
        pD.titulo.innerHTML = `${enNiv ? "B contra A" : "Paso de B contra paso de A"} <span class="b3-r">r = ${B3.fmtR(r)}</span>`;
        U.reemplazar(pD.cuerpo, Plot.plot({
          width: 420, height: 510, marginLeft: 46, marginBottom: 40, marginTop: 30, marginRight: 10, style: estilo,
          x: { label: enNiv ? "A →" : "Paso de A →", labelAnchor: "right", grid: true, ticks: 5 },
          y: { label: enNiv ? "↑ B" : "↑ Paso de B", labelAnchor: "top", grid: true, ticks: 5 },
          marks: [
            Plot.line(filas, { x: "a", y: "b", stroke: U.COLORES.ink3, strokeWidth: 1, strokeOpacity: enNiv ? 0.6 : 0 }),
            Plot.dot(filas, { x: "a", y: "b", r: 4, fill: U.COLORES.B, fillOpacity: 0.85, stroke: U.COLORES.surface, strokeWidth: 1 }),
            Plot.linearRegressionY(filas, { x: "a", y: "b", stroke: U.COLORES.ink, strokeWidth: 1.5, ci: 0 }),
          ],
        }));

        // Histogramas (uno arriba del otro, misma escala)
        const hist = (clave, titulo, rPar) => {
          const activo = clave === modo;
          return Plot.plot({
            width: 420, height: 241, marginLeft: 46, marginBottom: clave === "dif" ? 36 : 22, marginTop: 10, marginRight: 10, style: estilo,
            x: { domain: [-1, 1], ticks: 5, tickFormat: (d) => U.fmt(d, 1), label: clave === "dif" ? "r →" : null, labelAnchor: "right", axis: clave === "dif" ? "bottom" : null },
            y: { domain: [0, yMax], ticks: 3, grid: true, label: null },
            marks: [
              Plot.rectY(bins[clave], { x1: "x0", x2: "x1", y: (b) => b.length, fill: activo ? U.COLORES.B : U.COLORES.ink3, fillOpacity: activo ? 0.85 : 0.35, insetLeft: 1, insetRight: 1 }),
              Plot.ruleY([0], { stroke: U.COLORES.ink3 }),
              Plot.ruleX([rPar], { stroke: U.COLORES.ink, strokeWidth: 2, strokeOpacity: activo ? 1 : 0.35 }),
              Plot.text([rPar], { x: (d) => d, frameAnchor: "top", dy: 2, dx: rPar > 0.4 ? -6 : 6, textAnchor: rPar > 0.4 ? "end" : "start", text: () => "este par", fill: U.COLORES.ink, fillOpacity: activo ? 1 : 0.45, stroke: U.COLORES.surface, strokeWidth: 4, paintOrder: "stroke" }),
              Plot.text([titulo], { frameAnchor: "top-left", dx: 4, dy: 2, text: (d) => d, fill: U.COLORES.ink, fontWeight: 600, stroke: U.COLORES.surface, strokeWidth: 4, paintOrder: "stroke" }),
            ],
          });
        };
        const caja = U.el("div", { class: "b3-hist" });
        caja.append(hist("niv", "Niveles", par.rNiv), hist("dif", "Diferencias", par.rDif));
        U.reemplazar(pH.cuerpo, caja);

        lectura.innerHTML = enNiv
          ? `En niveles, este par tiene r = ${B3.fmtR(par.rNiv)}${Math.abs(par.rNiv) >= 0.4 ? ", aunque A y B se generaron por separado" : ""}. En los ${PARES} pares simulados, la mitad de las correlaciones de niveles supera ${B3.fmtR(medNiv)} en valor absoluto.`
          : `En diferencias, este par tiene r = ${B3.fmtR(par.rDif)}. En los ${PARES} pares simulados, el 95 % de las correlaciones de las diferencias queda entre −${B3.fmtR(q95Dif)} y ${B3.fmtR(q95Dif)}.`;
      }

      const botones = U.botones([["niv", "Niveles"], ["dif", "Diferencias"]], modo, (v) => { modo = v; dibujar(); });
      const bOtro = U.el("button", { type: "button", class: "boton secundario" }, "Otro par");
      bOtro.addEventListener("click", nuevoPar);
      controles.append(botones, bOtro);
      nuevoPar();
      return {};
    },
  };

  DEMOS.espuriaReal = {
    montar(el) {
      const { controles, grafico, lectura } = U.armar(el);
      controles.remove();
      const S = DATA.subteDiario, D = DATA.dolarBlue;

      // Promedios mensuales de 2022-01 a 2025-12
      const acum = new Map();
      const sumar = (clave, campo, v) => {
        if (v == null) return;
        const o = acum.get(clave) || { p: [], d: [] };
        o[campo].push(v);
        acum.set(clave, o);
      };
      U.serie(S.inicio, S.total).forEach((d) => sumar(U.iso(d.fecha).slice(0, 7), "p", d.valor));
      D.fechas.forEach((f, i) => sumar(f.slice(0, 7), "d", D.venta[i]));
      const meses = [];
      for (let a = 2022; a <= 2025; a++) for (let m = 1; m <= 12; m++) meses.push(`${a}-${String(m).padStart(2, "0")}`);
      const filas = meses.map((c) => ({ fecha: U.dia(c + "-01"), pas: B3.media(acum.get(c).p), dol: B3.media(acum.get(c).d) }));
      const vari = filas.slice(1).map((f, i) => ({ fecha: f.fecha, pas: f.pas / filas[i].pas - 1, dol: f.dol / filas[i].dol - 1 }));
      const rNiv = B3.pearson(filas.map((f) => f.pas), filas.map((f) => f.dol));
      const rVar = B3.pearson(vari.map((f) => f.pas), vari.map((f) => f.dol));
      const mesAnio = d3.utcFormat("%b %Y");

      const fila = U.el("div", { class: "b3-fila" });
      grafico.append(fila);
      const izq = U.el("div", { class: "b3-columna", style: "width:640px" });
      fila.append(izq);
      const p1 = B3.panel(izq, "Pasajeros por día, promedio de cada mes", 640);
      const p2 = B3.panel(izq, "Dólar blue (venta), promedio de cada mes, en pesos", 640);
      const p3 = B3.panel(fila, `Niveles <span class="b3-r">r = ${B3.fmtR(rNiv)}</span>`, 370);
      const p4 = B3.panel(fila, `Variaciones mensuales <span class="b3-r">r = ${B3.fmtR(rVar)}</span>`, 370);

      const serieT = (campo, fmt) => Plot.plot({
        width: 640, height: 250, marginLeft: 66, marginBottom: 30, marginTop: 10, marginRight: 14, style: estilo,
        x: { label: null, ticks: "year", tickFormat: d3.utcFormat("%Y") },
        y: { label: null, grid: true, ticks: 4, tickFormat: fmt, zero: true },
        marks: [
          Plot.lineY(filas, { x: "fecha", y: campo, stroke: U.COLORES.ink, strokeWidth: 2 }),
          Plot.dot(filas, { x: "fecha", y: campo, r: 2.5, fill: U.COLORES.ink }),
          Plot.ruleY([0], { stroke: U.COLORES.rule }),
          Plot.tip(filas, Plot.pointerX({ x: "fecha", y: campo, title: (d) => `${mesAnio(d.fecha)}\n${campo === "pas" ? U.fmtK(d.pas) + " pasajeros por día" : "$" + U.fmt(d.dol)}` })),
        ],
      });
      p1.cuerpo.append(serieT("pas", U.tickM));
      p2.cuerpo.append(serieT("dol", (d) => "$" + U.fmt(d)));

      const pct = (d) => U.fmt(100 * d) + " %";
      const disp = (datos, fx, fy, lx, ly, tit, tx) => Plot.plot({
        width: 370, height: 530, marginLeft: 66, marginBottom: 40, marginTop: 30, marginRight: 14, style: estilo,
        x: { label: lx, labelAnchor: "right", grid: true, ticks: tx, tickFormat: fx },
        y: { label: ly, labelAnchor: "top", grid: true, ticks: 6, tickFormat: fy },
        marks: [
          Plot.dot(datos, { x: "dol", y: "pas", r: 4, fill: U.COLORES.ink, fillOpacity: 0.75, stroke: U.COLORES.surface, strokeWidth: 1 }),
          Plot.linearRegressionY(datos, { x: "dol", y: "pas", stroke: U.COLORES.B, strokeWidth: 1.5, ci: 0 }),
          Plot.tip(datos, Plot.pointer({ x: "dol", y: "pas", title: tit })),
        ],
      });
      p3.cuerpo.append(disp(filas, (d) => "$" + U.fmt(d), U.tickM, "Dólar blue →", "↑ Pasajeros por día",
        (d) => `${mesAnio(d.fecha)}\n${U.fmtK(d.pas)} pasajeros por día\ndólar $${U.fmt(d.dol)}`, [400, 800, 1200]));
      p4.cuerpo.append(disp(vari, pct, pct, "Dólar blue →", "↑ Pasajeros",
        (d) => `${mesAnio(d.fecha)} contra el mes anterior\npasajeros ${d.pas > 0 ? "+" : ""}${U.fmt(100 * d.pas, 1)} %\ndólar ${d.dol > 0 ? "+" : ""}${U.fmt(100 * d.dol, 1)} %`, [-0.1, 0, 0.1, 0.2, 0.3]));

      const sim = simulacion();
      const pNiv = shareMasExtremo(sim.niv, rNiv), pVar = shareMasExtremo(sim.dif, rVar);
      const f0 = filas[0], f1 = filas[filas.length - 1];
      lectura.innerHTML = `Entre enero de 2022 y diciembre de 2025 el dólar blue promedio pasó de $${U.fmt(f0.dol)} a $${U.fmt(f1.dol)}. Correlación de los niveles: <b>${B3.fmtR(rNiv)}</b>; de las variaciones mensuales: <b>${B3.fmtR(rVar)}</b>. Como referencia, en los ${PARES} pares de random walks independientes de ${N} pasos, el ${B3.fmtPct(pNiv)} de las correlaciones de niveles y el ${B3.fmtPct(pVar)} de las de diferencias quedan igual o más lejos de cero que estas.`;
      return {};
    },
  };
})();
