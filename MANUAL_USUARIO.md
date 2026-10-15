# MANUAL DE USUARIO // MONITOR MACETA V1.0

Guía práctica de uso y operación de la plataforma de monitoreo inteligente de plantas.

---

## 1. Acceso a la Interfaz

Para utilizar la plataforma:
1. Abre el archivo `web/index.html` en tu navegador web (Google Chrome, Firefox, Edge o Safari).
2. Verás la pantalla con estética retro de fósforo verde simulando una terminal CRT de computadora.

---

## 2. Pestañas de la Aplicación

La aplicación se organiza en 3 pestañas principales ubicadas en la parte superior:

### A. `> LECTURA_ACTUAL` (Pantalla de Diagnóstico)
- **Selector de Planta (`> PLANTA:`):** Permite elegir la especie que tienes plantada en la maceta.
- **Rango Óptimo (`> UMBRAL_OPTIMO:`):** Muestra los límites de humedad mínima y máxima recomendados para la especie seleccionada.
- **Métricas en Tiempo Real:**
  - `HUMEDAD_SUELO`: Porcentaje actual de humedad en tierra.
  - `TEMP_AMBIENTE`: Temperatura actual del aire en °C.
  - `HUMEDAD_AIRE`: Humedad relativa ambiental en %.
  - `ULTIMA_LECTURA`: Hora exacta del último dato recibido.
- **Panel de Entrada Manual:** Si deseas simular valores o ingresar mediciones manualmente, completa los campos y presiona `[GUARDAR_MEDICION]`.

### B. `> TELEMETRIA_GRAFICOS` (Historial)
- Muestra un gráfico de líneas con la evolución de las **últimas 10 mediciones**:
  - Línea Verde/Roja: Humedad del suelo (%).
  - Línea Cian: Humedad del aire (%).
  - Línea Amarilla: Temperatura (°C).

### C. `> CONFIGURAR_PLANTA` (Calibración Custom)
Utiliza esta pestaña para definir cualquier planta que no figure en la lista por defecto:
1. **Nombre de la Especie:** Escribe el nombre (ej. *Ficus*, *Pothos*, *Bonsái*).
2. **Humedad Suelo Mínima (%):** Nivel mínimo antes de requerir riego.
3. **Humedad Suelo Máxima (%):** Nivel máximo para evitar encharcamiento.
4. Presiona `[GUARDAR_CONFIGURACION]`.
5. La planta se guardará en tu navegador y se activará inmediatamente en la pantalla principal.

---

## 3. Estados y Códigos de Colores

El sistema monitorea la salud de la planta y reacciona visualmente:

| Color de Pantalla | Mensaje en Barra de Estado | Significado | ¿Qué hacer? |
| :--- | :--- | :--- | :--- |
| **Verde Neón** | `NOMINAL_OK` | La humedad está en el nivel perfecto para la planta. | No es necesario regar. |
| **Rojo Alerta** | `ALERTA_RIEGO_REQUERIDO (< X%)` | La humedad cayó por debajo del mínimo vital. | **Regar la maceta.** |
| **Rojo Alerta** | `ALERTA_EXCESO_AGUA (> Y%)` | Hay demasiada agua en el sustrato. | **Detener el riego** y revisar el drenaje. |

---

## 4. Preguntas Frecuentes

### ¿Se pierden mis configuraciones al cerrar el navegador?
No. La planta personalizada y la especie seleccionada se guardan automáticamente en la memoria local de tu navegador (`localStorage`). Al volver a abrir la página, tus umbrales y preferencias estarán intactos. *(Nota: En modo incógnito se borran al cerrar la ventana).*

### ¿Por qué marca 0% de humedad al encender por primera vez?
Si el sensor físico del ESP32 no está insertado en tierra húmeda (está al aire libre), su lectura equivale a suelo seco (0%). Esto hará que el sistema entre en alerta roja hasta que se coloque en la tierra.

### ¿Cómo forzar una actualización de datos?
Haz clic en el botón `[↻ RECARGAR]` ubicado en la esquina superior derecha del encabezado.
