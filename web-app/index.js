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

// //Map Setup
mapboxgl.accessToken = 'pk.eyJ1IjoiZGF2aWRhemFyIiwiYSI6ImNqdWFrZnk5ODAzbjU0NHBncHMyZ2JpNXUifQ.Kbdt8hM8CJIIryBWPSXczQ';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/davidazar/cjukkxnww88nb1fqtgh1ovfmj',
    center: [-73.993944, 40.729499],
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

    findIntersectionBuffers(closestLine);
    showIntersectionBuffers(closestLine);

    let containingBuffer = findContainingBuffer(snappedLocation, closestLine);

    if (!prevActiveBuffer && containingBuffer !== undefined) {
        console.log(`Entered Buffer ${toString(containingBuffer)}`);
        prevActiveBuffer = true;
    }

    if (prevActiveBuffer && containingBuffer === undefined) {
        console.log(`Exited Buffer`);
        prevActiveBuffer = false;
    }









}

function getAvailableStreets() {

    activeBuffer;
    intersections;
    streetsWalked;

    let streetsWalkedNames = [];

    turf.featureEach(streetsWalked, (currentFeature, futureIndex) => {
        console.log(`Esta calle ya se camino ${toString(currentFeature)}`);
        let name = currentFeature.properties.name;
        if (streetsWalkedNames.indexOf(name) === -1)
            streetsWalkedNames.push(currentFeature.properties.name);
    });

    let availableStreetsForIntersection = activeBuffer.properties.streets;
    let streetsNotWalked = availableStreetsForIntersection.filter(streetName => streetsWalkedNames.indexOf(streetName) !== 1);
    console.log(`Las calles disponibles para la interseccion ${activeBuffer.properties.name} son: ${streetsNotWalked}`);




}


function findContainingBuffer(snappedLocation, closesLine) {

    let bufferA = activeIntersectionBuffers.features[0];
    let bufferB = activeIntersectionBuffers.features[1];

    let insideA = turf.booleanContains(bufferA, snappedLocation);
    let insideB = turf.booleanContains(bufferB, snappedLocation);



    if (insideA) {
        return bufferA;
    } else if (insideB) {
        return bufferB;
    } else {
        return undefined;
    }

    // if (!prevActiveBuffer && activeBuffer !== undefined) {
    //     let intersection = activeBuffer.properties.name;
    //     let walkingFrom = activeBuffer.properties.walkingFrom;
    //     console.log(`Entered  buffer ${intersection} walking from ${walkingFrom}`);
    //     getAvailableStreets();
    //     prevActiveBuffer = true;
    // }

    //---------



    // let bufferA = activeIntersectionBuffers.features[0];
    // let bufferB = activeIntersectionBuffers.features[1];

    // let insideA = turf.booleanContains(bufferA, snappedLocation);
    // let insideB = turf.booleanContains(bufferB, snappedLocation);



    // if (insideA) {
    //     activeBuffer = bufferA;
    // } else if (insideB) {
    //     activeBuffer = bufferB;
    // } else {
    //     if (prevActiveBuffer) {
    //         let intersection = activeBuffer.properties.name;

    //         console.log(`Exited  buffer ${intersection}`);
    //         activeBuffer = undefined;
    //         prevActiveBuffer = false;
    //     }
    // }

    // if (!prevActiveBuffer && activeBuffer !== undefined) {
    //     let intersection = activeBuffer.properties.name;
    //     let walkingFrom = activeBuffer.properties.walkingFrom;
    //     console.log(`Entered  buffer ${intersection} walking from ${walkingFrom}`);
    //     getAvailableStreets();
    //     prevActiveBuffer = true;
    // }


}

function findIntersectionBuffers(closestLine) {

    //find the Points from the collection that match the street that is being walked
    let streetIntersections = getIntersectionsForStreet(closestLine);

    let pointA = streetIntersections[0];//turf.point(turf.getCoords(closestLine)[0]);
    let pointB = streetIntersections[1];//turf.point(turf.getCoords(closestLine)[1]);

    // console.log(`Antes de hacer el buffer. Los puntos son: __> ${toString(pointA)} \n y ${toString(pointB)}`)


    let bufferA = turf.buffer(pointA, RADIUS_FOR_INTERSECTION_BUFFER, { 'units': 'kilometers' });
    let bufferB = turf.buffer(pointB, RADIUS_FOR_INTERSECTION_BUFFER, { 'units': 'kilometers' });


    let result = turf.featureCollection([bufferA, bufferB]);

    activeIntersectionBuffers = result;

}


function showIntersectionBuffers(closestLine) {
    map.getSource('intersectionBuffers').setData(activeIntersectionBuffers);
}

function getIntersectionsForStreet(closestLine) {


    // console.log(`Availbale intersctions are____>>>> ${toString(intersections)}`)
    let streetName = closestLine.properties.name;
    let streetIntersections = [];
    intersections.features.forEach(intersection => {
        // console.log("Dentro del loop");
        // console.log(`Estoy comparando ${toString(intersection)} con ${streetName} `);
        if (intersection.properties.streets.indexOf(streetName) !== -1) {
            // console.log("Pasa la prueba");
            streetIntersections.push(intersection);
        };
    });

    // console.log(`Para la calle ${streetName}, las intersecciones posibles son: ${toString(streetIntersections)}`);
    return streetIntersections;





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