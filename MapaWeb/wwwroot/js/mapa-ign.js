var map;
var router;
var controlRutaDinamica = null;
var marcadoresEnMapa = {}; // objeto para guardar los "pins"
var marcadoresGroup = new L.FeatureGroup();
var searchMarker = null;
var drawnItems = new L.FeatureGroup();
let estaCargando = false; // para evitar duplicados
var mainGeocoderService;
var panelRutaDiv = null;
var ubicacionActualMarker = null;
var watchId = null;


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
        layers: [argenmap, drawnItems, marcadoresGroup], 
        zoomControl: false
    });

    // Añade control de zoom en bottomright
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Añade control de capas en bottomleft.
    L.control.layers(baseMaps, null, { position: 'bottomleft' }).addTo(map);

   

    // Control geocoder restringido a Argentina
    mainGeocoderService = new L.Control.Geocoder.nominatim({
        geocodingQueryParams: { countrycodes: 'ar' }
    });

    // 2. Creamos el CONTROL (la UI) y le pasamos el servicio que acabamos de crear
    var geocoder = L.Control.geocoder({
        defaultMarkGeocode: false,
        position: 'topleft',
        placeholder: 'Buscar calles o lugares...',
        geocoder: mainGeocoderService // <-- Le pasamos la variable global
    })
        .on('markgeocode', function (e) {
    // --- *** FIN DEL CAMBIO *** ---
        
            var latlng = e.geocode.center;
            var nombreLugar = e.geocode.name;

            if (searchMarker) { map.removeLayer(searchMarker); }

            searchMarker = L.marker(latlng).addTo(map);

            var nombreEscapado = nombreLugar.replace(/'/g, "\\'");

            var popupContent = `
        <b>${nombreLugar}</b>
        <br>
        <button class="btn-indicaciones" 
                onclick="iniciarRuta(${latlng.lat}, ${latlng.lng}, '${nombreEscapado}')"
                style="margin-top: 8px; padding: 5px; cursor: pointer;">
            📍 Indicaciones
        </button>
    `;

            searchMarker.bindPopup(popupContent).openPopup();

            map.flyTo(latlng, 16, {
                duration: 0.5 
            });

            searchMarker.on('popupclose', function () {
                if (searchMarker) {
                    map.removeLayer(searchMarker);
                    searchMarker = null;
                }
            });
        })
        .addTo(map);

    // Router OSRM para rutas.
    router = L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1', language: 'es', alternatives: false });

    // Rutas predefinidas (1, 2, 3)
    var ruta1 = L.Routing.control({
        waypoints: [
            L.latLng(-34.6037, -58.3816),
            L.latLng(-31.4201, -64.1888)
        ],
        router: router, showAlternatives: false, fitSelectedRoutes: false, show: false, addWaypoints: false, draggableWaypoints: false,
        lineOptions: { styles: [{color: '#007bff', opacity: 0.8, weight: 6}] }
    }).addTo(map);

    var ruta2 = L.Routing.control({
        waypoints: [
            L.latLng(-34.6037, -58.3816),
            L.latLng(-34.5560, -59.1001),
            L.latLng(-34.1980, -60.7339),
            L.latLng(-33.1301, -64.3499),
            L.latLng(-31.4201, -64.1888)
        ],
        router: router, showAlternatives: false, fitSelectedRoutes: false, show: false, addWaypoints: false, draggableWaypoints: false,
        createMarker: function() { return null; },
        lineOptions: { styles: [{color: '#dc3545', opacity: 0.8, weight: 6}] }
    }).addTo(map);

     var ruta3 = L.Routing.control({
        waypoints: [
            L.latLng(-34.6037, -58.3816),
            L.latLng(-33.1473, -59.3041),
            L.latLng(-31.6157, -60.7048),
            L.latLng(-31.4201, -64.1888)
        ],
        router: router, showAlternatives: false, fitSelectedRoutes: false, show: false, addWaypoints: false, draggableWaypoints: false,
        createMarker: function() { return null; },
        lineOptions: { styles: [{color: '#dc3545', opacity: 0.8, weight: 6}] }
    }).addTo(map);


    // ===================================================================
    // MENÚ DESPLEGABLE 
    // ===================================================================
    var rutasVisibles = true;
    var marcadoresVisibles = true;
    var poligonosVisibles = true;
    var menuDesplegable = L.control({ position: 'topright' });

    menuDesplegable.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'leaflet-bar leaflet-control menu-desplegable');

       
        div.innerHTML = `
            <a href="#" class="menu-toggle" title="Menú de opciones">☰</a>
            <div class="menu-items">
                <div class="menu-item-checkbox">
                    <input type="checkbox" id="checkMarcadores" checked>
                    <label for="checkMarcadores">📍 Mostrar Marcadores</label>
                </div>
                <div class="menu-item-checkbox">
                    <input type="checkbox" id="checkPoligonos" checked>
                    <label for="checkPoligonos">📐 Mostrar Polígonos</label>
                </div>
                <div class="menu-item-checkbox">
                    <input type="checkbox" id="checkRutas" checked>
                    <label for="checkRutas">🛣️ Mostrar Rutas</label>
                </div>
            </div>
        `;
        

        // Toggle para abrir/cerrar
        div.querySelector('.menu-toggle').onclick = function (e) {
            L.DomEvent.stop(e);
            e.preventDefault();
            div.classList.toggle('abierto');
        };

        // Evita que el menú se cierre al hacer clic dentro de los items
        L.DomEvent.on(div.querySelector('.menu-items'), 'click', L.DomEvent.stopPropagation);
        L.DomEvent.on(div.querySelector('.menu-items'), 'dblclick', L.DomEvent.stopPropagation);


       

        // Checkbox de Marcadores
        div.querySelector('#checkMarcadores').onchange = function () {
            if (this.checked) {
                map.addLayer(marcadoresGroup);
                marcadoresVisibles = true;
            } else {
                map.removeLayer(marcadoresGroup);
                marcadoresVisibles = false;
            }
            localStorage.setItem('mapaVerMarcadores', this.checked);
        };

        // Checkbox de Polígonos
        div.querySelector('#checkPoligonos').onchange = function () {
            if (this.checked) {
                map.addLayer(drawnItems);
                poligonosVisibles = true;
            } else {
                map.removeLayer(drawnItems);
                poligonosVisibles = false;
            }
            localStorage.setItem('mapaVerPoligonos', this.checked);
        };

        // Checkbox de Rutas
        div.querySelector('#checkRutas').onchange = function () {
            if (this.checked) {
                ruta1.addTo(map);
                ruta2.addTo(map);
                ruta3.addTo(map);
                rutasVisibles = true;
            } else {
                map.removeControl(ruta1);
                map.removeControl(ruta2);
                map.removeControl(ruta3);
                rutasVisibles = false;
            }
            localStorage.setItem('mapaVerRutas', this.checked);
        };
        

        return div;
    };
    menuDesplegable.addTo(map);


    function restaurarEstadoCapas() {
        // Restaurar Marcadores
        const verMarcadores = localStorage.getItem('mapaVerMarcadores');
        if (verMarcadores !== null) { // Solo si ya hay un valor guardado
            const isChecked = (verMarcadores === 'true'); // Convertir string a boolean

            document.getElementById('checkMarcadores').checked = isChecked;
            if (!isChecked) {
                map.removeLayer(marcadoresGroup);
                marcadoresVisibles = false; // Sincroniza la variable global
            }
        }
        // Si es null, no hace nada (se queda 'true' por defecto)

        // 2. Restaurar Polígonos
        const verPoligonos = localStorage.getItem('mapaVerPoligonos');
        if (verPoligonos !== null) {
            const isChecked = (verPoligonos === 'true');

            document.getElementById('checkPoligonos').checked = isChecked;
            if (!isChecked) {
                map.removeLayer(drawnItems);
                poligonosVisibles = false;
            }
        }

        // 3. Restaurar Rutas
        const verRutas = localStorage.getItem('mapaVerRutas');
        if (verRutas !== null) {
            const isChecked = (verRutas === 'true');

            document.getElementById('checkRutas').checked = isChecked;
            if (!isChecked) {
                map.removeControl(ruta1);
                map.removeControl(ruta2);
                map.removeControl(ruta3);
                rutasVisibles = false;
            }
        }
    }

    restaurarEstadoCapas();
    //Carga del CRUD
    cargarMarcadores();
    cargarPoligonos();

    // DOBLE CLIC para crear marcadores
    map.on('dblclick', function(e) {
        abrirPopupParaNuevoMarcador(e.latlng);
    });

    
    // CONTROLES DE DIBUJO
    

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
            borrarPoligono(id); 
        });
    });
    
});


window.controlRutaDinamica = window.controlRutaDinamica || null;
window.searchMarker = window.searchMarker || null;

window.iniciarRuta = function (destLat, destLng, nombreDestino) {
    console.log("iniciarRuta llamada:", destLat, destLng, nombreDestino);

    
    if (window.controlRutaDinamica) {
        try {
            map.removeControl(window.controlRutaDinamica);
        } catch (e) {
            console.warn('Error removiendo controlRutaDinamica:', e);
        }
        window.controlRutaDinamica = null;
    }

  
    if (window.searchMarker) {
        try {
            map.removeLayer(window.searchMarker);
        } catch (e) {
            console.warn('Error removiendo searchMarker:', e);
        }
        window.searchMarker = null;
    }

    //  popup para elegir origen
    mostrarOpcionesOrigen(destLat, destLng, nombreDestino);
}
/**
 * Muestra un popup con opciones para elegir el origen de la ruta
 */
function mostrarOpcionesOrigen(destLat, destLng, nombreDestino) {
    const safeName = nombreDestino ? nombreDestino.replace(/'/g, "\\'") : '';

   
    let opcionesMarcadores = '<option value="">-- Elegí un marcador guardado --</option>';
    const marcadores = Object.values(marcadoresEnMapa); // Usa la variable global

    if (marcadores.length > 0) {
        
        marcadores.sort((a, b) => a.markerData.nombre.localeCompare(b.markerData.nombre));

        marcadores.forEach(pin => {
            const data = pin.markerData;
           
            const nombreHtml = data.nombre.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            opcionesMarcadores += `<option value="${data.id}">${nombreHtml}</option>`;
        });
    } else {
        opcionesMarcadores = '<option value="" disabled>No tenés marcadores guardados</option>';
    }
  


    const popupContent = `
        <div style="padding: 10px; min-width: 240px;">
            <h4 style="margin-top: 0;">📍 ¿Desde dónde salís?</h4>
            
            <button onclick="usarUbicacionActual(${destLat}, ${destLng}, '${safeName}')" 
                    style="width: 100%; padding: 10px; margin-bottom: 8px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 4px;">
                📍 Mi ubicación actual
            </button>
            
            <button onclick="elegirOtroPunto(${destLat}, ${destLng}, '${safeName}')" 
                    style="width: 100%; padding: 10px; margin-bottom: 8px; cursor: pointer; background: #28a745; color: white; border: none; border-radius: 4px;">
                🔍 Indicar origen (Buscar)
            </button>

            <div style="margin-top: 8px; border-top: 1px solid #ddd; padding-top: 10px;">
                <select id="select-marcador-origen" 
                        style="width: 100%; padding: 8px; margin-bottom: 8px; border: 1px solid #ccc; border-radius: 4px; background: white;">
                    ${opcionesMarcadores}
                </select>
                <button onclick="usarMarcadorSeleccionado(${destLat}, ${destLng}, '${safeName}')" 
                        style="width: 100%; padding: 10px; cursor: pointer; background: #ffc107; color: #333; border: none; border-radius: 4px; font-weight: bold;">
                    🏁 Ir desde marcador
                </button>
            </div>
            <button onclick="map.closePopup()" 
                    style="width: 100%; padding: 8px; margin-top: 10px; cursor: pointer; background: #6c757d; color: white; border: none; border-radius: 4px;">
                Cancelar
            </button>
        </div>
    `;

    L.popup()
        .setLatLng([destLat, destLng])
        .setContent(popupContent)
        .openOn(map);
}

/**
 * Usa la ubicación actual del usuario como origen
 */
window.usarUbicacionActual = function (destLat, destLng, nombreDestino) {
    map.closePopup();

    if (!navigator.geolocation) {
        alert('Tu navegador no soporta geolocalización 😢');
        return;
    }

    const loadingPopup = L.popup()
        .setLatLng([destLat, destLng])
        .setContent('<div style="text-align: center;">📡 Obteniendo tu ubicación...</div>')
        .openOn(map);

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const origenLat = position.coords.latitude;
            const origenLng = position.coords.longitude;

            map.closePopup();
            crearRutaCompleta(origenLat, origenLng, "Tu ubicación", destLat, destLng, nombreDestino);
        },
        function (error) {
            map.closePopup();
            let mensaje = 'No se pudo obtener tu ubicación. ';

            switch (error.code) {
                case error.PERMISSION_DENIED:
                    mensaje += 'Tenés que dar permiso para acceder a tu ubicación.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    mensaje += 'Ubicación no disponible.';
                    break;
                case error.TIMEOUT:
                    mensaje += 'Tiempo de espera agotado.';
                    break;
            }

            alert(mensaje);
            // Volver a mostrar opciones
            mostrarOpcionesOrigen(destLat, destLng, nombreDestino);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}


window.usarMarcadorSeleccionado = function (destLat, destLng, nombreDestino) {
    const selectEl = document.getElementById('select-marcador-origen');
    if (!selectEl) {
        console.error("No se encontró el <select> 'select-marcador-origen'");
        return;
    }

    const selectedId = selectEl.value;

    if (!selectedId) {
        alert('Por favor, elegí un marcador de la lista desplegable.');
        return;
    }

    // Usar la variable global para encontrar el marcador
    const pin = marcadoresEnMapa[selectedId];

    if (!pin || !pin.markerData) {
        alert('Error: No se pudieron encontrar los datos del marcador seleccionado.');
        console.error("No se encontró el pin con ID:", selectedId, "en", marcadoresEnMapa);
        return;
    }

    const data = pin.markerData;
    const origenLat = data.latitud;
    const origenLng = data.longitud;
    const nombreOrigen = data.nombre;

    map.closePopup();

    // Llamar a la función final que crea la ruta
    crearRutaCompleta(origenLat, origenLng, nombreOrigen, destLat, destLng, nombreDestino);
}



window.elegirOtroPunto = function (destLat, destLng, nombreDestino) {
    map.closePopup();

    // remover control de ruta y input de geocoder previos
    if (window.controlRutaDinamica) {
        try {
            map.removeControl(window.controlRutaDinamica);
        } catch (e) {
            console.warn('No se pudo remover el control previo:', e);
        }
        window.controlRutaDinamica = null;
    }
    if (window._origenGeocoderInput) {
        try {
            window._origenGeocoderInput.removeEventListener('keydown', window._origenGeocoderHandler);
        } catch (e) {  }
        window._origenGeocoderInput = null;
        window._origenGeocoderHandler = null;
    }

    
    window.controlRutaDinamica = L.Routing.control({
        waypoints: [
            L.latLng(destLat, destLng) // destino fijo
        ],
        router: router,
        language: 'es',
        routeWhileDragging: true,
        showAlternatives: false,
        addWaypoints: false,
        lineOptions: {
            styles: [{ color: '#6FA1EC', weight: 6, opacity: 0.8 }]
        },
        show: true,
        collapsible: false
    }).addTo(map);

    // se fuerza el panel del control para que esté visible e insertamos buscador
    setTimeout(() => {
        const container = window.controlRutaDinamica.getContainer();
        if (!container) {
            console.warn('No se encontró el container de controlRutaDinamica');
            return;
        }

        // Aseguramos que el panel esté expandido
        container.style.display = 'block';
        const collapseBtn = container.querySelector('.leaflet-routing-collapse-btn');
        if (collapseBtn && container.classList.contains('leaflet-routing-container-hide')) {
            collapseBtn.click();
        }

        // Setear el nombre del destino
        const destinyInput = container.querySelector('.leaflet-routing-geocoder input:last-of-type');
        if (destinyInput) {
            destinyInput.value = nombreDestino || '';
            destinyInput.readOnly = true;
        }

        // contenedor para input de ORIGEN y RESULTADOS
        let origenWrapper = container.querySelector('.mi-origen-wrapper');
        if (!origenWrapper) {
            origenWrapper = document.createElement('div');
            origenWrapper.className = 'mi-origen-wrapper';
            origenWrapper.style.padding = '8px';
            origenWrapper.style.borderTop = '1px solid #eee';
            origenWrapper.style.display = 'flex';
            origenWrapper.style.flexDirection = 'column';
            origenWrapper.style.gap = '6px';

            origenWrapper.innerHTML = `
                <div style="display: flex; gap: 6px; width: 100%;">
                    <input class="mi-origen-input" type="text" placeholder="🔍 Ingresá tu punto de partida..." style="flex:1; padding:8px; border-radius:4px; border:1px solid #ccc;" />
                    <button class="mi-origen-btn" title="Buscar" style="padding:8px 10px; border-radius:4px; border:none; cursor:pointer; background:#007bff; color:#fff;">Ir</button>
                </div>
                <div class="mi-origen-resultados" style="width: 100%; max-height: 150px; overflow-y: auto; background: #fff; border: 1px solid #eee; border-radius: 4px;">
                </div>
            `;
            container.appendChild(origenWrapper);
        }

        const origenInput = origenWrapper.querySelector('.mi-origen-input');
        const origenBtn = origenWrapper.querySelector('.mi-origen-btn');
        const resultadosDiv = origenWrapper.querySelector('.mi-origen-resultados');

        window._origenGeocoderInput = origenInput;

      
        const handler = async function (evt) { 
            if (evt.type === 'click' || (evt.type === 'keydown' && evt.key === 'Enter')) {
                const query = origenInput.value && origenInput.value.trim();
                if (!query) {
                    alert('Ingresá algo para buscar el origen.');
                    return;
                }

                origenBtn.disabled = true;
                origenBtn.textContent = '...';
                resultadosDiv.innerHTML = '<div style="padding: 10px; text-align: center; color: #777;">Buscando...</div>';

               
                const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=ar&limit=5&format=json`;

                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`Error de red: ${response.statusText}`);
                    }
                    const results = await response.json(); 

                    

                    origenBtn.disabled = false;
                    origenBtn.textContent = 'Ir';
                    resultadosDiv.innerHTML = '';

                    
                    resultadosDiv._geocoderResults = results;

                    if (!results || results.length === 0) {
                        resultadosDiv.innerHTML = '<div style="padding: 10px; color: #777;">No se encontraron resultados.</div>';
                        return;
                    }

                    results.forEach((r, index) => {
                        
                        if (!r.lat || !r.lon || !r.display_name) return;

                        const nombre = r.display_name;
                        const item = document.createElement('div');
                        item.innerHTML = `📍 ${nombre}`;

                        // Estilos
                        item.style.padding = '10px';
                        item.style.cursor = 'pointer';
                        item.style.borderBottom = '1px solid #eee';
                        item.onmouseover = () => { item.style.backgroundColor = '#f4f4f4'; };
                        item.onmouseout = () => { item.style.backgroundColor = '#fff'; };

                        // Click en un resultado
                        item.onclick = () => {
                            const selectedResult = resultadosDiv._geocoderResults[index];
                            const selectedLatlng = L.latLng(selectedResult.lat, selectedResult.lon);
                            const selectedName = selectedResult.display_name;

                            if (!selectedLatlng) {
                                alert("Error: No se pudieron obtener coordenadas.");
                                return;
                            }

                            // Crear la ruta final
                            crearRutaCompleta(selectedLatlng.lat, selectedLatlng.lng, selectedName, destLat, destLng, nombreDestino);

                            // Limpieza 
                            try {
                                origenInput.removeEventListener('keydown', window._origenGeocoderHandler);
                                origenBtn.removeEventListener('click', window._origenGeocoderHandler);
                                origenWrapper.parentNode && origenWrapper.parentNode.removeChild(origenWrapper);
                            } catch (e) {  }

                            window._origenGeocoderInput = null;
                            window._origenGeocoderHandler = null;
                        };
                        resultadosDiv.appendChild(item);
                    });

                } catch (error) {
                    // Si 'fetch' falla
                    console.error("Error durante el fetch a Nominatim:", error);
                    origenBtn.disabled = false;
                    origenBtn.textContent = 'Ir';
                    resultadosDiv.innerHTML = '<div style="padding: 10px; color: red;">Error en la búsqueda. Revisa la consola.</div>';
                }
            }
        }; // Fin handler

        window._origenGeocoderHandler = handler;

        // Eventos
        origenInput.addEventListener('keydown', handler);
        origenBtn.addEventListener('click', handler);

        origenInput.focus();
        map.flyTo([destLat, destLng], 13);
    }, 150); // delay
};



/**
 * Crea la ruta completa con origen y destino definidos
 */
function crearRutaCompleta(origenLat, origenLng, nombreOrigen, destLat, destLng, nombreDestino) {
    // Remueve control anterior si existe para evitar duplicados
    if (window.controlRutaDinamica) {
        try {
            map.removeControl(window.controlRutaDinamica);
        } catch (e) { }
        window.controlRutaDinamica = null;
    }

    // Remover el panel de la izquierda si existía
    if (panelRutaDiv) {
        try { panelRutaDiv.remove(); } catch (e) { }
        panelRutaDiv = null;
    }

    // crear un marker de origen/destino
    try {
        if (window.searchMarker) {
            map.removeLayer(window.searchMarker);
            window.searchMarker = null;
        }
    } catch (e) { }

    window.controlRutaDinamica = L.Routing.control({
        waypoints: [
            L.latLng(origenLat, origenLng),
            L.latLng(destLat, destLng)
        ],
        router: router,
        language: 'es',
        routeWhileDragging: true,
        showAlternatives: false,
        lineOptions: {
            styles: [{ color: '#6FA1EC', weight: 6, opacity: 0.8 }]
        },

     
        // 1. Ocultamos el panel de la derecha por defecto
        show: false,
        collapsible: false,
        fitSelectedRoutes: false, 
 

        createMarker: function (i, waypoint, n) {

            let label = waypoint.name;
            let iconUrl = ''; // Se decide abajo

       
            //3 casos: Origen, Destino y Paradas

            if (i === 0) {
                // Caso 1: Origen (A)
                iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png';
                if (!label) label = "Origen";

            } else if (i === n - 1) {
                // Caso 2: Destino (B, C, D...)
                iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png';
                if (!label) label = "Destino";

            } else {
                // Caso 3: Parada intermedia
                iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png';
                if (!label) label = `Parada ${i}`;
            }
          

            
            const letra = String.fromCharCode(65 + i); 
            const popupLabel = `<b>${letra}: ${label}</b>`;

            return L.marker(waypoint.latLng, {
                draggable: true,
                icon: L.icon({
                    iconUrl: iconUrl,
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).bindPopup(popupLabel);
        }
    }).addTo(map);

  
    // Llamamos a nuestra función para crear el panel personalizado
    crearPanelRuta(window.controlRutaDinamica, nombreOrigen, nombreDestino);



    // Ajusta vista para mostrar toda la ruta
    setTimeout(() => {
        try {
            map.fitBounds([
                [origenLat, origenLng],
                [destLat, destLng]
            ], { padding: [50, 50] });
        } catch (e) {
            console.warn('Error al ajustar bounds:', e);
        }
    }, 500);
}


/**
 * Actualiza un waypoint en el control de ruta activo por su ÍNDICE.
 * @param {number} index - El índice del waypoint (0 = Origen, 1 = Parada 1, etc.).
 * @param {L.LatLng} nuevoLatLng - Las nuevas coordenadas.
 * @param {string} nuevoNombre - El nuevo nombre para el popup.
 */
function actualizarWaypoint(index, nuevoLatLng, nuevoNombre) {
    if (!window.controlRutaDinamica) return;

    const waypoints = window.controlRutaDinamica.getWaypoints();
    if (!waypoints || !waypoints[index]) {
        console.error("No se encontró el waypoint en el índice:", index);
        return;
    }

    // Actualiza el waypoint específico
    waypoints[index].latLng = nuevoLatLng;
    waypoints[index].name = nuevoNombre;

    // Actualiza la ruta
    window.controlRutaDinamica.setWaypoints(waypoints);
}


/**
 * Busca en Nominatim y muestra los resultados en un div.
 * @param {string} query - Texto a buscar.
 * @param {HTMLElement} resultsContainer - El <div> donde se mostrarán los resultados.
 * @param {number} index - El índice del waypoint a actualizar (0, 1, 2...).
 */
async function buscarYMostrarResultados(query, resultsContainer, index) {
    if (!query || query.trim().length < 3) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        return;
    }

    resultsContainer.innerHTML = '<div class="waypoint-result-item loading">Buscando...</div>';
    resultsContainer.style.display = 'block';

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=ar&limit=5&format=json`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error de red');
        const results = await response.json();

        resultsContainer.innerHTML = '';

        if (!results || results.length === 0) {
            resultsContainer.innerHTML = '<div class="waypoint-result-item loading">No se encontraron resultados.</div>';
            return;
        }

        results.forEach(r => {
            if (!r.lat || !r.lon || !r.display_name) return;

            const item = document.createElement('div');
            item.className = 'waypoint-result-item';
            item.textContent = `📍 ${r.display_name}`;

            item.dataset.lat = r.lat;
            item.dataset.lon = r.lon;
            item.dataset.name = r.display_name;

            item.onclick = () => {
                const lat = item.dataset.lat;
                const lon = item.dataset.lon;
                const name = item.dataset.name;
                const nuevoLatLng = L.latLng(lat, lon);

                //  Actualizar la ruta (usando el ÍNDICE)
                actualizarWaypoint(index, nuevoLatLng, name);

                //  Actualizar el valor del input (buscándolo por su ID)
                const inputEl = document.getElementById(`input-waypoint-${index}`);
                if (inputEl) inputEl.value = name;

                //  Ocultar la lista
                resultsContainer.innerHTML = '';
                resultsContainer.style.display = 'none';
            };

            resultsContainer.appendChild(item);
        });

    } catch (error) {
        console.error("Error en buscarYMostrarResultados:", error);
        resultsContainer.innerHTML = '<div class="waypoint-result-item loading" style="color: red;">Error al buscar.</div>';
    }
}


// FUNCIONES MARCADORES


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
// Carga marcadores desde la API y los muestra.
function agregarMarcadorAlMapa(marcador) {
    const latLng = [marcador.latitud, marcador.longitud];

    // Se crea el pin
    var pin = L.marker(latLng);

    pin.markerData = { id: marcador.id, nombre: marcador.nombre, latitud: marcador.latitud, longitud: marcador.longitud };

    var nombreEscapado = marcador.nombre.replace(/'/g, "\\'");

    var popupContent = `
        <div id="popup-ver-${marcador.id}">
            <b>${marcador.nombre}</b>
            <br>
            <button class="btn-editar" 
                    onclick="mostrarFormularioEdicion(event, ${marcador.id})">Editar</button>
            <button class="btn-borrar" 
                    onclick="borrarMarcador(event, ${marcador.id})">Borrar</button>
            
            <button class="btn-editar" style="margin-left: 5px;" 
                    onclick="event.stopPropagation(); window.iniciarRuta(${marcador.latitud}, ${marcador.longitud}, '${nombreEscapado}')">
                📍 Indicaciones
            </button>
        </div>
    `;
    pin.bindPopup(popupContent);

  
    pin.addTo(marcadoresGroup);

    marcadoresEnMapa[marcador.id] = pin;
}




// Abre popup para crear un nuevo marcador en la posición dada
function abrirPopupParaNuevoMarcador(latlng) {
     var lat = latlng.lat.toFixed(6);
     var lng = latlng.lng.toFixed(6);

    // Nombre que le pasaremos a la función de ruteo
    var nombreGenerico = 'Punto seleccionado';
    
    var nombreEscapado = nombreGenerico.replace(/'/g, "\\'");

     var popupContent = `
         <div>
             <b>Nuevo Marcador</b><br>
             <small>Lat: ${lat}, Lng: ${lng}</small>
             <hr style="margin: 4px 0;">
             Nombre: <input type='text' id='inputNombreMarcador' />
             <br>
                        <button class="btn-guardar" 
                    onclick='guardarMarcador(event, ${latlng.lat}, ${latlng.lng})'>
                Guardar
            </button>
            
            <button class="btn-editar" style="margin-left: 5px;" 
                    onclick="event.stopPropagation(); window.iniciarRuta(${latlng.lat}, ${latlng.lng}, '${nombreEscapado}')">
                📍 Indicaciones
            </button>
                    </div>`;
     L.popup().setLatLng(latlng).setContent(popupContent).openOn(map);
}

/**
 * Helper para llamar a iniciarRuta desde el popup de 'Nuevo Marcador'
 */
function iniciarRutaDesdePopup(event, lat, lng, nombre) {
    // Detenemos el evento para que el popup no haga cosas raras
    event.stopPropagation();

    // Llamamos a la función principal de ruteo
    window.iniciarRuta(lat, lng, nombre || "Punto en mapa");
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

      
        map.closePopup();

        
        var pin = marcadoresEnMapa[id];

        
        if (pin) {
            marcadoresGroup.removeLayer(pin);
            delete marcadoresEnMapa[id];
        } else {
            console.warn(`El marcador con id ${id} no se encontró en el caché local.`);
        }
       

    } catch (error) {
        console.error("Error en borrarMarcador:", error);
        alert('No se pudo borrar el marcador.');
    }
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

    var nombreEscapado = data.nombre.replace(/'/g, "\\'");

    var popupContent = `
        <div id="popup-ver-${data.id}">
            <b>${data.nombre}</b>
            <br>
            <button class="btn-editar" 
                    onclick="mostrarFormularioEdicion(event, ${data.id})">Editar</button>
            <button class="btn-borrar" 
                    onclick="borrarMarcador(event, ${data.id})">Borrar</button>

            <button class="btn-editar" style="margin-left: 5px;" 
                    onclick="event.stopPropagation(); window.iniciarRuta(${data.latitud}, ${data.longitud}, '${nombreEscapado}')">
                📍 Indicaciones
            </button>
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
//  FUNCIONES MENU RUTAS
// ===================================================================

function formatDistance(meters) {
    if (meters < 1000) {
        return `${meters.toFixed(0)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
}

function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);

    let parts = [];
    if (hours > 0) {
        parts.push(`${hours} h`);
    }
    if (minutes > 0) {
        parts.push(`${minutes} min`);
    }
    if (parts.length === 0 && totalSeconds > 0) {
        return "Menos de 1 min";
    }
    return parts.join(' ');
}


/**
 * Crea y gestiona el panel de ruta personalizado a la izquierda.
 * MODIFICADA para ser dinámica y soportar múltiples paradas.
 */
function crearPanelRuta(control, nombreOrigen, nombreDestino) {

    if (panelRutaDiv) {
        try { panelRutaDiv.remove(); } catch (e) { }
        panelRutaDiv = null;
    }

    panelRutaDiv = document.createElement('div');
    panelRutaDiv.className = 'custom-routing-panel';

    // HTML base del panel
    panelRutaDiv.innerHTML = `
        <div class="panel-header">
            <strong>Tu Viaje</strong>
            <div class="panel-controles">
                <button id="btnMinimizarRuta" title="Minimizar">_</button>
                <button id="btnCerrarRuta" title="Cerrar Ruta">X</button>
            </div>
        </div>
        <div class="panel-body">
            <div class="info-ruta">
                <span id="info-distancia">Calculando...</span>
                <span id="info-tiempo"></span>
            </div>
            
            <div class="waypoints-inputs" id="waypoints-list">
                </div>
            
            <button id="btnAgregarParada">+ Agregar Parada</button>
        </div>
    `;

    map.getContainer().appendChild(panelRutaDiv);

    // --- MANEJADOR PARA REDIBUJAR EL PANEL ---
    // Esta función se llamará cada vez que los waypoints cambien
    const redibujarPanelWaypoints = () => {
        const waypointsListDiv = panelRutaDiv.querySelector("#waypoints-list");
        if (!waypointsListDiv) return;

        waypointsListDiv.innerHTML = ''; // Limpiar lista
        const waypoints = control.getWaypoints();
        const numWaypoints = waypoints.length;

        waypoints.forEach((wp, index) => {
            const letra = String.fromCharCode(65 + index); // A, B, C...
            const nombre = wp.name || (wp.latLng ? `Punto ${letra}` : "");

            // Creamos el HTML para este waypoint
            const wrapper = document.createElement('div');
            wrapper.className = 'waypoint-input-wrapper';

            let placeholder = 'Buscar...';
            if (index === 0) placeholder = 'Buscar punto de partida...';
            if (index === numWaypoints - 1) placeholder = 'Buscar destino...';

            wrapper.innerHTML = `
                <div class="waypoint">
                    <span class="waypoint-label">${letra}:</span>
                    <input type="text" value="${nombre}" class="waypoint-input" 
                           id="input-waypoint-${index}" 
                           placeholder="${placeholder}">
                </div>
                ${(index > 0 && index < numWaypoints - 1) ?
                    `<button class="waypoint-delete-btn" data-index="${index}" title="Eliminar parada">X</button>` : ''
                }
                <div class="waypoint-results-list" id="results-waypoint-${index}" style="display: none;"></div>
            `;
            waypointsListDiv.appendChild(wrapper);

            // --- Añadir Listeners al input que acabamos de crear ---
            const input = wrapper.querySelector(`#input-waypoint-${index}`);
            const resultsDiv = wrapper.querySelector(`#results-waypoint-${index}`);

            input.addEventListener('keydown', function (e) {
                // Ocultar todas las otras listas de resultados
                panelRutaDiv.querySelectorAll('.waypoint-results-list').forEach(r => {
                    if (r.id !== resultsDiv.id) r.style.display = 'none';
                });

                if (e.key === 'Enter') {
                    e.preventDefault();
                    // Usamos el 'index' actual
                    buscarYMostrarResultados(input.value, resultsDiv, index);
                } else if (e.key === 'Escape') {
                    resultsDiv.style.display = 'none';
                }
            });

            // --- Añadir Listener al botón de borrar (si existe) ---
            const deleteBtn = wrapper.querySelector('.waypoint-delete-btn');
            if (deleteBtn) {
                deleteBtn.onclick = () => {
                    // Simplemente removemos el waypoint del control.
                    // El panel se redibujará solo gracias al listener 'waypointschanged'
                    control.spliceWaypoints(index, 1);
                };
            }
        });
    };
    // --- FIN DEL MANEJADOR DE REDIBUJO ---


    // --- FUNCIONARDAS DEL PANEL ---

    // Botón de Cerrar Ruta
    panelRutaDiv.querySelector('#btnCerrarRuta').onclick = function () {
        if (window.controlRutaDinamica) {
            try { map.removeControl(window.controlRutaDinamica); } catch (e) { }
            window.controlRutaDinamica = null;
        }
        if (panelRutaDiv) {
            try { panelRutaDiv.remove(); } catch (e) { }
            panelRutaDiv = null;
        }
        document.removeEventListener('click', ocultarResultadosGlobal);
    };

    // Botón de Minimizar
    panelRutaDiv.querySelector('#btnMinimizarRuta').onclick = function () {
        panelRutaDiv.classList.toggle('minimizado');
        this.textContent = panelRutaDiv.classList.contains('minimizado') ? '❐' : '_';
    };

    //  Info de Ruta
    control.on('routesfound', function (e) {
        if (e.routes && e.routes.length > 0) {
            var summary = e.routes[0].summary;
            const distEl = document.getElementById('info-distancia');
            const tiempoEl = document.getElementById('info-tiempo');
            if (distEl) distEl.textContent = `Distancia: ${formatDistance(summary.totalDistance)}`;
            if (tiempoEl) tiempoEl.textContent = `Tiempo: ${formatTime(summary.totalTime)}`;
        }
    });
    control.on('routingerror', function (e) {
        const distEl = document.getElementById('info-distancia');
        if (distEl) distEl.textContent = `Error al calcular la ruta.`;
        const tiempoEl = document.getElementById('info-tiempo');
        if (tiempoEl) tiempoEl.textContent = "";
    });

    //Botón "Agregar Parada"
    panelRutaDiv.querySelector('#btnAgregarParada').onclick = function () {
        const numWaypoints = control.getWaypoints().length;
        // Agrega un waypoint nulo justo antes del destino (índice numWaypoints - 1)
        control.spliceWaypoints(numWaypoints - 1, 0, L.Routing.waypoint(null, ""));
        // El panel se redibujará solo
    };

    // Listener para cerrar resultados al hacer clic fuera
    const ocultarResultadosGlobal = function (event) {
        if (!panelRutaDiv.contains(event.target)) {
            panelRutaDiv.querySelectorAll('.waypoint-results-list').forEach(r => r.style.display = 'none');
        }
    };
    setTimeout(() => {
        document.addEventListener('click', ocultarResultadosGlobal);
    }, 0);

    
    redibujarPanelWaypoints();

  
    control.on('waypointschanged', redibujarPanelWaypoints);
    control.on('routesfound', (e) => {
       
        redibujarPanelWaypoints();
    });
}






// ===================================================================
//  FUNCIONES POLÍGONOS
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

            //  Lo agregamos a la capa "drawnItems"
            drawnItems.addLayer(polyLayer);
        });

    } catch (error) {
        console.error("Error en cargarPoligonos:", error);
    } finally {
        estaCargando = false; 
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