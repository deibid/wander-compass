package mx.davidazar.wandercompass;

import android.Manifest;
import android.app.Notification;
import android.app.PendingIntent;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.content.Context;
import android.content.Intent;
import android.content.IntentSender;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Handler;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.support.v4.app.ActivityCompat;
import android.support.v4.content.ContextCompat;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;


import com.github.nkzawa.emitter.Emitter;
import com.github.nkzawa.engineio.client.Transport;
import com.github.nkzawa.socketio.client.IO;
import com.github.nkzawa.socketio.client.Manager;
import com.github.nkzawa.socketio.client.Socket;
import com.google.android.gms.common.api.ResolvableApiException;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.LocationSettingsRequest;
import com.google.android.gms.location.LocationSettingsResponse;
import com.google.android.gms.location.SettingsClient;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;

import org.json.JSONException;
import org.json.JSONObject;

import java.net.URISyntaxException;
import java.util.List;


public class MainActivity extends AppCompatActivity implements View.OnClickListener{




    private FusedLocationProviderClient fusedLocationClient;
    private LocationRequest locationRequest;
    private LocationCallback locationCallback;



    private BluetoothAdapter mBluetoothAdapter;
    private boolean mScanning;
    private Handler mHandler;


    private static final long SCAN_PERIOD = 10000;




    private TextView locationTv;
    private TextView updatesTv;
    private Button scanBt;
    private TextView statusTv;
    private TextView resultTv;

    private int locationUpdates = 0;

    private Socket mSocket;
    private static final String EVENT_SEND_DIRECTIONS = "send-directions";

    private static final int LOCATION_PERMISSION_REQUEST = 0;
    private static final int REQUEST_ENABLE_INTENT = 1;





    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);


        initializeSocket();
        initializeBluetooth();

        mHandler = new Handler();


        locationTv = findViewById(R.id.location);
        updatesTv = findViewById(R.id.locationUpdates);

        scanBt = findViewById(R.id.scanBt);
        scanBt.setOnClickListener(this);


        statusTv = findViewById(R.id.scanStatus);
        resultTv = findViewById(R.id.scanResult);



        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            Log.d("Perm","Not Granted");
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.ACCESS_FINE_LOCATION},
                    LOCATION_PERMISSION_REQUEST);

        }else{
            Log.d("Perm","Permission granted");
        }


        createLocationRequest();
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);

        locationCallback = new LocationCallback(){

            @Override
            public void onLocationResult(LocationResult locationResult) {
                if(locationResult == null){
                    Log.d("Location Result","No location");
                    return;
                }

                for(Location location : locationResult.getLocations()){
                    Log.d("Location Result Loop","Recibi Locations #"+locationResult.getLocations().size());
                    Log.d("Location Result loop",location.toString());
                    double lng = location.getLongitude();
                    double lat = location.getLatitude();
                    locationTv.setText(String.valueOf(lat) +"  ,  "+String.valueOf(lng));
                    sendLocationToServer(lng,lat);
                }

                locationUpdates++;
                updatesTv.setText(String.valueOf(locationUpdates));


            }

        };





//        //Pending intent for background tracking
//        startBt.setOnClickListener(new View.OnClickListener(){
//            @Override
//            public void onClick(View v) {
//
//                Intent notificationIntent = new Intent(this, ExampleActivity.class);
//                PendingIntent pendingIntent =
//                        PendingIntent.getActivity(this, 0, notificationIntent, 0);
//
//                Notification notification =
//                        new Notification.Builder(this, CHANNEL_DEFAULT_IMPORTANCE)
//                                .setContentTitle(getText(R.string.notification_title))
//                                .setContentText(getText(R.string.notification_message))
//                                .setSmallIcon(R.drawable.icon)
//                                .setContentIntent(pendingIntent)
//                                .setTicker(getText(R.string.ticker_text))
//                                .build();
//
//                getApplicationContext().startForeground(ONGOING_NOTIFICATION_ID, notification);
//
//
//            }
//        });

    }


    @Override
    protected void onResume() {
        super.onResume();
        startLocationUpdates();
    }



    private void startLocationUpdates(){


        fusedLocationClient.requestLocationUpdates(locationRequest,locationCallback,null);

    }



    protected void createLocationRequest(){

        locationRequest = LocationRequest.create();
        locationRequest.setInterval(2000);
        locationRequest.setFastestInterval(1000);
        locationRequest.setPriority(LocationRequest.PRIORITY_HIGH_ACCURACY);


        LocationSettingsRequest.Builder settingBuilder = new LocationSettingsRequest.Builder()
                .addLocationRequest(locationRequest);

        SettingsClient client = LocationServices.getSettingsClient(this);
        Task <LocationSettingsResponse> task = client.checkLocationSettings(settingBuilder.build());


        task.addOnSuccessListener(this, new OnSuccessListener<LocationSettingsResponse>() {
            @Override
            public void onSuccess(LocationSettingsResponse locationSettingsResponse) {
                Log.d("Task Settings","Success");
            }
        });


        task.addOnFailureListener(this, new OnFailureListener() {
            @Override
            public void onFailure(@NonNull Exception e) {

                if (e instanceof ResolvableApiException) {
                    try{
                        ResolvableApiException resolvable = (ResolvableApiException) e;
                        resolvable.startResolutionForResult(MainActivity.this, 0);
                    }catch( IntentSender.SendIntentException sendEx){
                    }
                }
            }
        });
    }



    private void initializeSocket(){

        Log.d("socket", "init");

        try{


            mSocket = IO.socket("http://192.168.1.3:3000");
            mSocket.connect();


            mSocket.on(Socket.EVENT_CONNECT, new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    Log.d("socket", "Connected");
//
//                    mSocket.emit("foo","HI");
//                    mSocket.disconnect();
                    Log.d("Socket","CONNECTED");
                }
            }).on(EVENT_SEND_DIRECTIONS, new Emitter.Listener() {
                @Override
                public void call(Object... args) {


                    JSONObject obj = (JSONObject)args[0];
                    Log.d("Recibí objeto", obj.toString());


                }
            }).on(Socket.EVENT_DISCONNECT, new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    Log.d("Socket", "Disconneted");
                }
            });


//            mSocket.io().on(Manager.EVENT_TRANSPORT, new Emitter.Listener() {
//                @Override
//                public void call(Object... args) {
//                    Transport transport = (Transport) args[0];
//                    transport.on(Transport.EVENT_ERROR, new Emitter.Listener() {
//                        @Override
//                        public void call(Object... args) {
//                            Exception e = (Exception) args[0];
//                            Log.e("Transport", "Transport error " + e);
//                            e.printStackTrace();
//                            e.getCause().printStackTrace();
//                        }
//                    });
//                }
//            });






        }catch(URISyntaxException e){
            Log.d("Error",e.toString());
        }

    }

    private void sendLocationToServer(double lng,double lat){


        try{

            JSONObject obj = new JSONObject();
            obj.put("lng",lng);
            obj.put("lat",lat);
            mSocket.emit("new-location-from-phone", obj);

        }catch(JSONException je){
            Log.d("error with JSON", je.toString());
        }

    }



    private void initializeBluetooth(){


        final BluetoothManager manager = (BluetoothManager)getSystemService(Context.BLUETOOTH_SERVICE);
        mBluetoothAdapter = manager.getAdapter();


        if(mBluetoothAdapter == null || !mBluetoothAdapter.isEnabled()){

            Intent enableBTIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
            startActivityForResult(enableBTIntent,REQUEST_ENABLE_INTENT);


        }





    }



    private void startLEScan(final boolean enable){


        final BluetoothLeScanner scanner = mBluetoothAdapter.getBluetoothLeScanner();


        Log.d("Bluetooth","Scanning...");
        statusTv.setText(R.string.scanning);

        if(enable){

            mHandler.postDelayed(new Runnable() {
                @Override
                public void run() {
                    mScanning = false;
                    scanner.stopScan(mLeScanCallback);
                    scanBt.setEnabled(true);

                }
            },SCAN_PERIOD);

            scanner.startScan(mLeScanCallback);
            mScanning = true;
            scanBt.setEnabled(false);

        }else{
            scanner.stopScan(mLeScanCallback);
            mScanning = false;
            scanBt.setEnabled(true);
        }

    }



    private ScanCallback mLeScanCallback = new ScanCallback() {
        @Override
        public void onScanResult(int callbackType, ScanResult result) {
            super.onScanResult(callbackType, result);
            statusTv.setText("Scan Successful");
        }

        @Override
        public void onBatchScanResults(List<ScanResult> results) {
            super.onBatchScanResults(results);
            statusTv.setText("Results go here");
            Log.d("Bluetooth Scan",results.toString());
        }

        @Override
        public void onScanFailed(int errorCode) {
            super.onScanFailed(errorCode);
            statusTv.setText("Scan Error");
        }

    };




    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        switch (requestCode){
            case REQUEST_ENABLE_INTENT:
                Toast.makeText(this,"Bluetooth enabled",Toast.LENGTH_LONG);
                break;
        }

    }


    @Override
    public void onClick(View v) {

        switch (v.getId()){

            case R.id.scanBt:
                startLEScan(true);
                break;

        }


    }



}
