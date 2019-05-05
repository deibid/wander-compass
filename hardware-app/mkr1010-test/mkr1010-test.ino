/*
  Button LED

  This example creates a BLE peripheral with service that contains a
  characteristic to control an LED and another characteristic that
  represents the state of the button.

  The circuit:
  - Arduino MKR WiFi 1010 or Arduino Uno WiFi Rev2 board
  - Button connected to pin 4

  You can use a generic BLE central app, like LightBlue (iOS and Android) or
  nRF Connect (Android), to interact with the services and characteristics
  created in this sketch.

  This example code is in the public domain.
*/

#include <ArduinoBLE.h>

const int ledPin = LED_BUILTIN; // set ledPin to on-board LED
const int buttonPin = 4; // set buttonPin to digital pin 4

BLEService ledService("19B10010-E8F2-537E-4F6C-D104768A1214"); // create service

// create switch characteristic and allow remote device to read and write
BLEByteCharacteristic ledCharacteristic("19B10011-E8F2-537E-4F6C-D104768A1214", BLERead | BLEWrite);
// create button characteristic and allow remote device to get notifications
BLEByteCharacteristic buttonCharacteristic("19B10012-E8F2-537E-4F6C-D104768A1214", BLERead | BLENotify);

// Wander Compass characteristic. Write only
BLEByteCharacteristic directionCharacteristic("19B10013-E8F2-537E-4F6C-D104768A1214", BLEWrite);
const int DIRECTIONS_REST = -1;

int mPreviousDirection = DIRECTIONS_REST;


int motor_left = 12;
int motor_center = 13;
int motor_right = 9;


boolean displayConnectionStatus = true;


void setup() {

  pinMode(motor_left, OUTPUT);
  pinMode(motor_center, OUTPUT);
  pinMode(motor_right, OUTPUT);

  analogWrite(motor_left,0);
  analogWrite(motor_center,0);
  analogWrite(motor_right,0);
  
//  Serial.begin(9600);
//  while (!Serial);

  pinMode(ledPin, OUTPUT); // use the LED as an output
  pinMode(buttonPin, INPUT_PULLUP); // use button pin as an input

  // begin initialization
  if (!BLE.begin()) {
    Serial.println("starting BLE failed!");

    while (1);
  }

  // set the local name peripheral advertises
  //  BLE.setLocalName("ButtonLED");
  BLE.setLocalName("Wander Compass");

  // set the UUID for the service this peripheral advertises:
  BLE.setAdvertisedService(ledService);

  // add the characteristics to the service
  ledService.addCharacteristic(ledCharacteristic);
  ledService.addCharacteristic(buttonCharacteristic);

  ledService.addCharacteristic(directionCharacteristic);


  // add the service
  BLE.addService(ledService);

  ledCharacteristic.writeValue(0);
  buttonCharacteristic.writeValue(0);
  directionCharacteristic.writeValue(DIRECTIONS_REST);

  // start advertising
  BLE.advertise();

//  Serial.println("Bluetooth device active, waiting for connections...");


  
  


}

void loop() {
  // poll for BLE events
  BLE.poll();

  if(BLE.connected() && displayConnectionStatus){
//    Serial.println("DEVICE CONNECTED");
    displayConnectionStatus = false;
  }

  if(!BLE.connected()){
    displayConnectionStatus = true;
  }

  // read the current button pin state
  char buttonValue = digitalRead(buttonPin);

  // has the value changed since the last read
  boolean buttonChanged = (buttonCharacteristic.value() != buttonValue);

  if (buttonChanged) {
    // button state changed, update characteristics
    ledCharacteristic.writeValue(buttonValue);
    buttonCharacteristic.writeValue(buttonValue);
  }

  if (ledCharacteristic.written() || buttonChanged) {
    // update LED, either central has written to characteristic or button state has changed
    if (ledCharacteristic.value()) {
//      Serial.println("LED on");
      digitalWrite(ledPin, HIGH);
    } else {
//      Serial.println("LED off");
      digitalWrite(ledPin, LOW);
    }
  }



  int directions = directionCharacteristic.value();


  if (directions != DIRECTIONS_REST && directions != 255) {

//    Serial.println("Tengo direcciones del Wander Compass");
//    Serial.println("Tu siguiente direccion es:");
//    Serial.println(directions);
    int motor;
    switch (directions) {
      case 0:
        motor = motor_left;
        break;
      case 1:
        motor = motor_center;
        break;
      case 2:
        motor = motor_right;
        break;
    }
    turnOnMotor(motor);
    directionCharacteristic.writeValue(DIRECTIONS_REST);

  }



}


void turnOnMotor(int motor) {


  analogWrite(motor, 255);
  delay(1000);
  analogWrite(motor, 0);



}
