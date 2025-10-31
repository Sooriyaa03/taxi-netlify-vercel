import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';

const Routing = ({ pickup, destination }) => {
  const map = useMap();
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!map) return;
    if (routingControlRef.current) map.removeControl(routingControlRef.current);

    if (pickup && destination) {
      routingControlRef.current = L.Routing.control({
        waypoints: [
          L.latLng(pickup.lat, pickup.lon),
          L.latLng(destination.lat, destination.lon)
        ],
        routeWhileDragging: true,
        show: false,
        createMarker: () => null
      }).addTo(map);
    }
  }, [map, pickup, destination]);

  return null;
};

const MapView = ({ pickup, destination, distance }) => {
  const [currentPosition, setCurrentPosition] = useState([13.0827, 80.2707]);
  const [rain, setRain] = useState(false);
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(pos => {
      setCurrentPosition([pos.coords.latitude, pos.coords.longitude]);
    });
  }, []);

  const handlePredict = async () => {
  if (!pickup || !distance) {
    alert("Please select pickup and destination first!");
    return;
  }

  const mainPoints = [
    { name: "Tambaram", lat: 12.9229, lon: 80.1275 },
    { name: "Velachery", lat: 12.9798, lon: 80.2209 },
    { name: "Guindy", lat: 13.0109, lon: 80.2127 },
    { name: "T Nagar", lat: 13.0418, lon: 80.2337 },
    { name: "Adyar", lat: 13.0067, lon: 80.2550 },
    { name: "Nungambakkam", lat: 13.0604, lon: 80.2376 },
    { name: "Anna Nagar", lat: 13.0878, lon: 80.2138 },
    { name: "Central", lat: 13.0827, lon: 80.2707 },
    { name: "Airport", lat: 12.9941, lon: 80.1709 },
  ];

  const nearest = mainPoints.reduce((prev, curr) => {
    const dPrev = Math.hypot(pickup.lat - prev.lat, pickup.lon - prev.lon);
    const dCurr = Math.hypot(pickup.lat - curr.lat, pickup.lon - curr.lon);
    return dCurr < dPrev ? curr : prev;
  });

  const now = new Date();
  const weekday = now.getDay() === 0 || now.getDay() === 6 ? "No" : "Yes";
  const hour = now.getHours();

  const payload = {
    start_location: nearest.name,
    distance_km: parseFloat(distance),
    rain: rain ? "Yes" : "No",
    weekday,
    hour
  };

  try {
    // 🔹 1. Send to PythonAnywhere
    const res = await fetch("https://taxidemand.pythonanywhere.com/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setPrediction(data.predicted_demand);

    // 🔹 2. Send same request to AWS (does not affect UI)
    fetch("https://rh7845qsbh.execute-api.us-east-2.amazonaws.com/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

  } catch (error) {
    console.error("Prediction failed:", error);
    alert("Error predicting demand. Please try again.");
  }
};


  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <MapContainer center={currentPosition} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© OpenStreetMap contributors'
        />
        {pickup && <Marker position={[pickup.lat, pickup.lon]}><Popup>Pickup</Popup></Marker>}
        {destination && <Marker position={[destination.lat, destination.lon]}><Popup>Destination</Popup></Marker>}
        <Routing pickup={pickup} destination={destination} />
      </MapContainer>

      {/* Floating Overlay */}
      <div
        style={{
          position: "absolute",
          bottom: "30px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0, 0, 0, 0.75)",
          color: "white",
          padding: "12px 20px",
          borderRadius: "12px",
          display: "flex",
          gap: "20px",
          alignItems: "center",
          zIndex: 1000,
        }}
      >
        <button
          onClick={() => setRain(prev => !prev)}
          style={{
            background: rain ? "#3498db" : "#555",
            color: "white",
            border: "none",
            padding: "8px 14px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          {rain ? "🌧️ Rain: ON" : "☀️ Rain: OFF"}
        </button>

        <button
          onClick={handlePredict}
          style={{
            background: "#27ae60",
            color: "white",
            border: "none",
            padding: "8px 14px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          ⚡ Predict Demand
        </button>

        {prediction && (
          <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
            Demand: {(prediction)}{"=>"}{" "}
            {prediction < 30
              ? "Low"
              : prediction <= 50
              ? "Moderate"
              : "High"}
            <br />
            Price per km: Rs.{(prediction / 10) * 5}
          </span>
        )}

      </div>
    </div>
  );
};

export default MapView;
