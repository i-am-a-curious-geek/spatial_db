var map;
var geojson_text = "{ \"type\": \"FeatureCollection\", \"features\": [] };";

$(document).ready(function() {
    window.history.pushState("basic-pages", "Title", "home.html"); // to overwrite url

    map = L.map("map", {
        center: [1.3521, 103.8198],
        zoom: 11
    });

    var layer_group = new L.layerGroup([]);
    var basemap = L.tileLayer("http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png");
    layer_group.addLayer(basemap);
    layer_group.addTo(map);

    $("body").on("click", "#edit-mode", function() {
        $("#myiconmenu.iconmenu").css("display", "none");
        $(".leaflet-draw.leaflet-control").css("display", "block");

        $(".leaflet-draw-section").each(function(i) {
            if (i == $(".leaflet-draw-section").length - 1 && i < 2) {
                $(this).append("<div class=\"leaflet-draw-section\"><div class=\"leaflet-draw-toolbar leaflet-bar\"><a id=\"save_geojson\" href=\"#\" title=\"Save to File (GeoJSON)\" class=\"fa fa-save\"><span class=\"sr-only\">Save to File (GeoJson)</span></a><a id=\"default_mode\" href=\"#\" title=\"Default Mode\" class=\"fa fa-arrow-left\"><span class=\"sr-only\">Default Mode</span></a></div></div>");
            }
        });
    });

    $("body").on("click", "#save_geojson", function() {
        if (!window.Blob) {
            $("#notification").modal("show");
            $("#modal-message").css("color", "#e73d4a");
            $("#modal-message").html("<i class='fa fa-warning'></i> Your browser does not support HTML5 \"Blob\" function required to save a file.");            
        } else {
            var txtwrt = geojson_text; // content to write to file

            var textblob = new Blob([txtwrt], {type: "text/plain"});
            var dwnlnk = document.createElement("a");
            dwnlnk.download = "geojson"; // name of downloaded file
            if (window.webkitURL != null) {
                dwnlnk.href = window.webkitURL.createObjectURL(textblob);
            } else {
                dwnlnk.href = window.URL.createObjectURL(textblob);
                dwnlnk.style.display = "none";
                document.body.appendChild(dwnlnk);
            }
            dwnlnk.click();
        }
    });

    L.control.scale({options: {position: "bottomleft", maxWidth: 100, metric: true, imperial: false, updateWhenIdle: false}}).addTo(map);

    var getRandomLocation = function(latitude, longitude, radiusInMeters) {
        var getRandomCoordinates = function(radius, uniform) {
            var a = Math.random();
            var b = Math.random();

            if (uniform) {
                if (b < a) {
                    var c = b;
                    b = a;
                    a = c;
                }
            }

            return [
                b * radius * Math.cos(2 * Math.PI * a / b),
                b * radius * Math.sin(2 * Math.PI * a / b)
            ];
        };
        var randomCoordinates = getRandomCoordinates(radiusInMeters, true);
        var earth = 6378137;
        var northOffset = randomCoordinates[0],
                eastOffset = randomCoordinates[1];
        var offsetLatitude = northOffset / earth,
                offsetLongitude = eastOffset / (earth * Math.cos(Math.PI * (latitude / 180)));
        return {
            latitude: latitude + (offsetLatitude * (180 / Math.PI)),
            longitude: longitude + (offsetLongitude * (180 / Math.PI))
        }
    };

    var point;
    var pointArr = [];

    var pointProperties = {
        color: "darkgreen",
        fillColor: "lightgreen",
        fillOpacity: 1.0
    };

    var latlong;
    var i;

    var distance = 4000; // in metres
    var noOfppl = 50;

    function crowdMovement() {
        // central
        for (i = 0; i < noOfppl; i++) {
            latlong = getRandomLocation(1.3521, 103.8198, distance);
            point = L.circle([latlong["latitude"], latlong["longitude"]], 50, pointProperties);
            pointArr.push(point);
            point.addTo(map);
        }

        // north
        for (i = 0; i < noOfppl; i++) {
            latlong = getRandomLocation(1.4269307173650994, 103.81324768066406, distance);
            point = L.circle([latlong["latitude"], latlong["longitude"]], 50, pointProperties);
            pointArr.push(point);
            point.addTo(map);
        }

        // east
        for (i = 0; i < noOfppl; i++) {
            latlong = getRandomLocation(1.3670959104527012, 103.90079498291016, distance);
            point = L.circle([latlong["latitude"], latlong["longitude"]], 50, pointProperties);
            pointArr.push(point);
            point.addTo(map);
        }

        // west
        for (i = 0; i < noOfppl; i++) {
            latlong = getRandomLocation(1.361604303714409, 103.7112808227539, 5000);
            point = L.circle([latlong["latitude"], latlong["longitude"]], 50, pointProperties);
            pointArr.push(point);
            point.addTo(map);
        }

        // central-west
        for (i = 0; i < noOfppl; i++) {
            latlong = getRandomLocation(1.3699561173272734, 103.76792907714844, distance);
            point = L.circle([latlong["latitude"], latlong["longitude"]], 50, pointProperties);
            pointArr.push(point);
            point.addTo(map);
        }

        // extreme east
        for (i = 0; i < noOfppl; i++) {
            latlong = getRandomLocation(1.3466167301443492, 103.97117614746094, 3000);
            point = L.circle([latlong["latitude"], latlong["longitude"]], 50, pointProperties);
            pointArr.push(point);
            point.addTo(map);
        }

        // south
        for (i = 0; i < noOfppl; i++) {
            latlong = getRandomLocation(1.3013102263776561, 103.82560729980469, distance);
            point = L.circle([latlong["latitude"], latlong["longitude"]], 50, pointProperties);
            pointArr.push(point);
            point.addTo(map);
        }
    }

    var p;

    crowdMovement();

    setInterval(function() {
        crowdMovement();

        for (p = 0; p < pointArr.length; p++) {
            map.removeLayer(pointArr[p]);
        }

        crowdMovement();
    }, 5000);

    $("#logout-option").click(function() {
        location.href = "index.html";
    });

    var winH = $(window).height();

    if (winH < 450) {
        $("#map").height(450);
    }

    window.onresize = function() {
        winH = $(window).height();

        if (winH < 450) {
            $("#map").height(450);
        } else {
            $("#map").height(winH);
        }
    }

    var feature_group;
    var regionsLayerJSON;

    $("body").on("click", "#show-regions", function() {
        if ($(this).hasClass("fa-toggle-off")) {
            $(this).removeClass("fa-toggle-off");
            $(this).addClass("fa-toggle-on");

            feature_group = new L.featureGroup([]);

            regionsLayerJSON = new L.GeoJSON.AJAX("data/regions.json", {
                style: {
                    color: "#c4c4c4",
                    weight: 2.0,
                    fillColor: "#08306b",
                    opacity: 0.5,
                    fillOpacity: 0.0
                }
            });

            feature_group.addLayer(regionsLayerJSON);
            feature_group.addTo(map);
        } else {
            $(this).removeClass("fa-toggle-on");
            $(this).addClass("fa-toggle-off");

            feature_group.removeLayer(regionsLayerJSON);
        }
    });

    var drawnItems = L.featureGroup().addTo(map);

    map.addControl(new L.Control.Draw({
        edit: {
            featureGroup: drawnItems,
            poly: {
                allowIntersection: false
            }
        },
        draw: {
            polygon: {
                allowIntersection: false,
                showArea: true
            }
        }
    }));

    map.on("draw:created", function(event) {
        var layer = event.layer;
        drawnItems.addLayer(layer);

        geojson_text = JSON.stringify(drawnItems.toGeoJSON()); // to get the geojson out
        //console.log(geojson_text);
    });

    map.on("draw:edited", function() {
        geojson_text = JSON.stringify(drawnItems.toGeoJSON());
        //console.log(geojson_text);
    });

    map.on("draw:deleted", function() {
        geojson_text = JSON.stringify(drawnItems.toGeoJSON());
        //console.log(geojson_text);
    });

    $("body").on("click", "#default_mode", function() {
        $("#myiconmenu.iconmenu").css("display", "block");
        $(".leaflet-draw.leaflet-control").css("display", "none");

        drawnItems.clearLayers();
    });

    var uploadedLayerJSON;

    $("body").on("change", ".geojsontxt", function() {
        if (!window.FileReader) {            
            $("#notification").modal("show");
            $("#modal-message").css("color", "#e73d4a");
            $("#modal-message").html("<i class='fa fa-warning'></i> Your browser does not support HTML5 \"FileReader\" function required to open a file.");            
        } else {
            var fileis = this.files[0];
            var fileredr = new FileReader();
            fileredr.onload = function(fle) {
                uploadedLayerJSON = fle.target.result;
                var errors = geojsonhint.hint(uploadedLayerJSON);

                if (errors.length > 0) {
                    var message = errors.map(function(error) {
                        return error.message;
                    });
                    
                    $("#notification").modal("show");
                    $("#modal-message").css("color", "#e73d4a");
                    $("#modal-message").html("<i class='fa fa-warning'></i> Invalid GeoJSON: " + message);                                
                } else if(uploadedLayerJSON.indexOf("FeatureCollection") == -1) {                    
                    $("#notification").modal("show");
                    $("#modal-message").css("color", "#e73d4a");
                    $("#modal-message").html("<i class='fa fa-warning'></i> Only \"FeatureCollection\" type GeoJSON is accepted.");            
                } else {
                    $.ajax({
                        url: "db",
                        type: "post",
                        data: {
                            q: "store",
                            json: uploadedLayerJSON
                        },
                        success: function() {
                            var uploadedLayerJSON2 = new L.GeoJSON.AJAX("db?q=getStored", {
                                statics: {
                                    TYPE: 'polyline'
                                },
                                Poly: L.Polyline,
                                options: {
                                    allowIntersection: true,
                                    repeatMode: false,
                                    drawError: {
                                        color: '#b00b00',
                                        timeout: 2500
                                    },
                                    icon: new L.DivIcon({
                                        iconSize: new L.Point(8, 8),
                                        className: 'leaflet-div-icon leaflet-editing-icon'
                                    }),
                                    touchIcon: new L.DivIcon({
                                        iconSize: new L.Point(20, 20),
                                        className: 'leaflet-div-icon leaflet-editing-icon leaflet-touch-icon'
                                    }),
                                    guidelineDistance: 20,
                                    maxGuideLineLength: 4000,
                                    shapeOptions: {
                                        stroke: true,
                                        color: '#3388ff',
                                        weight: 4,
                                        opacity: 0.5,
                                        fill: false,
                                        clickable: true
                                    },
                                    metric: true, // Whether to use the metric measurement system or imperial
                                    feet: true, // When not metric, to use feet instead of yards for display.
                                    nautic: false, // When not metric, not feet use nautic mile for display
                                    showLength: true, // Whether to display distance in the tooltip
                                    zIndexOffset: 2000 // This should be > than the highest z-index any map layers
                                }
                            });

                            feature_group.addLayer(uploadedLayerJSON2);
                            feature_group.addTo(map);
                        },
                        error: function(status) {
                            alert("Error" + status + " has occurred.");
                        }
                    });
                }
            }
            fileredr.readAsText(fileis);
        }
    });

    $("body").on("click", "#upload-geojson", function() {
        var inputlnk = document.createElement("input");
        inputlnk.setAttribute("type", "file");
        inputlnk.setAttribute("class", "geojsontxt");
        inputlnk.style.display = "none";
        document.body.appendChild(inputlnk);
        inputlnk.click();
    });

    document.getElementById("show-regions").click();

}); // document ready