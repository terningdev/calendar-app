import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { ticketService } from '../services/ticketService';
import { useTranslation } from '../utils/translations';

const Maps = () => {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [geocoder, setGeocoder] = useState(null);
  const [infoWindow, setInfoWindow] = useState(null);

  // Google Maps API key from environment variable
  const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

  // Load Google Maps Script
  useEffect(() => {
    const loadGoogleMapsScript = () => {
      if (!GOOGLE_MAPS_API_KEY) {
        toast.error('Google Maps API key is not configured. Please add REACT_APP_GOOGLE_MAPS_API_KEY to your .env file.');
        setLoading(false);
        return;
      }

      if (window.google && window.google.maps) {
        initializeMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      script.onerror = () => {
        toast.error('Failed to load Google Maps. Please check your API key.');
        setLoading(false);
      };
      document.head.appendChild(script);
    };

    loadGoogleMapsScript();
  }, []);

  // Initialize Google Map
  const initializeMap = () => {
    if (!window.google) return;

    const mapInstance = new window.google.maps.Map(
      document.getElementById('map'),
      {
        center: { lat: 63.4305, lng: 10.3951 }, // Trondheim, Norway
        zoom: 12,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      }
    );

    const geocoderInstance = new window.google.maps.Geocoder();
    const infoWindowInstance = new window.google.maps.InfoWindow();

    setMap(mapInstance);
    setGeocoder(geocoderInstance);
    setInfoWindow(infoWindowInstance);
  };

  // Load tickets with addresses
  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ticketService.getAll();
      // Filter tickets that have an address
      const ticketsWithAddress = data.filter(ticket => ticket.address && ticket.address.trim() !== '');
      setTickets(ticketsWithAddress);
    } catch (error) {
      toast.error('Error loading tickets');
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Geocode addresses and place markers
  useEffect(() => {
    if (!map || !geocoder || !tickets.length) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    const newMarkers = [];

    tickets.forEach((ticket, index) => {
      if (!ticket.address) return;

      // Geocode the address
      geocoder.geocode({ address: ticket.address }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const position = results[0].geometry.location;

          // Create marker
          const marker = new window.google.maps.Marker({
            map: map,
            position: position,
            title: ticket.title,
            animation: window.google.maps.Animation.DROP,
          });

          // Add click listener to show info window
          marker.addListener('click', () => {
            showTicketInfo(ticket, marker);
          });

          newMarkers.push(marker);

          // Adjust map bounds to show all markers
          if (index === tickets.length - 1) {
            const bounds = new window.google.maps.LatLngBounds();
            newMarkers.forEach(m => bounds.extend(m.getPosition()));
            map.fitBounds(bounds);
          }
        } else {
          console.warn(`Geocoding failed for address: ${ticket.address}. Status: ${status}`);
        }
      });
    });

    setMarkers(newMarkers);
  }, [tickets, map, geocoder]);

  // Show ticket information in info window
  const showTicketInfo = (ticket, marker) => {
    if (!infoWindow) return;

    const technicians = Array.isArray(ticket.assignedTo) 
      ? ticket.assignedTo.map(tech => tech.fullName || tech.firstName + ' ' + tech.lastName).join(', ')
      : 'Not assigned';

    const content = `
      <div style="padding: 10px; max-width: 300px;">
        <h3 style="margin: 0 0 10px 0; color: #333; font-size: 1.1rem;">${ticket.title}</h3>
        <p style="margin: 5px 0; color: #666;"><strong>Ticket #:</strong> ${ticket.ticketNumber}</p>
        ${ticket.description ? `<p style="margin: 5px 0; color: #666;"><strong>Description:</strong> ${ticket.description}</p>` : ''}
        <p style="margin: 5px 0; color: #666;"><strong>Address:</strong> ${ticket.address}</p>
        <p style="margin: 5px 0; color: #666;"><strong>Assigned to:</strong> ${technicians}</p>
        <p style="margin: 5px 0; color: #666;"><strong>Start Date:</strong> ${new Date(ticket.startDate).toLocaleDateString()}</p>
        ${ticket.endDate ? `<p style="margin: 5px 0; color: #666;"><strong>End Date:</strong> ${new Date(ticket.endDate).toLocaleDateString()}</p>` : ''}
      </div>
    `;

    infoWindow.setContent(content);
    infoWindow.open(map, marker);
    setSelectedTicket(ticket);
  };

  if (loading && !map) {
    return (
      <div className="loading-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div className="spinner"></div>
        <p>Loading map...</p>
      </div>
    );
  }

  return (
    <div className="maps-container">
      <div className="page-header">
        <h1 className="page-title">{t('maps') || 'Maps'}</h1>
        <button className="btn btn-secondary" onClick={loadTickets}>
          🔄 Refresh
        </button>
      </div>

      <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
            Showing {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} with addresses
          </span>
          {tickets.length === 0 && !loading && (
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              (Add addresses to tickets to see them on the map)
            </span>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', height: 'calc(100vh - 250px)', minHeight: '500px' }}>
        <div 
          id="map" 
          style={{ 
            width: '100%', 
            height: '100%',
            minHeight: '500px'
          }}
        />
      </div>

      {selectedTicket && (
        <div className="card" style={{ marginTop: '20px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: 'var(--text-primary)' }}>Selected Ticket</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            <div>
              <strong>Title:</strong> {selectedTicket.title}
            </div>
            <div>
              <strong>Ticket #:</strong> {selectedTicket.ticketNumber}
            </div>
            <div>
              <strong>Address:</strong> {selectedTicket.address}
            </div>
            <div>
              <strong>Start Date:</strong> {new Date(selectedTicket.startDate).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maps;
