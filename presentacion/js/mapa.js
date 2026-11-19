/* Mapa compartido (deck.gl) en el escenario fijo detrás de las diapositivas. */
(function () {
  const hex = (h, a = 255) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), a];
  U.rgb = hex;

  let instancia = null;
  const VISTA_CABA = { longitude: -58.462, latitude: -34.628, zoom: 12.25, pitch: 52, bearing: -14 };

  U.mapa = () => {
    if (instancia) return instancia;
    const base = DATA.mapaBase;
    const capaBarrios = 
      new deck.PolygonLayer({
        id: "barrios", data: base.barrios, getPolygon: (d) => d.anillo,
        filled: true, stroked: true, getFillColor: [28, 32, 38, 255], getLineColor: [70, 76, 86, 255],
        lineWidthMinPixels: 0.6, pickable: false,
      });
    const capaSubte = (opacidad) =>
      new deck.PathLayer({
        id: "lineas", data: base.lineas, getPath: (d) => d.path, getColor: (d) => hex(U.COLORES[d.linea] || "#888888"),
        getWidth: 4, widthUnits: "pixels", capRounded: true, jointRounded: true, opacity: opacidad,
      });
    const capasBase = [capaBarrios, capaSubte(0.85)];
    const deckgl = new deck.Deck({
      parent: U.escenario(),
      initialViewState: VISTA_CABA,
      controller: { dragRotate: true, touchRotate: true, scrollZoom: true },
      layers: capasBase,
      getTooltip: ({ object, layer }) => (object && layer && layer.props.tooltip && layer.props.tooltip(object) ? { html: layer.props.tooltip(object), style: { background: "#141414", color: "#f2f1ec", fontFamily: "IBM Plex Sans, sans-serif", fontSize: "14px", padding: "8px 10px", borderRadius: "8px" } } : null),
      parameters: { clearColor: [14 / 255, 16 / 255, 19 / 255, 1] },
    });
    instancia = {
      deck: deckgl,
      vistaCABA: VISTA_CABA,
      capas: (extra, op = {}) => deckgl.setProps({ layers: [capaBarrios, capaSubte(op.subte ?? 0.85), ...extra] }),
      volar: (vista, ms = 1600) => deckgl.setProps({
        initialViewState: { ...vista, transitionDuration: ms, transitionInterpolator: new deck.FlyToInterpolator() },
      }),
    };
    return instancia;
  };
})();
