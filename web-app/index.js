// let bbox = turf.bbox(features);

let point1 = turf.point([-73.995044, 40.729716]);
let point2 = turf.point([-73.994886, 40.729189]);
let point3 = turf.point([-73.993946, 40.729001]);
let point4 = turf.point([-73.993494, 40.729629]);

let multiPoints = turf.multiPoint([[-73.995044, 40.729716], [-73.994886, 40.729189], [-73.993946, 40.729001], [-73.993494, 40.729629]]);
let streetLines = getStreetLines(_mapFeatures);

let streetsWalked = {
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

// map.on('load', () => {
//     map.addLayer({
//         "id": "walkedStreets",
//         "type": "line",
//         'paint': {
//             'line-color': "#50FA7B",
//         },
//         'source': {
//             'type': 'geojson',
//             'data': streetsWalked
//         },

//     });
// });



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
    console.log("Dragging");
    //get a MapBox object with coordinates
    let liveLocation = liveLocationMarker.getLngLat();

    //Parse and create a Turf.js Point with the new location data
    let liveLng = liveLocation.lng;
    let liveLat = liveLocation.lat;
    let liveLocationPoint = turf.point([liveLng, liveLat]);


    //Get the closest line on a MapBox street from the Point
    let closestLine = closestLineToPoint(liveLocationPoint, _mapFeatures);
    //Find the nearest point inside a street to snap to
    let snapped = turf.nearestPointOnLine(closestLine, liveLocationPoint, { 'units': 'meters' });

    //Show the snapped point on the MapBox map
    snappedLocationMarker.setLngLat(turf.getCoords(snapped));


    walkStreet(closestLine);
    showWalkedStreets();
}


function showWalkedStreets() {
    map.addLayer({
        "id": "walkedStreets",
        "type": "line",
        'paint': {
            'line-color': "#50FA7B",
        },
        'source': {
            'type': 'geojson',
            'data': streetsWalked
        },

    });


}



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
        console.log(`Distance_>   ${currentDistance} para ${currentLine.properties.name}`);
        if (currentDistance < shortestDistance) {
            closestLine = currentLine;
            shortestDistance = currentDistance;
        }
    });

    console.log(`Closest->   ${closestLine.properties.name}`);
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
