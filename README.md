# Series temporales: cuadernos de la teórica

Analítica de Datos, Universidad de San Andrés. Cuadernos de Python que acompañan la teórica de series temporales, con datos de los molinetes del subte de Buenos Aires y de Ecobici.

## Contenido

- `notebooks/`: un cuaderno por bloque de la clase, guardados con sus salidas (se pueden leer sin correrlos).
- `datos_clase/`: los datos que usan los cuadernos, ya limpios. El detalle de cada archivo está en `datos_clase/README.md`.
- `presentacion/`: las diapositivas de la clase, con los gráficos interactivos y los mapas.

| Cuaderno | Tema | Abrir en Colab |
|---|---|---|
| `00_datos` | De dónde salen los datos: formatos de cada año, fechas en cuatro órdenes, nombres de estación | [abrir](https://colab.research.google.com/github/ferkrodriguez98/teorica-series-temporales/blob/main/notebooks/00_datos.ipynb) |
| `01_mirar_una_serie` | Índice temporal, `resample`, medias móviles, mapa de calor, días atípicos | [abrir](https://colab.research.google.com/github/ferkrodriguez98/teorica-series-temporales/blob/main/notebooks/01_mirar_una_serie.ipynb) |
| `02_piezas_de_una_serie` | Tendencia, ciclos y residuo; aditiva y multiplicativa; `seasonal_decompose` y `MSTL` | [abrir](https://colab.research.google.com/github/ferkrodriguez98/teorica-series-temporales/blob/main/notebooks/02_piezas_de_una_serie.ipynb) |
| `03_memoria_de_una_serie` | Rezagos, ACF y PACF, caminatas aleatorias, correlación espuria, estacionariedad, ADF, AR(1) | [abrir](https://colab.research.google.com/github/ferkrodriguez98/teorica-series-temporales/blob/main/notebooks/03_memoria_de_una_serie.ipynb) |
| `04_pronosticar` | Partición temporal, pronósticos de referencia, métricas, suavizado exponencial, origen móvil, intervalos | [abrir](https://colab.research.google.com/github/ferkrodriguez98/teorica-series-temporales/blob/main/notebooks/04_pronosticar.ipynb) |
| `05_modelos_con_estructura` | ARIMA y SARIMA, SARIMAX con feriados y lluvia, gradient boosting con rezagos, comparación | [abrir](https://colab.research.google.com/github/ferkrodriguez98/teorica-series-temporales/blob/main/notebooks/05_modelos_con_estructura.ipynb) |
| `06_contexto` | Lluvia, puentes, precio del boleto, cobro de Ecobici, aperturas y cierres, qué mide cada dato | [abrir](https://colab.research.google.com/github/ferkrodriguez98/teorica-series-temporales/blob/main/notebooks/06_contexto.ipynb) |

## La presentación

Online: [ferkrodriguez98.github.io/teorica-series-temporales](https://ferkrodriguez98.github.io/teorica-series-temporales/).

Sin conexión: bajar el repositorio (*Code > Download ZIP*), descomprimirlo y abrir `presentacion/index.html` con doble clic. Todo lo que usa está en la carpeta, así que anda sin internet. Conviene Chrome o Edge.

Flechas para avanzar, `Esc` para ver todas las diapositivas. Si un control deslizante tiene el foco, las flechas lo mueven: con `Esc` o un clic afuera se vuelve a navegar. En los mapas se puede arrastrar, rotar (clic derecho) y hacer zoom.

Bibliotecas incluidas: Reveal.js, D3, Observable Plot, deck.gl y KaTeX (licencias MIT e ISC); tipografías Fraunces, Inter y JetBrains Mono (licencia SIL Open Font).

## Cómo usarlos

**En Colab.** El enlace abre el cuaderno; con *Entorno de ejecución > Ejecutar todas* corre completo. La primera celda detecta que está en Colab y lee los datos desde este repositorio (constante `URL_DATOS_COLAB`). Si los datos se suben a otro lado, hay que cambiar esa constante en la primera celda de cada cuaderno.

**En la computadora.** Con Python 3.10 o posterior:

```
pip install pandas numpy matplotlib statsmodels scikit-learn jupyter
jupyter notebook notebooks/
```

Fuera de Colab, los cuadernos leen los datos de `../datos_clase/`, así que hay que abrirlos desde la carpeta `notebooks/`. El cuaderno 05 usa Prophet si está instalado (`pip install prophet`); si no, sigue sin él. La sección 4 del cuaderno 00 baja unos 90 MB de BA Data y necesita conexión.

## Fuentes de los datos

| Datos | Fuente |
|---|---|
| Molinetes del subte (pasajeros cada 15 minutos, 2013 a 2026) | SBASE, [BA Data: subte, viajes por molinetes](https://data.buenosaires.gob.ar/dataset/subte-viajes-molinetes) |
| Recorridos de Ecobici (2014 a 2026) | [BA Data: bicicletas públicas](https://data.buenosaires.gob.ar/dataset/bicicletas-publicas) |
| Ubicación de las estaciones de subte | BA Data |
| Lluvia y temperatura diarias en la Ciudad | [Open-Meteo, Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api) (reanálisis) |
| Feriados y días no laborables | decretos y leyes nacionales de cada año, contrastados con el calendario oficial de [argentina.gob.ar](https://www.argentina.gob.ar/feriados) |
| Índice de precios al consumidor | IPC de la Ciudad (DGEyC) hasta noviembre de 2016; IPC nacional (INDEC) desde diciembre de 2016 |
| Tarifa del subte | resoluciones del Directorio de SBASE, Boletín Oficial de la Ciudad |
| Dólar blue | [Bluelytics](https://bluelytics.com.ar) |
| Días atípicos del subte | notas de prensa y normas, con la fuente citada en cada fila de `eventos_verificados.csv` |

Fecha de consulta de las fuentes: 17/11/2026.
