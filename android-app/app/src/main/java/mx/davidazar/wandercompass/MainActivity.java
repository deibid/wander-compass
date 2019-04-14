package mx.davidazar.wandercompass;

import android.Manifest;
import android.app.Notification;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.IntentSender;
import android.content.pm.PackageManager;
import android.location.Location;
import android.support.annotation.NonNull;
import android.support.v4.app.ActivityCompat;
import android.support.v4.content.ContextCompat;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;

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

public class MainActivity extends AppCompatActivity {




    private FusedLocationProviderClient fusedLocationClient;
    private LocationRequest locationRequest;
    private LocationCallback locationCallback;

    private TextView locationTv;
    private TextView updatesTv;
    private Button startBt;

    private int locationUpdates = 0;


    private static final int LOCATION_PERMISSION_REQUEST = 0;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);


        locationTv = findViewById(R.id.location);
        updatesTv = findViewById(R.id.locationUpdates);

        startBt = findViewById(R.id.startBt);

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
                    Log.d("Location Result loop",location.toString());
                    double lng = location.getLongitude();
                    double lat = location.getLatitude();
                    locationTv.setText(String.valueOf(lat) +"  ,  "+String.valueOf(lng));
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
}
