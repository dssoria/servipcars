let map, directionsService, directionsRenderer;
let origenPlace = null,
    destinoPlace = null;
let geocoder;
let distancia = '',
    tiempo = '';
let costoFinalCalculado = 2.50;
let origenValido = false;
let destinoValido = false;
const tarifaBase = 0.50;
let marcadores = {}; // Almacenar referencias a los marcadores

/**
 * Inicializa el mapa de Google Maps y configura los servicios de direcciones y autocompletado
 * Se ejecuta automáticamente cuando la API de Google Maps está lista
 */
function initMap() {
    geocoder = new google.maps.Geocoder();
    const centro = {
        lat: -2.19616,
        lng: -79.88621
    };

    map = new google.maps.Map(document.getElementById("map"), {
        center: centro,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        draggable: false,
        suppressMarkers: true, // ✓ CAMBIO: Suprimimos los marcadores de DirectionsRenderer
        polylineOptions: {
            strokeColor: '#007bff',
            strokeWeight: 5
        }
    });

    const options = {
        componentRestrictions: {
            country: "ec"
        },
        types: ['geocode', 'establishment'],
        language: 'es-EC'
    };

    const origenAuto = new google.maps.places.Autocomplete(document.getElementById("origen"), options);
    const destinoAuto = new google.maps.places.Autocomplete(document.getElementById("destino"), options);

    // Origen - Autocomplete
    origenAuto.addListener("place_changed", () => {
        origenPlace = origenAuto.getPlace();

        if (origenPlace.geometry && origenPlace.formatted_address) {
            origenValido = true;
            crearMarker(origenPlace.geometry.location, 'A', 'origen'); // Changed 'origen' to 'A'
            calcularRuta();
        } else {
            origenValido = false;
        }
    });

    // Destino - Autocomplete
    destinoAuto.addListener("place_changed", () => {
        destinoPlace = destinoAuto.getPlace();

        if (destinoPlace.geometry && destinoPlace.formatted_address) {
            destinoValido = true;
            crearMarker(destinoPlace.geometry.location, 'B', 'destino'); // Changed 'destino' to 'B'
            calcularRuta();
        } else {
            destinoValido = false;
        }
    });
}

/**
 * Crea marcadores personalizados en el mapa con etiquetas (A para origen, B para destino)
 * @param {Object} location - Coordenadas del marcador (lat, lng)
 * @param {string} label - Etiqueta del marcador ('A' o 'B')
 * @param {string} tipo - Tipo de ubicación ('origen' o 'destino')
 */
function crearMarker(location, label, tipo) {
    // Limpiar marcador anterior si existe
    if (marcadores[label]) {
        marcadores[label].setMap(null);
    }

    const colores = {
        'origen': '#28a745', // Verde para origen
        'destino': '#dc3545' // Rojo para destino
    };

    const marcador = new google.maps.Marker({
        position: location,
        map: map,
        icon: {
            // Este "path" es la forma de una gota/pin clásica
            path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
            fillColor: colores[tipo], // Aquí ya usará el verde o rojo
            fillOpacity: 1,
            strokeWeight: 1.5,
            strokeColor: "#ffffff",
            scale: 2, // Ajusta el tamaño aquí (1.5 a 2.5 suele ser ideal)
            anchor: new google.maps.Point(12, 22), // Centra la punta del pin en la coordenada
            labelOrigin: new google.maps.Point(12, 9) // Centra la letra (A o B) dentro de la cabeza del pin
        },
        label: {
            text: label,
            color: "white",
            fontSize: "16px",
            fontWeight: "bold"
        },
        draggable: true,
        title: tipo === 'origen' ? 'Origen' : 'Destino'
    });

    // Evento cuando se arrastra el marcador
    marcador.addListener('dragend', () => {
        const nuevaUbicacion = marcador.getPosition();

        if (tipo === 'origen') {
            origenPlace = {
                geometry: {
                    location: nuevaUbicacion
                }
            };
            // Obtener la dirección desde las coordenadas
            geocoder.geocode({
                location: nuevaUbicacion
            }, (results, status) => {
                if (status === "OK" && results[0]) {
                    document.getElementById("origen").value = results[0].formatted_address;
                }
            });
        } else if (tipo === 'destino') {
            destinoPlace = {
                geometry: {
                    location: nuevaUbicacion
                }
            };
            // Obtener la dirección desde las coordenadas
            geocoder.geocode({
                location: nuevaUbicacion
            }, (results, status) => {
                if (status === "OK" && results[0]) {
                    document.getElementById("destino").value = results[0].formatted_address;
                }
            });
        }

        map.setCenter(nuevaUbicacion);
        calcularRuta();
    });

    marcadores[label] = marcador;
    map.setCenter(location);
    map.setZoom(15);
}

/**
 * Gestiona el evento de limpieza del campo de origen
 */
document.getElementById("clearOrigen").addEventListener("click", () => {
    document.getElementById("origen").value = "";
    origenPlace = null;
    origenValido = false;
    if (marcadores['origen']) {
        marcadores['origen'].setMap(null);
        marcadores['origen'] = null;
    }
    limpiarInfoRuta();
});

/**
 * Gestiona el evento de limpieza del campo de destino
 */
document.getElementById("clearDestino").addEventListener("click", () => {
    document.getElementById("destino").value = "";
    destinoPlace = null;
    destinoValido = false;
    if (marcadores['destino']) {
        marcadores['destino'].setMap(null);
        marcadores['destino'] = null;
    }
    limpiarInfoRuta();
});

/**
 * Gestiona el evento del botón para obtener la ubicación actual del usuario
 */
document.getElementById("btnMiUbicacion").addEventListener("click", () => {
    navigator.geolocation.getCurrentPosition(pos => {
        const location = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
        };

        geocoder.geocode({
            location
        }, (results, status) => {
            if (status === "OK" && results[0]) {
                const direccion = results[0].formatted_address;

                document.getElementById("origen").value = direccion;
                origenPlace = {
                    geometry: {
                        location
                    }
                };

                origenValido = true;
                crearMarker(location, 'A', 'origen'); // Changed 'origen' to 'A'
                calcularRuta();
            }
        });
    }, () => {
        alert("No se pudo obtener tu ubicación. Por favor activa el GPS.");
    });
});

/**
 * Detecta cambios manuales en el campo de origen y limpia si está vacío
 */
document.getElementById("origen").addEventListener("input", function() {
    if (this.value.trim() === "") {
        origenValido = false;
        origenPlace = null;
        if (marcadores['origen']) {
            marcadores['origen'].setMap(null);
            marcadores['origen'] = null;
        }
        limpiarInfoRuta();
    }
});

/**
 * Detecta cambios manuales en el campo de destino y limpia si está vacío
 */
document.getElementById("destino").addEventListener("input", function() {
    if (this.value.trim() === "") {
        destinoValido = false;
        destinoPlace = null;
        if (marcadores['destino']) {
            marcadores['destino'].setMap(null);
            marcadores['destino'] = null;
        }
        limpiarInfoRuta();
    }
});

/**
 * Calcula la ruta entre el origen y destino usando Google Directions API
 * Actualiza el mapa con la ruta e información de distancia y tiempo
 */
function calcularRuta() {
    if (!origenPlace?.geometry || !destinoPlace?.geometry) return;
    const ahora = new Date();

    directionsService.route({
        origin: origenPlace.geometry.location,
        destination: destinoPlace.geometry.location,
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
            departureTime: ahora,
            trafficModel: google.maps.TrafficModel.BEST_GUESS
        }
    }, (response, status) => {
        if (status === "OK") {
            directionsRenderer.setDirections(response);
            actualizarInfoDesdeRuta(response);
        } else {
            console.error("Error al calcular la ruta:", status);
            alert("No se pudo calcular la ruta. Por favor verifica las direcciones.");
        }
    });
}

/**
 * Procesa la respuesta de la ruta y actualiza la información de distancia, tiempo y costo
 * Aplica incremento de tarifa en horas pico
 * @param {Object} response - Respuesta del servicio de direcciones de Google
 */
function actualizarInfoDesdeRuta(response) {
    const leg = response.routes[0].legs[0];
    distancia = leg.distance.text;
    if (leg.duration_in_traffic) {
        tiempo = leg.duration_in_traffic.text;
    } else {
        tiempo = leg.duration.text;
    }
    const km = leg.distance.value / 1000;

    let costo = km * tarifaBase;
    costo = Math.ceil(costo / 0.5) * 0.5;
    if (costo < 2.50) costo = 2.50;

    const ahora = new Date();
    const diaSemana = ahora.getDay();
    const horaDecimal = ahora.getHours() + ahora.getMinutes() / 60;
    const esDiaLaboral = (diaSemana >= 1 && diaSemana <= 5);

    const esHoraPico = esDiaLaboral &&
    ((horaDecimal >= 6 && horaDecimal <= 9.5) ||
        (horaDecimal >= 16.25 && horaDecimal <= 19));

    let costoFinal = costo;
    let mensajeHora = "";

    if (esHoraPico) {
        costoFinal = costo * 1.2;
        costoFinal = Math.ceil(costoFinal / 0.5) * 0.5;
        mensajeHora = "🟡 Hora Pico - Lunes a Viernes";
    }

    costoFinalCalculado = costoFinal;

    document.getElementById("dist").innerText = distancia;
    document.getElementById("time").innerHTML = tiempo;
    document.getElementById("costoInput").value = costoFinal.toFixed(2);
    document.getElementById("infoHora").innerHTML = mensajeHora;
    document.getElementById("info").classList.remove("d-none");
}

/**
 * Genera un código de seguimiento aleatorio de 4 dígitos para la carrera
 * @returns {number} Código aleatorio entre 1000 y 9999
 */
function generarCodigoSeguimiento() {
    return Math.floor(1000 + Math.random() * 9000);
}

/**
 * Limpia toda la información de la ruta y reinicia los valores por defecto
 * Oculta la información mostrada y elimina la ruta del mapa
 */
function limpiarInfoRuta() {
    distancia = '';
    tiempo = '';
    costoFinalCalculado = 2.50;

    document.getElementById("dist").innerText = "—";
    document.getElementById("time").innerText = "—";
    document.getElementById("costoInput").value = "2.50";

    document.getElementById("info").classList.add("d-none");

    if (directionsRenderer) {
        directionsRenderer.setDirections({
            routes: []
        });
    }

    const btnConfirmarCosto = document.getElementById("btnConfirmarCosto");
    if (btnConfirmarCosto) btnConfirmarCosto.classList.add("d-none");
}

// ==================== GESTIÓN DE COSTO EDITABLE ====================

const costoInput = document.getElementById("costoInput");
const btnConfirmarCosto = document.getElementById("btnConfirmarCosto");

let costoFueEditado = false;

/**
 * Muestra el botón de confirmar costo cuando el usuario hace foco en el campo
 */
costoInput.addEventListener("focus", function() {
    btnConfirmarCosto.classList.remove("d-none");
});

/**
 * Valida el costo mientras se escribe: mínimo $2.50 y máximo $999.00
 * Muestra indicadores visuales de validación en el campo
 */
costoInput.addEventListener("input", function() {
    const valor = parseFloat(this.value);

    if (!isNaN(valor)) {
        costoFueEditado = true;

        if (valor < 2.50) {
            this.style.borderColor = "#dc3545";
        } else if (valor > 999) {
            this.style.borderColor = "#dc3545";
        } else {
            this.style.borderColor = "";
        }

        btnConfirmarCosto.classList.remove("d-none");
    }
});

/**
 * Confirma y guarda el costo editado por el usuario
 * Valida que esté entre $2.50 y $999.00
 */
btnConfirmarCosto.addEventListener("click", function() {
    let valor = parseFloat(costoInput.value);

    if (isNaN(valor) || valor < 2.50) {
        alert("❌ El costo mínimo permitido es $2.50");
        costoInput.value = "2.50";
        costoFinalCalculado = 2.50;
        btnConfirmarCosto.classList.add("d-none");
        return;
    }

    if (valor > 999) {
        alert("❌ El costo máximo permitido es $999.00");
        costoInput.value = "999.00";
        valor = 999;
    }

    valor = Math.round(valor * 100) / 100;
    costoInput.value = valor.toFixed(2);
    costoFinalCalculado = valor;

    btnConfirmarCosto.classList.add("d-none");

    costoInput.style.borderColor = "#198754";
    setTimeout(() => {
        costoInput.style.borderColor = "";
    }, 1500);
});

/**
 * Normaliza el valor del costo cuando el usuario sale del campo
 * Asegura que esté dentro del rango permitido y con dos decimales
 */
costoInput.addEventListener("blur", function() {
    let valor = parseFloat(this.value);

    if (!isNaN(valor)) {
        if (valor < 2.50) valor = 2.50;
        if (valor > 999) valor = 999;

        valor = Math.round(valor * 100) / 100;
        this.value = valor.toFixed(2);
        costoFinalCalculado = valor;
        btnConfirmarCosto.classList.add("d-none");
    }
});

// ==================== GESTIÓN DE MENSAJES Y NOTIFICACIONES ====================

const ayudaWhatsApp = document.getElementById("ayudaWhatsApp");

/**
 * Muestra un mensaje de ayuda sobre cómo contactar por WhatsApp
 * El mensaje desaparece automáticamente después de 3 segundos
 */
function mostrarAyudaWhatsApp() {
    ayudaWhatsApp.style.display = "block";

    setTimeout(() => {
        ayudaWhatsApp.style.display = "none";
    }, 3000);
}

setTimeout(() => {
    mostrarAyudaWhatsApp();
}, 1000);

/**
 * Obtiene la jerarquía inmediata: Premise > Neighborhood > Sublocality_level_1
 * @param {string} address - Dirección o código plus (ej: "Mall del sur, Guayaquil, Ecuador")
 * @returns {Promise<string>}
 */
async function getImmediateLocationHierarchy(address) {
    
    if (!google || !google.maps || !google.maps.Geocoder) {
        console.error("Google Maps API no está cargada");
        return "Error: Google Maps no cargado";
    }

    const geocoder = new google.maps.Geocoder();

    try {
        const response = await new Promise((resolve, reject) => {
            geocoder.geocode({ address: address }, (results, status) => {
                if (status === "OK") {
                    resolve(results);
                } else {
                    reject(status);
                }
            });
        });

        const components = response[0].address_components;

        let premise = null;
        let neighborhood = null;
        let sublocality = null;

        for (const component of components) {
            const types = component.types;

            if (types.includes("premise")) {
                premise = component.long_name;
            } else if (types.includes("neighborhood")) {
                neighborhood = component.long_name;
            } else if (types.includes("sublocality_level_1")) {
                sublocality = component.long_name;
            }
        }

        // Prioridad: premise → neighborhood → sublocality_level_1
        if (premise) return premise;
        if (neighborhood) return neighborhood;
        if (sublocality) return sublocality;

        return "Sin información";

    } catch (status) {
        console.error("Geocoder error:", status);
        return `Error: ${status}`;
    }
}

/**
 * Gestiona el evento de envío de la carrera por WhatsApp
 * Valida que origen y destino sean válidos y construye el mensaje con toda la información
 * Abre WhatsApp con el mensaje precompuesto
 */
document.getElementById("btnEnviar").addEventListener("click", async() => {
    const origenTxt = document.getElementById("origen").value.trim();
    const destinoTxt = document.getElementById("destino").value.trim();
    const metodoPago = document.querySelector('input[name="metodoPago"]:checked').value;

    if (!origenTxt || !destinoTxt) {
        alert("❌ Por favor completa los campos de Origen y Destino");
        return;
    }

    if (!origenValido) {
        alert("❌ Origen inválido.\n\nPor favor seleccione un punto de referencia cercano y luego mueva el pin (A) al lugar correcto.");
        return;
    }

    if (!destinoValido) {
        alert("❌ Destino inválido.\n\nPor favor seleccione un punto de referencia cercano y luego mueva el pin (B) al lugar correcto.");
        return;
    }

    let orX = "";
    let deX = "";
    try {
        orX = await getImmediateLocationHierarchy(origenTxt);
        deX = await getImmediateLocationHierarchy(destinoTxt);
        
        console.log("Origen obtenido:", orX);
        console.log("Destino obtenido:", deX);
    } catch (error) {
        console.error("Error al obtener las jerarquías de ubicación:", error);
        alert("❌ Ocurrió un error al procesar las direcciones. Inténtalo de nuevo.");
        return; // Detiene la ejecución si falla la API externa
    }        

    const codigo = generarCodigoSeguimiento();
    const rutaUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origenTxt)}&destination=${encodeURIComponent(destinoTxt)}&travelmode=driving`;
    
    const mensaje = `*SERVIPCARS.A - CARRERA #${codigo}*\n\n` +
    `📍 *Origen:* ${orX}\n` +
    `🏁 *Destino:* ${deX}\n` +
    `📏 *Distancia:* ${distancia || '—'}\n` +
    `⏱️ *Duración:* ${tiempo || '—'}\n` +
    `💰 *Precio:* $${costoFinalCalculado.toFixed(2)}\n` +
    `💳 *Pago:* ${metodoPago}\n\n` +
    `🗺️ *Ver ruta en Google Maps:* ${rutaUrl}`;

    window.open(`https://wa.me/593991874475?text=${encodeURIComponent(mensaje)}`, '_blank');
});
