// let bbox = turf.bbox(features);

//Distance in meters between a location point and the center of the street to count it as walked
const TOLERANCE_RADIUS_FOR_STREET_WALKED = 2.5;

//Size of the hotspots at every intersection in meters
const RADIUS_FOR_INTERSECTION_BUFFER = 20 / 1000;

let point1 = turf.point([-73.995044, 40.729716]);
let point2 = turf.point([-73.994886, 40.729189]);
let point3 = turf.point([-73.993946, 40.729001]);
let point4 = turf.point([-73.993494, 40.729629]);

let multiPoints = turf.multiPoint([[-73.995044, 40.729716], [-73.994886, 40.729189], [-73.993946, 40.729001], [-73.993494, 40.729629]]);
let streetLines = getStreetLines(_mapFeatures);
let intersections = getIntersections(_mapFeatures);

let activeBuffer;
let prevActiveBuffer = false;

let streetsWalked = {
    'type': 'FeatureCollection',
    'features': []
}

let activeStreetCenter = {
    "type": "Feature",
    "geometry": {
        "type": "Point",
        "coordinates": []
    },
}
let activeIntersectionBuffers = {
    'type': 'FeatureCollection',
    'features': []
}

//Map setup
mapboxgl.accessToken = 'pk.eyJ1IjoiZGF2aWRhemFyIiwiYSI6ImNqdWFrZnk5ODAzbjU0NHBncHMyZ2JpNXUifQ.Kbdt8hM8CJIIryBWPSXczQ';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/davidazar/cjuaotgzk0fmo1flgh9nprrbo',
    center: [-73.993944, 40.729287],
    zoom: 16.6
});



map.on('load', () => {
    //Add the walked streets layer
    map.addLayer({
        "id": "walkedStreets",
        "type": "line",
        'paint': {
            'line-color': "rgba(36, 178, 31, 0.6)",
            'line-width': 8
        },
        'source': {
            'type': 'geojson',
            'data': streetsWalked
        },
    });


    map.addLayer({
        'id': 'streetCenter',
        'type': 'symbol',
        'source': {
            'type': 'geojson',
            'data': activeStreetCenter
        },
        'layout': {
            'icon-image': 'hospital-15'
        },
    });


    map.addLayer({
        'id': 'intersectionBuffers',
        'type': 'fill',
        'source': {
            'type': 'geojson',
            'data': activeIntersectionBuffers
        },
        'paint': {

            'fill-color': "#000000",
            'fill-opacity': 0.5

        }
    })
});



//Marker for live location
let liveLocationMarker = new mapboxgl.Marker({ draggable: 'true' })
    .setLngLat(point1.geometry.coordinates)
    .addTo(map);

//Marker for snapped location
let snappedLocationMarker = new mapboxgl.Marker({ "color": "#FA77C3" }).setLngLat([0, 0]).addTo(map);
//Add event listener for when dragging
liveLocationMarker.on('drag', onDrag);



//Function executed when dragging. This will get changed to a live location pushed from the phone
function onDrag() {
    // console.log("Dragging");
    //get a MapBox object with coordinates
    let liveLocation = liveLocationMarker.getLngLat();

    //Parse and create a Turf.js Point with the new location data
    let liveLng = liveLocation.lng;
    let liveLat = liveLocation.lat;
    let liveLocationPoint = turf.point([liveLng, liveLat]);


    //Get the closest line on a MapBox street from the Point
    let closestLine = closestLineToPoint(liveLocationPoint, _mapFeatures);
    //Find the nearest point inside a street to snap to
    let snappedLocation = turf.nearestPointOnLine(closestLine, liveLocationPoint, { 'units': 'meters' });

    //Show the snapped point on the MapBox map
    snappedLocationMarker.setLngLat(turf.getCoords(snappedLocation));

    let lineCenter = turf.center(closestLine);
    // console.log(`El centro de ${toString(closestLine)} es ${toString(lineCenter)}`);

    if (Math.abs(distanceBetween(lineCenter, snappedLocation)) < TOLERANCE_RADIUS_FOR_STREET_WALKED) {
        walkStreet(closestLine);

    }

    showStreetCenter(lineCenter);
    showWalkedStreets();
    showIntersectionBuffers(closestLine);
    getContainingBuffer(snappedLocation)


}

function getContainingBuffer(snappedLocation) {

    let bufferA = activeIntersectionBuffers.features[0];
    let bufferB = activeIntersectionBuffers.features[1];

    let insideA = turf.booleanContains(bufferA, snappedLocation);
    let insideB = turf.booleanContains(bufferB, snappedLocation);



    if (insideA) {
        activeBuffer = bufferA;
    } else if (insideB) {
        activeBuffer = bufferB;
    } else {
        if (prevActiveBuffer) {
            console.log("Exited Buffer");
            activeBuffer = undefined;
            prevActiveBuffer = false;
        }
    }

    if (!prevActiveBuffer && activeBuffer !== undefined) {
        console.log(`Entered  buffer ${toString(activeBuffer)}`);
        prevActiveBuffer = true;
    }





}


function showIntersectionBuffers(closetLine) {

    let pointA = turf.point(turf.getCoords(closetLine)[0]);
    let pointB = turf.point(turf.getCoords(closetLine)[1]);

    // console.log(`Point A   ${toString(pointA)}`);

    let bufferA = turf.buffer(pointA, RADIUS_FOR_INTERSECTION_BUFFER, { 'units': 'kilometers' });
    let bufferB = turf.buffer(pointB, RADIUS_FOR_INTERSECTION_BUFFER, { 'units': 'kilometers' });
    bufferA.properties.name = closetLine.properties.name + "A";
    bufferB.properties.name = closetLine.properties.name + "B";

    // console.log(`bufferA    ${toString(bufferA)}`);

    var result = turf.featureCollection([bufferA, bufferB]);

    activeIntersectionBuffers = result;

    map.getSource('intersectionBuffers').setData(activeIntersectionBuffers);

}


function showStreetCenter(point) {

    activeStreetCenter.geometry.coordinates = turf.getCoord(point);
    map.getSource('streetCenter').setData(activeStreetCenter);

}

//Update the layer data to show the saved streets
function showWalkedStreets() {
    map.getSource('walkedStreets').setData(streetsWalked);
}



//Save street in walked database
function walkStreet(street) {

    //If streets is not walked, add it to db.
    //TODO replace this with API endpoint
    if (streetsWalked.features.indexOf(street) === -1)
        streetsWalked.features.push(street);
}




let i = 0;
let points = turf.getCoords(multiPoints);

map.on('click', (e) => {
    let p = points[i];
    liveLocationMarker.setLngLat(p);
    i++;
    if (i >= points.length)
        i = 0;

    let closestLine = closestLineToPoint(p, _mapFeatures);
    let snapped = turf.nearestPointOnLine(closestLine, p, { 'units': 'meters' });

    snappedLocationMarker.setLngLat(turf.getCoords(snapped));


});


function closestLineToPoint(_point, _mapFeatures) {

    let closestLine;
    let shortestDistance = 1000;


    turf.featureEach(streetLines, (currentLine, lineIndex) => {
        let currentDistance = turf.pointToLineDistance(_point, currentLine, { 'units': 'meters' });
        if (currentDistance < shortestDistance) {
            closestLine = currentLine;
            shortestDistance = currentDistance;
        }
    });

    return closestLine;
}


function getStreetLines(_mapFeatures) {

    let streetLines = {
        'features': [],
        'type': "FeatureCollection"
    }

    turf.featureEach(_mapFeatures, (currentFeature, featureIndex) => {

        if (turf.getType(currentFeature) === 'LineString') {
            streetLines.features.push(currentFeature);
        }
    });

    return streetLines;
}

function getIntersections(_mapFeatures) {

    let intersections = {
        'features': [],
        'type': "FeatureCollection"
    }

    turf.featureEach(_mapFeatures, (currentFeature, featureIndex) => {

        if (turf.getType(currentFeature) === 'Point') {
            intersections.features.push(currentFeature);
        }
    });

    return intersections;
}



function toString(Object) {
    return JSON.stringify(Object, null, null);
}

function distanceBetween(point1, point2) {
    let distance = turf.distance(point1, point2, { options: 'kilometers' }) * 1000;
    return distance;
}