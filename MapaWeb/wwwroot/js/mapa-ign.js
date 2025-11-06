
//  VARIABLES 

var map;
var marcadoresEnMapa = {}; // objeto para guardar los "pins"
var searchMarker = null;
var drawnItems = new L.FeatureGroup();
let estaCargando = false; // para evitar duplicados


//  INICIALIZACIÓN DEL MAPA

document.addEventListener("DOMContentLoaded", function () {

    // Coordenadas y zoom inicial.
    const latitud = -38.416097;
    const longitud = -63.616672;
    const zoom = 5;

    // Capa base IGN (tms).
    var argenmap = L.tileLayer('https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG%3A3857@png/{z}/{x}/{-y}.png', {
        attribution: '© <a href="https://www.ign.gob.ar/">IGN</a>',
        minZoom: 1,
        maxZoom: 20
    });

    // Capa satelital Esri.
    var mapaSatelital = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri'
    });

    // Mapa con capa por defecto y sin control de zoom por defecto.
    var baseMaps = {
        "Mapa Estándar (IGN)": argenmap,
        "Satelital (Esri)": mapaSatelital
    };

    // Crea el mapa en el div #mapaIGN
    map = L.map('mapaIGN', {
        center: [latitud, longitud],
        zoom: zoom,
        layers: [argenmap, drawnItems], 
        zoomControl: false
    });

    // Añade control de zoom en bottomright
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Añade control de capas en bottomleft.
    L.control.layers(baseMaps, null, { position: 'bottomleft' }).addTo(map);

    // Control geocoder restringido a Argentina
    var geocoder = L.Control.geocoder({
        defaultMarkGeocode: false,
        position: 'topleft',
        placeholder: 'Buscar calles o lugares...',
        geocoder: L.Control.Geocoder.nominatim({
            geocodingQueryParams: { countrycodes: 'ar' }
        })
    })
    .on('markgeocode', function(e) {
        var latlng = e.geocode.center;
        if (searchMarker) { map.removeLayer(searchMarker); }
        searchMarker = L.marker(latlng).addTo(map);
        searchMarker.bindPopup(e.geocode.name).openPopup();
        map.flyTo(latlng, 16);
        searchMarker.on('popupclose', function() { map.removeLayer(searchMarker); searchMarker = null; });
    })
    .addTo(map);

    // Router OSRM para rutas.
    var router = L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1', language: 'es', alternatives: false });

    // Rutas predefinidas (1, 2, 3) ...
    var ruta1 = L.Routing.control({
        waypoints: [ L.latLng(-34.6037, -58.3816), L.latLng(-31.4201, -64.1888) ],
        router: router, showAlternatives: false, fitSelectedRoutes: false, show: false, addWaypoints: false, draggableWaypoints: false,
        lineOptions: { styles: [{color: '#007bff', opacity: 0.8, weight: 6}] }
    }).addTo(map);

    var ruta2 = L.Routing.control({
        waypoints: [
            L.latLng(-34.6037, -58.3816), L.latLng(-34.5560, -59.1001), L.latLng(-34.1980, -60.7339),
            L.latLng(-33.1301, -64.3499), L.latLng(-31.4201, -64.1888)
        ],
        router: router, showAlternatives: false, fitSelectedRoutes: false, show: false, addWaypoints: false, draggableWaypoints: false,
        createMarker: function() { return null; },
        lineOptions: { styles: [{color: '#dc3545', opacity: 0.8, weight: 6}] }
    }).addTo(map);

     var ruta3 = L.Routing.control({
        waypoints: [
            L.latLng(-34.6037, -58.3816), L.latLng(-33.1473, -59.3041), L.latLng(-31.6157, -60.7048),
            L.latLng(-31.4201, -64.1888)
        ],
        router: router, showAlternatives: false, fitSelectedRoutes: false, show: false, addWaypoints: false, draggableWaypoints: false,
        createMarker: function() { return null; },
        lineOptions: { styles: [{color: '#dc3545', opacity: 0.8, weight: 6}] }
    }).addTo(map);


    // MENÚ DESPLEGABLE
    var rutasVisibles = true;
    var menuDesplegable = L.control({position: 'topright'});

    menuDesplegable.onAdd = function(map) {
        var div = L.DomUtil.create('div', 'leaflet-bar leaflet-control menu-desplegable');
        div.innerHTML = `
            <a href="#" class="menu-toggle" title="Menú de opciones">☰</a>
            <div class="menu-items">
                <button class="menu-item" id="btnRutas">🛣️ Mostrar/Ocultar Rutas</button>
            </div>
        `;
        div.querySelector('.menu-toggle').onclick = function(e) { L.DomEvent.stop(e); e.preventDefault(); div.classList.toggle('abierto'); };
        div.querySelector('#btnRutas').onclick = function(e) {
            L.DomEvent.stop(e);
            if (rutasVisibles) { map.removeControl(ruta1); map.removeControl(ruta2); map.removeControl(ruta3); rutasVisibles = false; }
            else { ruta1.addTo(map); ruta2.addTo(map); ruta3.addTo(map); rutasVisibles = true; }
        };
        return div;
    };
    menuDesplegable.addTo(map);

    //Carga del CRUD
    cargarMarcadores();
    cargarPoligonos();

    // Evento de DOBLE CLIC en el mapa (para crear marcadores)
    map.on('dblclick', function(e) {
        abrirPopupParaNuevoMarcador(e.latlng);
    });

    
    // 3. CONTROLES DE DIBUJO
    

    var drawControl = new L.Control.Draw({
        position: 'topleft',
        draw: {
            polygon: {
                shapeOptions: { color: '#f06' },
                allowIntersection: false,
                drawError: {
                    color: '#e1e100',
                    message: '<strong>Error:</strong> No podés cruzar las líneas!'
                },
            },
            polyline: false, rectangle: false, circle: false,
            marker: false, circlemarker: false
        },
        edit: {
            featureGroup: drawnItems
        }
    });
    map.addControl(drawControl);

    // Evento al CREAR un polígono
    map.on(L.Draw.Event.CREATED, function (event) {
        var layer = event.layer;
        
        var nombre = prompt("Ingresá un nombre para esta zona:");
        if (!nombre) return;
        var latLngs = layer.getLatLngs()[0];
        var coordenadas = latLngs.map(function(p) { return [p.lat, p.lng]; });
        guardarPoligono(nombre, coordenadas); // Llama a la API
    });

    // Evento al EDITAR polígonos
    map.on(L.Draw.Event.EDITED, function (e) {
        var layers = e.layers;
        layers.eachLayer(function (layer) {
            var data = layer.polygonData; 
            var latLngs = layer.getLatLngs()[0];
            var coords = latLngs.map(p => [p.lat, p.lng]); 

            // Llama a la API 
            guardarEdicionPoligono(data.id, data.nombre, coords);
        });
    });

    // Evento al BORRAR polígonos
    map.on(L.Draw.Event.DELETED, function (e) {
        var layers = e.layers;
        layers.eachLayer(function (layer) {
            var id = layer.polygonData.id; // Obtenemos el ID
            borrarPoligono(id); // Llama a la API
        });
    });
    
});




// FUNCIONES CRUD MARCADORES


// Carga marcadores desde la API y los muestra.
async function cargarMarcadores() {
    try {
        const response = await fetch('/api/marcadores');
        if (!response.ok) throw new Error('Error al cargar marcadores');
        const marcadores = await response.json();
        marcadores.forEach(function(marcador) { agregarMarcadorAlMapa(marcador); });
    } catch (error) { console.error("Error en cargarMarcadores:", error); }
}

// Crea un marker, le asigna datos y le pone popup con acciones.
function agregarMarcadorAlMapa(marcador) {
    const latLng = [marcador.latitud, marcador.longitud];
    var pin = L.marker(latLng).addTo(map);
    pin.markerData = { id: marcador.id, nombre: marcador.nombre, latitud: marcador.latitud, longitud: marcador.longitud };
    var popupContent = `
        <div id="popup-ver-${marcador.id}">
            <b>${marcador.nombre}</b>
            <br>
            <button class="btn-editar" onclick="mostrarFormularioEdicion(event, ${marcador.id})">Editar</button>
            <button class="btn-borrar" onclick="borrarMarcador(event, ${marcador.id})">Borrar</button>
        </div>
    `;
    pin.bindPopup(popupContent);
    marcadoresEnMapa[marcador.id] = pin;
}

// Abre popup para crear un nuevo marcador en la posición dada.
function abrirPopupParaNuevoMarcador(latlng) {
    var lat = latlng.lat.toFixed(6);
    var lng = latlng.lng.toFixed(6);
    var popupContent = `
        <div>
            <b>Nuevo Marcador</b><br>
            <small>Lat: ${lat}, Lng: ${lng}</small>
            <hr style="margin: 4px 0;">
            Nombre: <input type='text' id='inputNombreMarcador' />
            <br>
            <button onclick='guardarMarcador(event, ${latlng.lat}, ${latlng.lng})'>Guardar</button>
        </div>`;
    L.popup().setLatLng(latlng).setContent(popupContent).openOn(map);
}

// Envía POST para guardar marcador y lo agrega al mapa si OK.
async function guardarMarcador(event, lat, lng) {
    event.stopPropagation();
    const nombre = document.getElementById('inputNombreMarcador').value;
    if (!nombre) { alert('Por favor, ingresa un nombre.'); return; }
    const nuevoMarcador = { nombre: nombre, latitud: lat, longitud: lng };
    try {
        const response = await fetch('/api/marcadores', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(nuevoMarcador) });
        if (!response.ok) throw new Error('Error al guardar el marcador');
        const marcadorGuardado = await response.json();
        agregarMarcadorAlMapa(marcadorGuardado);
        map.closePopup();
    } catch (error) { console.error("Error en guardarMarcador:", error); alert('No se pudo guardar el marcador.'); }
}

// Elimina marcador en la API y lo quita del mapa local.
async function borrarMarcador(event, id) {
    event.stopPropagation();
    if (!confirm("¿Seguro que querés borrar este marcador?")) return;
    try {
        const response = await fetch(`/api/marcadores/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Error al borrar el marcador');
        var pin = marcadoresEnMapa[id];
        map.removeLayer(pin);
        delete marcadoresEnMapa[id];
        map.closePopup();
    } catch (error) { console.error("Error en borrarMarcador:", error); alert('No se pudo borrar el marcador.'); }
}

// Muestra formulario simple para editar el nombre del marcador.
function mostrarFormularioEdicion(event, id) {
    event.stopPropagation();
    var pin = marcadoresEnMapa[id];
    var data = pin.markerData;
    var formContent = `
        <div>
            <b>Editando:</b>
            <br>
            Nombre: <input type='text' id='inputEditarNombre-${id}' value='${data.nombre}' />
            <br>
            <button class="btn-guardar" onclick="guardarEdicion(event, ${id})">Guardar</button>
            <button onclick="cancelarEdicion(event, ${id})">Cancelar</button>
        </div>
    `;
    pin.setPopupContent(formContent);
}

// Restaura popup original si se cancela la edición.
function cancelarEdicion(event, id) {
    event.stopPropagation();
    var pin = marcadoresEnMapa[id];
    var data = pin.markerData;
    var popupContent = `
        <div id="popup-ver-${data.id}">
            <b>${data.nombre}</b>
            <br>
            <button class="btn-editar" onclick="mostrarFormularioEdicion(event, ${data.id})">Editar</button>
            <button class="btn-borrar" onclick="borrarMarcador(event, ${data.id})">Borrar</button>
        </div>
    `;
    pin.setPopupContent(popupContent);
}


// Envía PUT para actualizar el nombre y actualiza el popup local.
async function guardarEdicion(event, id) {
    event.stopPropagation();
    var pin = marcadoresEnMapa[id];
    var data = pin.markerData;
    var nuevoNombre = document.getElementById(`inputEditarNombre-${id}`).value;
    if (!nuevoNombre) { alert("El nombre no puede estar vacío."); return; }

    // Datos actualizados 
    var marcadorActualizado = {
        id: id,
        nombre: nuevoNombre,
        latitud: data.latitud,
        longitud: data.longitud
    };

    try {
        const response = await fetch(`/api/marcadores/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(marcadorActualizado)
        });

        if (!response.ok) throw new Error('Error al actualizar el marcador');

       
        pin.markerData.nombre = nuevoNombre;

        
        cancelarEdicion(event, id);

    } catch (error) {
        console.error("Error en guardarEdicion:", error);
        alert('No se pudo guardar la edición.');
    }
}


// ===================================================================
// 5. FUNCIONES CRUD POLÍGONOS
// ===================================================================

/**
 * Carga TODOS los polígonos desde la API.
 * Limpia la capa 'drawnItems' y los vuelve a dibujar.
 */
async function cargarPoligonos() {
    if (estaCargando) {
        console.warn("Carga de polígonos ya en progreso, frenando.");
        return;
    }
    estaCargando = true;

    try {
        drawnItems.clearLayers(); //Limpia antes de cargar

        const response = await fetch('/api/poligonos');
        if (!response.ok) throw new Error('Error al cargar polígonos');

        const poligonos = await response.json();

        poligonos.forEach(function(poligono) {
            // Damos vuelta [lon, lat] a [lat, lon]
            var coordenadasLeaflet = poligono.geometria.coordinates[0].map(function(p) {
                return [p[1], p[0]];
            });

            var polyLayer = L.polygon(coordenadasLeaflet, { color: '#f06' });

            // a. Guardamos los datos en la capa
            polyLayer.polygonData = poligono;

            // b. Creamos el popup interactivo
            const popupContent = `
                <div>
                    <strong>Editar Polígono</strong>
                    <br>
                    <label for="input-nombre-${poligono.id}">Nombre:</label>
                    <input type="text"
                           id="input-nombre-${poligono.id}"
                           value="${poligono.nombre}"
                           style="width: 150px; margin-top: 5px;">
                    <br>
                    <button onclick="handleUpdateNombre(${poligono.id})"
                             class="btn-guardar" style="margin-right: 5px;">
                        Guardar
                    </button>
                    <button onclick="handleDelete(${poligono.id})"
                             class="btn-borrar">
                        Borrar
                    </button>
                </div>
            `;
            polyLayer.bindPopup(popupContent);

            // c. Lo agregamos a la capa "drawnItems"
            drawnItems.addLayer(polyLayer);
        });

    } catch (error) {
        console.error("Error en cargarPoligonos:", error);
    } finally {
        estaCargando = false; // Liberamos la bandera
    }
}

/**
 * Se llama desde el botón "Guardar" del popup del polígono.
 */
async function handleUpdateNombre(id) {
    const inputId = `input-nombre-${id}`;
    const nuevoNombre = document.getElementById(inputId).value;

    if (!nuevoNombre || nuevoNombre.trim() === "") {
        alert("El nombre no puede estar vacío.");
        return;
    }

    // Encontrar la capa para sacar sus coordenadas
    let layerAEditar = null;
    drawnItems.eachLayer(layer => {
        if (layer.polygonData && layer.polygonData.id === id) {
            layerAEditar = layer;
        }
    });

    if (!layerAEditar) {
        console.error("No se encontró la capa para editar.");
        return;
    }

    // Obtenemos las coordenadas 
    const coordenadas = layerAEditar.getLatLngs()[0].map(p => [p.lat, p.lng]);

    // Llamamos a la función de la API
    await guardarEdicionPoligono(id, nuevoNombre, coordenadas);

    layerAEditar.closePopup();
}

/**
 *Se llama desde el botón "Borrar" del popup del polígono.
 */
async function handleDelete(id) {
    if (confirm('¿Estás seguro que querés borrar este polígono?')) {
        await borrarPoligono(id);
    }
}

/**
 * (API) Guarda un polígono NUEVO (llamado desde L.Draw.Event.CREATED)
 */
async function guardarPoligono(nombre, coordenadas) {
    const nuevoPoligono = {
        nombre: nombre,
        coordenadas: coordenadas
    };

    try {
        const response = await fetch('/api/poligonos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoPoligono)
        });

        if (!response.ok) throw new Error('Error al guardar el polígono');

        await cargarPoligonos(); // Recarga todo
    } catch (error) {
        console.error("Error en guardarPoligono:", error);
        alert('No se pudo guardar el polígono.');
    }
}

/**
 * (API) Actualiza un polígono EXISTENTE
 */
async function guardarEdicionPoligono(id, nombre, coordenadas) {
    const poligonoActualizado = {
        nombre: nombre,
        coordenadas: coordenadas
    };

    try {
        const response = await fetch(`/api/poligonos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(poligonoActualizado)
        });

        if (!response.ok) throw new Error('Error al actualizar en la API');

        await cargarPoligonos(); // Recargamos todo
    } catch (error) {
        console.error("Error en guardarEdicionPoligono:", error);
        alert('No se pudieron guardar los cambios.');
    }
}

/**
 * (API) Borra un polígono EXISTENTE
 */
async function borrarPoligono(id) {
    try {
        const response = await fetch(`/api/poligonos/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Error al borrar el polígono');

        await cargarPoligonos(); // Recarga todo
    } catch (error) {
        console.error("Error en borrarPoligono:", error);
        alert('No se pudo borrar el polígono.');
    }
}