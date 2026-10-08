// ==========================================
// CONFIGURACIÓN DE CREDENCIALES DE SUPABASE
// ==========================================
const SUPABASE_URL = "https://dszgiimsmtboczkndblg.supabase.co";
const SUPABASE_KEY = "sb_publishable_gD9oHAyDE_RDXgb3THEm6w_Z_snNINB";

// Inicializamos la conexión con el SDK Oficial
const db = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let graficoChart = null;
let ultimaLecturaHumedad = null;

// ==========================================
// CONFIGURACIÓN DE ESPECIES Y RANGOS
// ==========================================
const PLANTAS = {
  monstera: { nombre: 'MONSTERA DELICIOSA', minHumedad: 40, maxHumedad: 80 },
  cactus:   { nombre: 'CACTUS', minHumedad: 15, maxHumedad: 40 },
  helecho:  { nombre: 'HELECHO', minHumedad: 60, maxHumedad: 90 },
  menta:    { nombre: 'MENTA', minHumedad: 50, maxHumedad: 85 },
  personalizada: { nombre: 'PLANTA PERSONALIZADA', minHumedad: 30, maxHumedad: 70 }
};

// Alias para garantizar compatibilidad total tanto con 'custom' como con 'personalizada'
PLANTAS.custom = PLANTAS.personalizada;

// ==========================================
// PERSISTENCIA Y CARGA DE PLANTA PERSONALIZADA
// ==========================================
function cargarConfiguracionCustom() {
  try {
    const configGuardada = localStorage.getItem('monitor_maceta_custom');
    if (configGuardada) {
      const parsed = JSON.parse(configGuardada);
      if (parsed && typeof parsed.minHumedad === 'number' && typeof parsed.maxHumedad === 'number') {
        PLANTAS.personalizada = {
          nombre: parsed.nombre || 'PLANTA PERSONALIZADA',
          minHumedad: parsed.minHumedad,
          maxHumedad: parsed.maxHumedad
        };
        PLANTAS.custom = PLANTAS.personalizada;
      }
    }
  } catch (e) {
    console.warn("No se pudo leer la configuración personalizada de localStorage:", e);
  }

  // Sincronizar inputs en el formulario si existen
  const inputNombre = document.getElementById('custom-nombre');
  const inputMin = document.getElementById('custom-min');
  const inputMax = document.getElementById('custom-max');

  if (inputNombre) inputNombre.value = PLANTAS.personalizada.nombre;
  if (inputMin) inputMin.value = PLANTAS.personalizada.minHumedad;
  if (inputMax) inputMax.value = PLANTAS.personalizada.maxHumedad;

  actualizarEtiquetaPersonalizada();
  actualizarResumenCustom();
}

function actualizarEtiquetaPersonalizada() {
  const selectPlanta = document.getElementById('select-planta');
  if (!selectPlanta) return;

  const opcion = selectPlanta.querySelector('option[value="personalizada"]') || selectPlanta.querySelector('option[value="custom"]');
  if (opcion) {
    const nombre = PLANTAS.personalizada.nombre || 'PLANTA PERSONALIZADA';
    opcion.textContent = `${nombre.toUpperCase()} [PERSONALIZADA]`;
  }
}

function actualizarResumenCustom() {
  const infoEl = document.getElementById('custom-info-actual');
  if (infoEl) {
    infoEl.textContent = `${PLANTAS.personalizada.nombre.toUpperCase()} (MÍN: ${PLANTAS.personalizada.minHumedad}% | MÁX: ${PLANTAS.personalizada.maxHumedad}%)`;
  }
}

// ==========================================
// GESTIÓN DE SOLAPAS (PESTAÑAS)
// ==========================================
function activarPestana(targetId) {
  document.querySelectorAll('.btn-pestana').forEach(b => {
    b.classList.toggle('activa', b.getAttribute('data-tab') === targetId);
  });
  document.querySelectorAll('.contenido-pestana').forEach(c => {
    c.classList.toggle('activa', c.id === targetId);
  });
}

document.querySelectorAll('.btn-pestana').forEach(boton => {
  boton.addEventListener('click', () => {
    activarPestana(boton.getAttribute('data-tab'));
  });
});

// Helper de feedback en terminal
function mostrarFeedback(contenedorEl, mensaje, tipo = 'info', tiempo = 4500) {
  if (!contenedorEl) return;
  contenedorEl.textContent = `> ${mensaje}`;
  contenedorEl.className = `feedback-terminal ${tipo}`;
  if (tiempo > 0) {
    setTimeout(() => {
      if (contenedorEl.textContent === `> ${mensaje}`) {
        contenedorEl.textContent = '';
        contenedorEl.className = 'feedback-terminal';
      }
    }, tiempo);
  }
}

// ==========================================
// CONSULTA PRINCIPAL A SUPABASE
// ==========================================
async function obtenerMediciones() {
  const estadoEl = document.getElementById('estado-sistema');
  if (!estadoEl) return;
  estadoEl.textContent = "CONSULTANDO_SUPABASE...";

  if (!db) {
    estadoEl.textContent = "MODO_LOCAL_SIN_SUPABASE";
    return;
  }

  try {
    const { data: datos, error } = await db
      .from('mediciones')
      .select('id, fecha_hora, humedad_suelo, temperatura_aire, humedad_aire')
      .order('fecha_hora', { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error retornado por Supabase SDK:", error);
      estadoEl.textContent = "ERROR_BD: " + error.message;
      return;
    }

    if (!datos || datos.length === 0) {
      estadoEl.textContent = "NO_HAY_DATOS";
      return;
    }

    const ultima = datos[0]; 
    
    // 1. Actualizar interfaz de lectura actual
    document.getElementById('humedad-suelo').textContent = ultima.humedad_suelo ?? '--';
    document.getElementById('temp-ambiente').textContent = ultima.temperatura_aire ?? '--';
    document.getElementById('humedad-aire').textContent = ultima.humedad_aire ?? '--';
    
    if (ultima.fecha_hora) {
      const fecha = new Date(ultima.fecha_hora);
      document.getElementById('fecha-lectura').textContent = fecha.toLocaleTimeString();
    } else {
      document.getElementById('fecha-lectura').textContent = '--';
    }

    evaluarEstadoPlanta(ultima.humedad_suelo);

    // 2. Renderizar gráfico (cronológico)
    renderizarGraficoMultivariable(datos.slice().reverse());

  } catch (err) {
    console.error("Error inesperado en app.js:", err);
    estadoEl.textContent = "ERROR_SISTEMA";
  }
}

// ==========================================
// LÓGICA DE ALERTA Y EVALUACIÓN DE PLANTA
// ==========================================
function evaluarEstadoPlanta(humedad) {
  if (humedad !== undefined && humedad !== null && !isNaN(Number(humedad))) {
    ultimaLecturaHumedad = Number(humedad);
  }

  const selectPlanta = document.getElementById('select-planta');
  const tipoPlanta = selectPlanta ? selectPlanta.value : 'monstera';
  const limites = PLANTAS[tipoPlanta] || PLANTAS.personalizada;
  const estadoEl = document.getElementById('estado-sistema');
  const rangoEl = document.getElementById('rango-optimo');

  if (rangoEl && limites) {
    rangoEl.textContent = `${limites.minHumedad}% - ${limites.maxHumedad}%`;
  }

  if (ultimaLecturaHumedad === null || isNaN(ultimaLecturaHumedad)) {
    return;
  }

  const hum = ultimaLecturaHumedad;
  let esAlerta = false;

  if (hum < limites.minHumedad) {
    estadoEl.textContent = `ALERTA_RIEGO_REQUERIDO (< ${limites.minHumedad}%)`;
    document.body.classList.add('alerta-emergencia');
    esAlerta = true;
  } else if (hum > limites.maxHumedad) {
    estadoEl.textContent = `ALERTA_EXCESO_AGUA (> ${limites.maxHumedad}%)`;
    document.body.classList.add('alerta-emergencia');
    esAlerta = true;
  } else {
    estadoEl.textContent = "NOMINAL_OK";
    document.body.classList.remove('alerta-emergencia');
    esAlerta = false;
  }

  actualizarTemaGrafico(esAlerta);
}

// ==========================================
// SINCRONIZACIÓN VISUAL DEL GRÁFICO (VERDE / ROJO)
// ==========================================
function actualizarTemaGrafico(esAlerta) {
  if (!graficoChart) return;

  const colorTema = esAlerta ? '#ff3333' : '#00ff00';
  const colorGrid = esAlerta ? 'rgba(255, 51, 51, 0.15)' : 'rgba(0, 255, 0, 0.15)';

  if (graficoChart.options && graficoChart.options.scales) {
    if (graficoChart.options.scales.x) {
      graficoChart.options.scales.x.ticks.color = colorTema;
      graficoChart.options.scales.x.grid.color = colorGrid;
    }
    if (graficoChart.options.scales.y) {
      graficoChart.options.scales.y.ticks.color = colorTema;
      graficoChart.options.scales.y.grid.color = colorGrid;
    }
  }

  // La serie de Humedad de suelo adopta el color del estado (rojo en alerta, verde en nominal)
  if (graficoChart.data && graficoChart.data.datasets && graficoChart.data.datasets[0]) {
    graficoChart.data.datasets[0].borderColor = colorTema;
    graficoChart.data.datasets[0].pointBackgroundColor = colorTema;
  }

  graficoChart.update('none');
}

// ==========================================
// RENDERING DEL GRÁFICO (CHART.JS)
// ==========================================
function renderizarGraficoMultivariable(datosHistoricos) {
  const canvas = document.getElementById('graficoMultivariable');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const etiquetasHoras = datosHistoricos.map(d => {
    if (!d.fecha_hora) return '--:--';
    const f = new Date(d.fecha_hora);
    return `${f.getHours()}:${f.getMinutes().toString().padStart(2, '0')}`;
  });

  const datosSuelo = datosHistoricos.map(d => d.humedad_suelo);
  const datosAire = datosHistoricos.map(d => d.humedad_aire);
  const datosTemp = datosHistoricos.map(d => d.temperatura_aire);

  const esAlerta = document.body.classList.contains('alerta-emergencia');
  const colorTema = esAlerta ? '#ff3333' : '#00ff00';
  const colorGrid = esAlerta ? 'rgba(255, 51, 51, 0.15)' : 'rgba(0, 255, 0, 0.15)';

  if (graficoChart) {
    graficoChart.destroy();
  }

  graficoChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: etiquetasHoras,
      datasets: [
        {
          label: 'Hum. Suelo (%)',
          data: datosSuelo,
          borderColor: colorTema,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointBackgroundColor: colorTema,
          tension: 0.2
        },
        {
          label: 'Hum. Aire (%)',
          data: datosAire,
          borderColor: '#00ffff',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointBackgroundColor: '#00ffff',
          tension: 0.2
        },
        {
          label: 'Temp (°C)',
          data: datosTemp,
          borderColor: '#ffff00',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointBackgroundColor: '#ffff00',
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: colorTema, font: { family: 'VT323', size: 14 } },
          grid: { color: colorGrid }
        },
        y: {
          min: 0,
          max: 100,
          ticks: { color: colorTema, font: { family: 'VT323', size: 14 } },
          grid: { color: colorGrid }
        }
      }
    }
  });
}

// ==========================================
// FORMULARIO: CALIBRAR PLANTA PERSONALIZADA
// ==========================================
const formCustom = document.getElementById('form-planta-custom');
if (formCustom) {
  formCustom.addEventListener('submit', (e) => {
    e.preventDefault();

    const inputNombre = document.getElementById('custom-nombre');
    const inputMin = document.getElementById('custom-min');
    const inputMax = document.getElementById('custom-max');
    const feedback = document.getElementById('feedback-custom');

    const nombre = (inputNombre.value || '').trim() || 'PLANTA PERSONALIZADA';
    const minVal = parseFloat(inputMin.value);
    const maxVal = parseFloat(inputMax.value);

    // Validación rigurosa
    if (isNaN(minVal) || isNaN(maxVal)) {
      mostrarFeedback(feedback, 'ERROR: LOS UMBRALES DEBEN SER NÚMEROS VÁLIDOS', 'error');
      return;
    }

    if (minVal < 0 || maxVal > 100) {
      mostrarFeedback(feedback, 'ERROR: LOS VALORES DEBEN ESTAR ENTRE 0% Y 100%', 'error');
      return;
    }

    if (minVal >= maxVal) {
      mostrarFeedback(feedback, 'ERROR: LA HUMEDAD MÍNIMA DEBE SER MENOR A LA MÁXIMA', 'error');
      return;
    }

    // Actualización de configuración
    PLANTAS.personalizada = {
      nombre: nombre,
      minHumedad: minVal,
      maxHumedad: maxVal
    };
    PLANTAS.custom = PLANTAS.personalizada;

    try {
      localStorage.setItem('monitor_maceta_custom', JSON.stringify({
        nombre: nombre,
        minHumedad: minVal,
        maxHumedad: maxVal
      }));
    } catch (err) {
      console.warn("No se pudo guardar la configuración en localStorage:", err);
    }

    actualizarEtiquetaPersonalizada();
    actualizarResumenCustom();

    // Activar inmediatamente la planta personalizada en el selector
    const selectPlanta = document.getElementById('select-planta');
    if (selectPlanta) {
      selectPlanta.value = 'personalizada';
      try {
        localStorage.setItem('monitor_maceta_planta_seleccionada', 'personalizada');
      } catch (err) {}
    }

    // Re-evaluar estado y aplicar tema visual de inmediato
    evaluarEstadoPlanta();

    mostrarFeedback(feedback, `CONFIGURACIÓN GUARDADA // ${nombre.toUpperCase()} [${minVal}% - ${maxVal}%]`, 'exito');

    // Cambiar a la solapa de lectura actual tras breve confirmación
    setTimeout(() => {
      activarPestana('tab-actual');
    }, 1100);
  });
}

// ==========================================
// FORMULARIO: INGRESO MANUAL DE LECTURA
// ==========================================
const formManual = document.getElementById('form-medicion-manual');
if (formManual) {
  formManual.addEventListener('submit', async (e) => {
    e.preventDefault();

    const inputSuelo = document.getElementById('input-humedad-suelo');
    const inputTemp = document.getElementById('input-temp-aire');
    const inputAire = document.getElementById('input-humedad-aire');
    const feedback = document.getElementById('feedback-medicion');

    const hSuelo = parseFloat(inputSuelo.value);
    const tempAire = parseFloat(inputTemp.value);
    const hAire = parseFloat(inputAire.value);

    if (isNaN(hSuelo) || isNaN(tempAire) || isNaN(hAire)) {
      mostrarFeedback(feedback, 'ERROR: TODOS LOS VALORES DEBEN SER NÚMEROS', 'error');
      return;
    }

    mostrarFeedback(feedback, 'GUARDANDO MEDICIÓN...', 'info');

    // Actualizar visualmente la interfaz de inmediato
    document.getElementById('humedad-suelo').textContent = hSuelo;
    document.getElementById('temp-ambiente').textContent = tempAire;
    document.getElementById('humedad-aire').textContent = hAire;
    document.getElementById('fecha-lectura').textContent = new Date().toLocaleTimeString();

    evaluarEstadoPlanta(hSuelo);

    if (db) {
      try {
        const { error } = await db.from('mediciones').insert([{
          humedad_suelo: hSuelo,
          temperatura_aire: tempAire,
          humedad_aire: hAire,
          fecha_hora: new Date().toISOString()
        }]);

        if (error) {
          console.warn("Error al registrar en Supabase:", error);
          mostrarFeedback(feedback, `MEDICIÓN APLICADA LOCALMENTE (BD: ${error.message})`, 'error');
        } else {
          mostrarFeedback(feedback, 'MEDICIÓN GUARDADA EN LA NUBE CON ÉXITO', 'exito');
          // Recargar para actualizar gráfica con el nuevo punto
          setTimeout(obtenerMediciones, 1200);
        }
      } catch (err) {
        console.warn("Excepción de red en Supabase:", err);
        mostrarFeedback(feedback, 'MEDICIÓN APLICADA LOCALMENTE', 'info');
      }
    } else {
      mostrarFeedback(feedback, 'MEDICIÓN APLICADA LOCALMENTE', 'exito');
    }
  });
}

// ==========================================
// EVENTOS Y REFRESH AUTOMÁTICO
// ==========================================
const selectPlanta = document.getElementById('select-planta');
if (selectPlanta) {
  // Restaurar selección previa si existe
  try {
    const seleccionPrevia = localStorage.getItem('monitor_maceta_planta_seleccionada');
    if (seleccionPrevia && PLANTAS[seleccionPrevia]) {
      selectPlanta.value = seleccionPrevia;
    }
  } catch (err) {}

  selectPlanta.addEventListener('change', () => {
    try {
      localStorage.setItem('monitor_maceta_planta_seleccionada', selectPlanta.value);
    } catch (err) {}

    evaluarEstadoPlanta();
  });
}

const btnRecargar = document.getElementById('btn-recargar');
if (btnRecargar) {
  btnRecargar.addEventListener('click', obtenerMediciones);
}

// Inicialización de la aplicación
cargarConfiguracionCustom();
evaluarEstadoPlanta();
obtenerMediciones();

// Actualización automática cada 60 segundos
setInterval(obtenerMediciones, 60000);