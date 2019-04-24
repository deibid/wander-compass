let turf = require('@turf/turf');
// import * as turf from '@turf/turf';
// import {nearestPointOnLine} from '@turf/nearest-point-on-line';
const _mapFeatures = require('./data/mapFeatures');
const events = require('./events');


let io;

//Distance in meters between a location point and the center of the street to count it as walked
const TOLERANCE_RADIUS_FOR_STREET_WALKED = 2.5;

//Size of the hotspots at every intersection in meters
const RADIUS_FOR_INTERSECTION_BUFFER = 20 / 1000;

let point1 = turf.point([-73.995044, 40.729716]);

let mStreetLines = getStreetLines(_mapFeatures);
let mIntersections = getIntersections(_mapFeatures);

let mActiveBuffer;
let mWasInBuffer = false;

let mStreetsWalked = {
  'type': 'FeatureCollection',
  'features': []
}

let mActiveStreetCenter = {
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": []
  },
}
let mActiveIntersectionBuffers = {
  'type': 'FeatureCollection',
  'features': []
}



module.exports.attachIO = function (_io) {
  io = _io;
}

module.exports.test = () => {
  console.log("Test function form another module");
}


module.exports.onNewLocation = function (msg) {


  //get a MapBox object with coordinates
  // let liveLocation = liveLocationMarker.getLngLat();

  //Parse and create a Turf.js Point with the new location data
  let liveLng = msg.lng;
  let liveLat = msg.lat;
  let liveLocationPoint = turf.point([liveLng, liveLat]);


  //Get the closest line on a MapBox street from the Point
  //Find the nearest point inside a street to snap to

  let closestStreet = closestLineToPoint(liveLocationPoint, _mapFeatures);

  // let closestStreet = closestLineToPoint(liveLocationPoint, mStreetLines);
  let snappedLocation = turf.nearestPointOnLine(closestStreet, liveLocationPoint, { 'units': 'kilometers' });

  let markers = {
    'real': turf.getCoords(liveLocationPoint),
    'snapped': turf.getCoords(snappedLocation)
  };
  io.emit(events.SEND_LOCATION_MARKERS, markers);

  let streetName = getFeatureName(closestStreet);
  io.emit(events.DISPLAY_STREET, streetName);


  //Show the snapped point on the MapBox map
  // snappedLocationMarker.setLngLat(turf.getCoords(snappedLocation));

  let snappedLocationCoords = turf.getCoords(snappedLocation);
  console.log(`snapped Location Coords ${snappedLocationCoords}`);

  io.emit(events.DISPLAY_LOCATION, snappedLocationCoords);
  // UI.displayLocation(snappedLocationMarker.getLngLat());


  let lineCenter = turf.center(closestStreet);
  showStreetCenter(lineCenter);

  if (Math.abs(distanceBetween(lineCenter, snappedLocation)) < TOLERANCE_RADIUS_FOR_STREET_WALKED) {
    walkStreet(closestStreet);
  }

  showWalkedStreets();

  findIntersectionBuffers(closestStreet);
  showIntersectionBuffers(closestStreet);

  let containingBuffer = findContainingBuffer(snappedLocation);
  // if (containingBuffer !== undefined)
  // UI.displayActiveIntersection(getFeatureName(containingBuffer));

  //Enter buffer
  if (!mWasInBuffer && containingBuffer !== undefined) {
    console.log(`Entered Buffer ${toString(containingBuffer)}`);

    let availableStreets = getAvailableStreetsForDirections(mStreetsWalked, containingBuffer);
    mWasInBuffer = true;
  }

  //Exit buffer
  if (mWasInBuffer && containingBuffer === undefined) {
    console.log(`Exited Buffer`);
    mWasInBuffer = false;
    // UI.displayActiveIntersection("-");
  }
}

function getAvailableStreetsForDirections(streetsWalked, containingBuffer) {


  let availableStreets = [];

  let streetNamesAtIntersection = containingBuffer.properties.streets;
  streetNamesAtIntersection.forEach(name => {
    let street = getStreetByName(name);
    availableStreets.push(street);
  });



  let temp = availableStreets.filter(street => !mStreetsWalked.features.includes(street));
  console.log(`Las calles NO caminadas para la interseccion ${containingBuffer.properties.name} son:__>   \n${toString(temp)}`);


  let names = "";
  temp.forEach(street => {
    names += street.properties.name + " ";
  });

  UI.displayAvailableStreets(names);

}

// function getStreetsForIntersection(containingBuffer) {

// }

function getPossibleStreetsNames(containingBuffer) {

  return containingBuffer.properties.streets;


}

function getWalkedStreetNames() {

  let streetsWalked_Names = [];
  mStreetsWalked.featureEach((street, index) => {
    streetsWalked_Names.push(street.properties.name);
  });

  return streetsWalked_Names;

}
function getAvailableStreets() {

  let streetsWalkedNames = [];

  turf.featureEach(mStreetsWalked, (currentFeature, futureIndex) => {
    console.log(`Esta calle ya se camino ${toString(currentFeature)}`);
    let name = currentFeature.properties.name;
    if (streetsWalkedNames.indexOf(name) === -1)
      streetsWalkedNames.push(currentFeature.properties.name);
  });

  let availableStreetsForIntersection = mActiveBuffer.properties.streets;
  let streetsNotWalked = availableStreetsForIntersection.filter(streetName => streetsWalkedNames.indexOf(streetName) !== 1);
  console.log(`Las calles disponibles para la interseccion ${mActiveBuffer.properties.name} son: ${streetsNotWalked}`);

}


function findContainingBuffer(snappedLocation) {

  let bufferA = mActiveIntersectionBuffers.features[0];
  let bufferB = mActiveIntersectionBuffers.features[1];

  let insideA = turf.booleanContains(bufferA, snappedLocation);
  let insideB = turf.booleanContains(bufferB, snappedLocation);


  if (insideA) {
    return bufferA;
  } else if (insideB) {
    return bufferB;
  } else {
    return undefined;
  }

}

function findIntersectionBuffers(street) {

  //find the Points from the collection that match the street that is being walked
  let streetIntersections = getIntersectionsForStreet(street);

  let pointA = streetIntersections[0];
  let pointB = streetIntersections[1];

  // console.log(`Antes de hacer el buffer. Los puntos son: __> ${toString(pointA)} \n y ${toString(pointB)}`)


  let bufferA = turf.buffer(pointA, RADIUS_FOR_INTERSECTION_BUFFER, { 'units': 'kilometers' });
  let bufferB = turf.buffer(pointB, RADIUS_FOR_INTERSECTION_BUFFER, { 'units': 'kilometers' });


  let result = turf.featureCollection([bufferA, bufferB]);

  mActiveIntersectionBuffers = result;


}


function showIntersectionBuffers() {
  io.emit(events.DISPLAY_INTERSECTION_BUFFERS, mActiveIntersectionBuffers);
  // map.getSource('intersectionBuffers').setData(mActiveIntersectionBuffers);
}

/**
* Finds the two Point features that correspond to that street
* @param {Street being walked} street 
*/
function getIntersectionsForStreet(street) {


  console.log(`getIntersectionForStreet`);
  console.log(`Street Name ${toString(street)}`);
  console.log(`mIntersections ${toString(mIntersections)}`);
  let streetName = street.properties.name;
  let streetIntersections = [];
  mIntersections.features.forEach(intersection => {
    if (intersection.properties.streets.indexOf(streetName) !== -1) {
      streetIntersections.push(intersection);
    };
  });

  return streetIntersections;
}


function showStreetCenter(point) {

  mActiveStreetCenter.geometry.coordinates = turf.getCoord(point);
  // map.getSource('streetCenter').setData(mActiveStreetCenter);
  io.emit(events.SHOW_STREET_CENTER, mActiveStreetCenter);

}

//Update the layer data to show the saved streets
function showWalkedStreets() {
  io.emit(events.SHOW_WALKED_STREETS, mStreetsWalked);
  // map.getSource('walkedStreets').setData(mStreetsWalked);
}



//Save street in walked database
function walkStreet(street) {

  //If streets is not walked, add it to db.
  //TODO replace this with API endpoint
  if (mStreetsWalked.features.indexOf(street) === -1)
    mStreetsWalked.features.push(street);
}




// let i = 0;
// let points = turf.getCoords(multiPoints);

// map.on('click', (e) => {
//     let p = points[i];
//     liveLocationMarker.setLngLat(p);
//     i++;
//     if (i >= points.length)
//         i = 0;

//     let closestLine = closestLineToPoint(p, _mapFeatures);
//     let snapped = turf.nearestPointOnLine(closestLine, p, { 'units': 'meters' });

//     snappedLocationMarker.setLngLat(turf.getCoords(snapped));


// });


function closestLineToPoint(_point, _mapFeatures) {

  let closestLine;
  let shortestDistance = 1000;

  console.log("antes de revisar");
  console.log(`mStreetLines:> ${toString(mStreetLines)}`);
  turf.featureEach(mStreetLines, (currentLine, lineIndex) => {
    console.log("Estoy revisando");
    let currentDistance = turf.pointToLineDistance(_point, currentLine, { 'units': 'meters' });
    if (currentDistance < shortestDistance) {
      closestLine = currentLine;
      shortestDistance = currentDistance;
    }
  });

  return closestLine;
}


function getFeatureName(feature) {
  return feature.properties.name;
}


function getStreetByName(name) {


  let street;
  mStreetLines.features.forEach(_street => {
    // console.log(`Probando ${toString(_street)}`)
    if (_street.properties.name === name) {
      // console.log(`Paso la prueba`);
      street = _street;
    }
  });

  return street;


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


  // _mapFeatures.features.forEach((currentFeature) => {
  //   // if (turf.getType(currentFeature) === 'LineString') {
  //   //   streetLines.features.push(currentFeature);
  //   // }

  //   if (currentFeature.type === 'LineString') {
  //     streetLines.features.push(currentFeature);
  //   }

  // });

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



