import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'react-toastify';
import { ticketService } from '../services/ticketService';
import { useTranslation } from '../utils/translations';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to fit map bounds to markers
const FitBounds = ({ positions }) => {
  const map = useMap();

  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);

  return null;
};

const Maps = () => {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geocodedTickets, setGeocodedTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Nominatim geocoding service (free OpenStreetMap geocoder)
  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  // Load tickets with addresses
  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ticketService.getAll();
      // Filter tickets that have an address
      const ticketsWithAddress = data.filter(ticket => ticket.address && ticket.address.trim() !== '');
      setTickets(ticketsWithAddress);

      // Geocode all addresses
      const geocoded = [];
      for (const ticket of ticketsWithAddress) {
        // Add small delay to respect Nominatim usage policy (max 1 request per second)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const coords = await geocodeAddress(ticket.address);
        if (coords) {
          geocoded.push({
            ...ticket,
            coordinates: coords,
          });
        } else {
          console.warn(`Could not geocode address: ${ticket.address}`);
        }
      }
      
      setGeocodedTickets(geocoded);
      
      if (geocoded.length === 0 && ticketsWithAddress.length > 0) {
        toast.warning('Some addresses could not be geocoded. Please check that addresses are valid.');
      }
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

  // Default center (Trondheim, Norway)
  const defaultCenter = [63.4305, 10.3951];

  if (loading) {
    return (
      <div className="loading-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div className="spinner"></div>
        <p>Loading map and geocoding addresses...</p>
      </div>
    );
  }

  return (
    <div className="maps-container">
      <div className="page-header">
        <h1 className="page-title">{t('maps') || 'Maps'}</h1>
        <button className="btn btn-secondary" onClick={loadTickets} disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
            Showing {geocodedTickets.length} ticket{geocodedTickets.length !== 1 ? 's' : ''} on map
          </span>
          {tickets.length > geocodedTickets.length && (
            <span style={{ color: '#f39c12', fontSize: '0.9rem' }}>
              ({tickets.length - geocodedTickets.length} address{tickets.length - geocodedTickets.length !== 1 ? 'es' : ''} could not be geocoded)
            </span>
          )}
          {tickets.length === 0 && !loading && (
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              (Add addresses to tickets to see them on the map)
            </span>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', height: 'calc(100vh - 250px)', minHeight: '500px' }}>
        <MapContainer 
          center={geocodedTickets.length > 0 ? [geocodedTickets[0].coordinates.lat, geocodedTickets[0].coordinates.lng] : defaultCenter}
          zoom={12}
          style={{ width: '100%', height: '100%', minHeight: '500px' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {geocodedTickets.map((ticket) => (
            <Marker 
              key={ticket._id}
              position={[ticket.coordinates.lat, ticket.coordinates.lng]}
              eventHandlers={{
                click: () => setSelectedTicket(ticket),
              }}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: 'bold' }}>
                    {ticket.title}
                  </h3>
                  <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>
                    <strong>Ticket #:</strong> {ticket.ticketNumber}
                  </p>
                  {ticket.description && (
                    <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>
                      <strong>Description:</strong> {ticket.description}
                    </p>
                  )}
                  <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>
                    <strong>Address:</strong> {ticket.address}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>
                    <strong>Assigned to:</strong>{' '}
                    {Array.isArray(ticket.assignedTo) && ticket.assignedTo.length > 0
                      ? ticket.assignedTo.map(tech => tech.fullName || `${tech.firstName} ${tech.lastName}`).join(', ')
                      : 'Not assigned'}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>
                    <strong>Start Date:</strong> {new Date(ticket.startDate).toLocaleDateString()}
                  </p>
                  {ticket.endDate && (
                    <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>
                      <strong>End Date:</strong> {new Date(ticket.endDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
          
          {geocodedTickets.length > 0 && (
            <FitBounds positions={geocodedTickets.map(t => [t.coordinates.lat, t.coordinates.lng])} />
          )}
        </MapContainer>
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
