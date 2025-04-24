// Variables globales pour la carte
let map = null;
let layers = {};
let highlightedFeature = null;

// Initialisation de la carte quand le DOM est prêt
document.addEventListener('DOMContentLoaded', function() {
    try {
        initMap();
        setupLegend();
        setupSidebar();
        setupInteractions();
        setupResizeHandler();
    } catch (error) {
        console.error("Erreur lors de l'initialisation de la carte:", error);
    }
});

// Fonction d'initialisation de la carte
function initMap() {
    // Création des couches
    layers = {
        // Fonds de carte
        osm: new ol.layer.Tile({
            source: new ol.source.OSM(),
            visible: true
        }),
        satellite: new ol.layer.Tile({
            source: new ol.source.XYZ({
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                maxZoom: 19
            }),
            visible: false
        }),
        googlestreets: new ol.layer.Tile({
            source: new ol.source.XYZ({
                url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
            }),
            visible: false
        }),
        // Couche WMS
        wms: new ol.layer.Tile({
            source: new ol.source.TileWMS({
                url: 'https://geoegl.msp.gouv.qc.ca/apis/wss/complet.fcgi',
                params: {LAYERS: 'MSP_DESSERTE_MUN_911', VERSION: '1.3.0'},
                maxZoom: 19
            }),
            visible: false
        }),
        // Couche des circonscriptions
        circonscriptions: new ol.layer.Vector({
            source: new ol.source.Vector({
                url: 'data/circonscriptions.geojson',
                format: new ol.format.GeoJSON()
            }),
            style: styleCirconscription
        })
    };

    // Initialiser la carte
    map = new ol.Map({
        target: 'map',
        layers: [
            layers.osm,
            layers.satellite,
            layers.googlestreets,
            layers.wms,
            layers.circonscriptions
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([-71.72, 53]), // Centre du Québec
            zoom: 5,
            maxZoom: 19
        }),
        controls: new ol.Collection() // Collection vide de contrôles
    });

    // Ajouter manuellement les contrôles standard
    map.addControl(new ol.control.Zoom());
    map.addControl(new ol.control.ScaleLine());
    map.addControl(new ol.control.MousePosition({
        coordinateFormat: ol.coordinate.createStringXY(4),
        projection: 'EPSG:4326',
        className: 'mouse-position'
    }));

    // Forcer le redimensionnement de la carte
    setTimeout(function() {
        map.updateSize();
    }, 300);
}

// Fonction de style pour les circonscriptions
function styleCirconscription(feature) {
    // Utiliser le parti gagnant comme base pour la symbologie
    const abrevParti = feature.get('abrev_parti') || '';
    const nom = feature.get('NM_CEP') || feature.get('nom') || '';
    
    const color = getColorFromParti(abrevParti);

    return new ol.style.Style({
        fill: new ol.style.Fill({
            color: color
        }),
        stroke: new ol.style.Stroke({
            color: '#FFFFFF',
            width: 1
        }),
        text: new ol.style.Text({
            text: nom,
            font: '12px Arial',
            fill: new ol.style.Fill({
                color: '#000000'
            }),
            stroke: new ol.style.Stroke({
                color: '#FFFFFF',
                width: 3
            })
        })
    });
}

// Fonction pour obtenir une couleur basée sur le parti
function getColorFromParti(abrevParti) {
    // Couleurs pour chaque parti
    const colors = {
        'C.A.Q.-É.F.L.': '#00B050', // Vert clair
        'P.L.Q./Q.L.P.': '#B200FF', // Violet
        'P.Q.': '#FF0000',          // Rouge
        'Q.S.': '#00B9F2'           // Bleu-vert
    };
    
    // Retourne la couleur correspondant au parti, ou gris si non trouvé
    return colors[abrevParti] || '#CCCCCC';
}

// Fonction pour créer la légende
function setupLegend() {
    // Création de la légende
    const legend = document.createElement('div');
    legend.className = 'map-legend ol-control';
    legend.innerHTML = `
        <button id="legend-toggle">Légende</button>
        <div id="legend-content" class="hidden">
            <h4>Partis politiques</h4>
            <div class="legend-item">
                <span class="legend-color" style="background-color: #00B050;"></span>
                <span>C.A.Q.-É.F.L.</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background-color: #B200FF;"></span>
                <span>P.L.Q./Q.L.P.</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background-color: #FF0000;"></span>
                <span>P.Q.</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background-color: #00B9F2;"></span>
                <span>Q.S.</span>
            </div>
        </div>
    `;
    
    // Afficher/masquer la légende
    legend.querySelector('#legend-toggle').addEventListener('click', function() {
        legend.querySelector('#legend-content').classList.toggle('hidden');
    });
    
    // Ajouter la légende à la carte
    map.addControl(new ol.control.Control({
        element: legend
    }));
}

// Fonction pour configurer la barre latérale
function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-sidebar');

    // Gestion de la barre latérale
    toggleBtn.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        // Forcer la mise à jour de la carte après l'animation
        setTimeout(function() {
            map.updateSize();
        }, 300);
    });

    // Gestion des fonds de carte
    document.querySelectorAll('.basemap-option').forEach(function(option) {
        option.addEventListener('click', function() {
            // Mise à jour de l'état actif
            document.querySelectorAll('.basemap-option').forEach(function(opt) {
                opt.classList.remove('active');
            });
            option.classList.add('active');

            // Changement de fond de carte
            const value = option.querySelector('input').value;
            Object.entries(layers).forEach(function([key, layer]) {
                if (layer instanceof ol.layer.Tile && (key === 'osm' || key === 'satellite' || key === 'googlestreets')) {
                    layer.setVisible(key === value);
                }
            });
        });
    });

    // Gestion des couches
    document.getElementById('circonscriptions').addEventListener('change', function(e) {
        layers.circonscriptions.setVisible(e.target.checked);
    });
    
    // Gestion de la couche WMS
    const wmsCheckbox = document.getElementById('wms');
    if (wmsCheckbox) {
        wmsCheckbox.addEventListener('change', function(e) {
            layers.wms.setVisible(e.target.checked);
        });
    }
}

// Fonction pour gérer les interactions avec la carte
function setupInteractions() {
    // Gestion du survol
    map.on('pointermove', function(evt) {
        if (evt.dragging) return;
        
        if (highlightedFeature) {
            highlightedFeature.setStyle(styleCirconscription(highlightedFeature));
            highlightedFeature = null;
        }

        const feature = map.forEachFeatureAtPixel(evt.pixel, 
            function(feature) {
                return feature;
            },
            {
                layerFilter: function(layer) {
                    return layer === layers.circonscriptions;
                }
            }
        );

        if (feature) {
            const highlightStyle = new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 0, 0.3)'
                }),
                stroke: new ol.style.Stroke({
                    color: '#000000',
                    width: 2
                }),
                text: styleCirconscription(feature).getText()
            });
            feature.setStyle(highlightStyle);
            highlightedFeature = feature;
            
            // Changement du curseur
            map.getTargetElement().style.cursor = 'pointer';
        } else {
            map.getTargetElement().style.cursor = '';
        }
    });

    // Gestion du clic
    map.on('click', function(evt) {
        const feature = map.forEachFeatureAtPixel(evt.pixel, 
            function(feature) {
                return feature;
            },
            {
                layerFilter: function(layer) {
                    return layer === layers.circonscriptions;
                }
            }
        );

        if (feature) {
            const props = feature.getProperties();
            
            // Directement afficher les statistiques
            if (window.updateStats) {
                window.updateStats(props);
            }
        }
    });
    
    // Fermer les statistiques
    const statsCloseBtn = document.getElementById('stats-close');
    if (statsCloseBtn) {
        statsCloseBtn.addEventListener('click', function() {
            document.getElementById('stats-panel').classList.add('hidden');
            setTimeout(function() {
                map.updateSize();
            }, 100);
        });
    }
}

// Gestion du redimensionnement
function setupResizeHandler() {
    // Gérer les événements de redimensionnement
    window.addEventListener('resize', function() {
        setTimeout(function() {
            map.updateSize();
        }, 100);
    });

    // Observer les changements de visibilité du panneau des stats
    const statsPanel = document.getElementById('stats-panel');
    if (statsPanel) {
        const observer = new MutationObserver(function() {
            setTimeout(function() {
                map.updateSize();
            }, 100);
        });

        observer.observe(statsPanel, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
    
    // Vérification périodique de la taille de la carte
    setInterval(function() {
        map.updateSize();
    }, 2000);
}