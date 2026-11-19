/* Tabla final del bloque 4, calculada a partir de DATA.modelos (así coincide siempre con los datos). */
DEMOS.resultadosB4 = {
  montar(el) {
    const P = DATA.modelos.pronosticos;
    const INFO = {
      "Naive": "último dato",
      "Holt-Winters": "historia; nivel, tendencia y ciclo semanal",
      "SARIMA": "historia; ciclo semanal",
      "Seasonal naive": "última semana",
      "SARIMAX": "historia; ciclo semanal; feriados, puentes y no laborables de lunes a viernes; lluvia",
      "Gradient boosting": "lags de 28 días o más; calendario, feriados, puentes, lluvia y temperatura",
    };
    const filas = Object.entries(P.modelos).map(([nombre, m]) => {
      const e = m.pred.map((p, i) => P.real[i] - p);
      return { nombre, mae: d3.mean(e, Math.abs), rmse: Math.sqrt(d3.mean(e, (x) => x * x)), mape: 100 * d3.mean(e, (x, i) => Math.abs(x) / P.real[i]) };
    }).sort((a, b) => b.mape - a.mape);
    const max = d3.max(filas, (f) => f.mape);
    const fmt1 = (x) => x.toFixed(1).replace(".", ",");
    el.innerHTML = `<table class="b4-resultados"><thead><tr><th>Modelo</th><th>Información que usa</th><th>MAE</th><th>RMSE</th><th>MAPE</th></tr></thead><tbody>${filas
      .map((f) => `<tr><td>${f.nombre}</td><td>${INFO[f.nombre] || ""}</td><td>${U.fmt(Math.round(f.mae))}</td><td>${U.fmt(Math.round(f.rmse))}</td><td class="mape">${fmt1(f.mape)} %<span class="barra" style="width: ${Math.round((200 * f.mape) / max)}px"></span></td></tr>`)
      .join("")}</tbody></table>`;
    return {};
  },
};
