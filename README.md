# 🌱 MONITOR MACETA V1.0 // SISTEMA IOT & TELEMETRÍA AMBIENTAL

Sistema integral de monitoreo inteligente para macetas y cultivos domésticos, compuesto por telemetría IoT basada en **ESP32**, almacenamiento en base de datos en tiempo real mediante **Supabase (PostgreSQL)** y un frontend interactivo con estética de **Terminal CRT Retro**.

---

## 🚀 Características Principales

- **Telemetría Multivariable:** Monitoreo en tiempo real de humedad del suelo, temperatura ambiente y humedad relativa del aire.
- **Calibración de Especies & Planta Personalizada:** Soporte para plantas preconfiguradas (*Monstera*, *Cactus*, *Helecho*, *Menta*) y calibración completa de plantas personalizadas con persistencia local (`localStorage`).
- **Semáforo Visual Reactivo (CRT Theme):** Toda la interfaz cambia dinámicamente entre **Verde Neón (Estado Nominal)** y **Rojo Neón (Alerta de Riego o Exceso de Agua)**.
- **Gráfico Histórico Multivariable:** Renderizado con Chart.js sincronizado con los colores del tema activo.
- **Ingreso Manual de Lecturas:** Panel de pruebas para registrar mediciones locales e insertarlas en la nube.
- **Firmware ESP32 Desacoplado:** Conexión Wi-Fi mediante portal cautivo WiFiManager (sin credenciales fijas en el código) y subida periódica vía REST API.

---

## 📂 Estructura del Repositorio

```
monitor-maceta/
├── include/              # Cabeceras C++ del firmware (secrets.h, etc.)
├── lib/                  # Librerías auxiliares de PlatformIO
├── src/
│   └── main.cpp          # Firmware principal del microcontrolador ESP32
├── test/                 # Pruebas de microcontrolador
├── web/                  # Frontend de la aplicación web
│   ├── index.html        # Estructura semántica CRT y solapas
│   ├── style.css         # Estilos retro, scanlines y temas verde/rojo
│   └── app.js           # Lógica cliente, persistencia y conexión a Supabase
├── MANUAL_USUARIO.md     # Guía detallada paso a paso para el usuario final
├── platformio.ini        # Configuración de compilación para ESP32
└── README.md             # Esta documentación general
```

---

## 🛠️ Arquitectura Técnica

```
[ Sensor Suelo (GPIO 36) ]  ───┐
[ Sensor DHT22 (GPIO 23) ]  ───┼─► [ ESP32 Node32S ] ──(Wi-Fi / HTTPS)──► [ Supabase DB ]
[ Relé / Bomba (GPIO 25) ]  ───┘                                                  ▲
                                                                                  │ (REST API)
                                                                                  ▼
                                                                        [ Web CRT Interface ]
```

### Pines y Hardware (ESP32 Node32S)
- **GPIO 23:** Sensor de Temperatura y Humedad del Aire **DHT22** (Digital 1-Wire).
- **GPIO 36 (VP):** Sensor de Humedad de Suelo Capacitivo/Resistivo (Entrada ADC analógica 12 bits).
- **GPIO 25:** Módulo de Relé de 5V para electrobomba (Salida Digital Active-LOW).

### Base de Datos (Supabase)
Tabla `mediciones`:
- `id` (bigint, autoincremental)
- `fecha_hora` (timestamptz)
- `humedad_suelo` (numeric)
- `temperatura_aire` (numeric)
- `humedad_aire` (numeric)

---

## 💻 Puesta en Marcha

### 1. Interfaz Web
Abre directamente `web/index.html` en tu navegador favorito o sírvelo con cualquier servidor estático:
```bash
# Ejemplo con Node.js
npx serve web
```
O con la extensión **Live Server** de Visual Studio Code.

### 2. Firmware ESP32
1. Abre el proyecto en VS Code con la extensión **PlatformIO IDE**.
2. Crea el archivo `include/secrets.h` con tus credenciales de Supabase:
   ```cpp
   #define SUPABASE_URL "https://tu-proyecto.supabase.co/rest/v1/mediciones"
   #define SUPABASE_KEY "tu-clave-anon"
   ```
3. Conecta la placa ESP32 por USB y ejecuta `PlatformIO: Upload`.
4. Conéctate a la red Wi-Fi `ESP32-Planta-Config` desde tu teléfono o PC para ingresar los datos de tu red local.

---

## 📖 Documentación Completa

Para una guía detallada del manejo de la interfaz y resolución de problemas, consulta el [MANUAL_USUARIO.md](MANUAL_USUARIO.md).
