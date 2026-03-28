let map, directionsService, directionsRenderer;
let distancia, tiempo, costo;

const tarifaKm = 0.50; // tarifa Ecuador

function initMap() {
    const centro = {
        lat: -2.19616,
        lng: -79.88621
    }; // Guayaquil aprox

    map = new google.maps.Map(document.getElementById("map"), {
        center: centro,
        zoom: 13
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map
    });

    const origenInput = new google.maps.places.Autocomplete(document.getElementById("origen"));
    const destinoInput = new google.maps.places.Autocomplete(document.getElementById("destino"));

    origenInput.addListener("place_changed", calcular);
    destinoInput.addListener("place_changed", calcular);
}

function calcular() {
    const origen = document.getElementById("origen").value;
    const destino = document.getElementById("destino").value;

    if (!origen || !destino) return;

    directionsService.route({
        origin: origen,
        destination: destino,
        travelMode: "DRIVING"
    }, (res, status) => {
        if (status !== "OK") {
            alert("Error calculando ruta: " + status);
            return;
        }

        directionsRenderer.setDirections(res);

        const leg = res.routes[0].legs[0];

        distancia = leg.distance.text;
        tiempo = leg.duration.text;

        const km = leg.distance.value / 1000;
        costo = (km * tarifaKm).toFixed(2);

        document.getElementById("dist").innerText = "Distancia: " + distancia;
        document.getElementById("time").innerText = "Tiempo: " + tiempo;
        document.getElementById("price").innerText = costo;

        document.getElementById("info").style.display = "block";
    });
}

function enviar() {
    const origen = document.getElementById("origen").value;
    const destino = document.getElementById("destino").value;

    if (!origen || !destino) {
        alert("Completa la ruta");
        return;
    }

    const telefono = "593997756470";

    const msg = `🚖 NUEVA CARRERA
Origen: ${origen}
Destino: ${destino}
Distancia: ${distancia}
Tiempo: ${tiempo}
Costo: $${costo}`;

    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(msg)}`);
}
