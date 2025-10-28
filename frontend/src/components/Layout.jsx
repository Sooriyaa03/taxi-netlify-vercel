import React, { useState, useEffect } from 'react';
import MapView from './MapView';
import axios from 'axios';
import { useDebounce } from 'use-debounce';

const shortenDisplayName = (displayName) => {
  const parts = displayName.split(',');
  return parts.slice(0, 2).join(',');
};

const Layout = () => {
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);

  const [pickupQuery, setPickupQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [debouncedPickup] = useDebounce(pickupQuery, 500);
  const [debouncedDest] = useDebounce(destQuery, 500);

  useEffect(() => {
    if (debouncedPickup) {
      axios
        .get(`https://nominatim.openstreetmap.org/search?format=json&q=${debouncedPickup}`)
        .then(res => setPickupSuggestions(res.data));
    } else {
      setPickupSuggestions([]);
    }
  }, [debouncedPickup]);

  useEffect(() => {
    if (debouncedDest) {
      axios
        .get(`https://nominatim.openstreetmap.org/search?format=json&q=${debouncedDest}`)
        .then(res => setDestSuggestions(res.data));
    } else {
      setDestSuggestions([]);
    }
  }, [debouncedDest]);

  // Calculate real road distance using OSRM API
  useEffect(() => {
    if (pickup && destination) {
      const { lon: lon1, lat: lat1 } = pickup;
      const { lon: lon2, lat: lat2 } = destination;

      axios
        .get(`https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}`)
        .then(response => {
          const route = response.data.routes[0];
          setDistance((route.distance / 1000).toFixed(2)); // km
          setDuration(Math.round(route.duration / 60)); // minutes
        })
        .catch(err => console.error("Error fetching route:", err));
    }
  }, [pickup, destination]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <MapView pickup={pickup} destination={destination} distance={distance} />

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '350px',
        background: 'rgba(14, 11, 11, 0.8)',
        padding: '1rem',
        boxSizing: 'border-box',
        zIndex: 1000,
        height: '100%'
      }}>
        <h1 style={{ color: 'white' }}>Book a Ride</h1>

        {/* Pickup input */}
        <div>
          <h3 style={{ color: 'white' }}>Pick up Location</h3>
          <input
            type="text"
            value={pickupQuery}
            onChange={(e) => setPickupQuery(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
          {pickupSuggestions.length > 0 && (
            <ul style={{ background: 'black', listStyle: 'none', padding: 0, marginTop: 5 }}>
              {pickupSuggestions.map(s => (
                <li
                  key={s.place_id}
                  onClick={() => {
                    setPickup(s);
                    setPickupQuery(shortenDisplayName(s.display_name));
                    setPickupSuggestions([]);
                  }}
                  style={{ padding: '5px', cursor: 'pointer' }}
                >
                  {shortenDisplayName(s.display_name)}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Destination input */}
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ color: 'white' }}>Destination</h3>
          <input
            type="text"
            value={destQuery}
            onChange={(e) => setDestQuery(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
          {destSuggestions.length > 0 && (
            <ul style={{ background: 'black', listStyle: 'none', padding: 0, marginTop: 5 }}>
              {destSuggestions.map(s => (
                <li
                  key={s.place_id}
                  onClick={() => {
                    setDestination(s);
                    setDestQuery(shortenDisplayName(s.display_name));
                    setDestSuggestions([]);
                  }}
                  style={{ padding: '5px', cursor: 'pointer' }}
                >
                  {shortenDisplayName(s.display_name)}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Trip details */}
        {distance > 0 && (
          <div style={{ marginTop: '2rem', color: 'white' }}>
            <h2>Trip Details</h2>
            <p><strong>Road Distance:</strong> {distance} km</p>
            <p><strong>Estimated Time:</strong> {duration} minutes</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout;
