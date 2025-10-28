import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'react-toastify';
import { ticketService } from '../services/ticketService';
import { technicianService } from '../services/technicianService';
import { departmentService } from '../services/departmentService';
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
  const [technicians, setTechnicians] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geocodedTickets, setGeocodedTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);
  const [showFilterDepartmentSelector, setShowFilterDepartmentSelector] = useState(false);
  const [showFilterTechnicianSelector, setShowFilterTechnicianSelector] = useState(false);
  const mobileSearchRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    assignedTo: [],
    department: []
  });

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

  const loadData = async () => {
    try {
      setLoading(true);
      const [ticketsData, techniciansData, departmentsData] = await Promise.allSettled([
        ticketService.getAll(),
        technicianService.getAll(),
        departmentService.getAll()
      ]);
      
      const fetchedTickets = ticketsData.status === 'fulfilled' ? ticketsData.value : [];
      const fetchedTechnicians = techniciansData.status === 'fulfilled' ? techniciansData.value : [];
      const fetchedDepartments = departmentsData.status === 'fulfilled' ? departmentsData.value : [];
      
      setTechnicians(fetchedTechnicians);
      setDepartments(fetchedDepartments);
      
      // Filter tickets that have an address
      const ticketsWithAddress = fetchedTickets.filter(ticket => ticket.address && ticket.address.trim() !== '');
      setTickets(ticketsWithAddress);

      // Geocode all addresses
      const geocoded = [];
      for (const ticket of ticketsWithAddress) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const coords = await geocodeAddress(ticket.address);
        if (coords) {
          geocoded.push({
            ...ticket,
            coordinates: coords,
          });
        }
      }
      
      setGeocodedTickets(geocoded);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error loading map data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Click outside handler for mobile search
  useEffect(() => {
    if (!mobileSearchExpanded) return;
    
    const handleClickOutside = (event) => {
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target)) {
        setMobileSearchExpanded(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileSearchExpanded]);

  // Get technicians filtered by department
  const getFilteredTechnicians = () => {
    if (filters.department.length === 0) {
      return technicians;
    }
    return technicians.filter(tech => 
      filters.department.some(deptId => tech.departments?.includes(deptId))
    );
  };

  // Filter logic
  const getFilteredTickets = () => {
    return geocodedTickets.filter(ticket => {
      // Search filter
      if (searchTerm && !ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !ticket.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !ticket.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Department filter
      if (filters.department.length > 0) {
        const ticketDepts = Array.isArray(ticket.department) ? ticket.department : [];
        if (!filters.department.some(deptId => ticketDepts.includes(deptId))) {
          return false;
        }
      }

      // Technician filter
      if (filters.assignedTo.length > 0) {
        const assignedTechs = Array.isArray(ticket.assignedTo) 
          ? ticket.assignedTo.map(t => typeof t === 'object' ? t._id : t)
          : [];
        
        if (filters.assignedTo.includes('unassigned')) {
          if (assignedTechs.length > 0 && !filters.assignedTo.some(id => id !== 'unassigned' && assignedTechs.includes(id))) {
            return false;
          }
        } else {
          if (!filters.assignedTo.some(id => assignedTechs.includes(id))) {
            return false;
          }
        }
      }

      return true;
    });
  };

  // Handle filter changes
  const handleDepartmentChange = (value) => {
    setFilters({ ...filters, department: value ? [value] : [] });
  };

  const handleFilterDepartmentChange = (deptId) => {
    setFilters(prev => ({
      ...prev,
      department: prev.department.includes(deptId)
        ? prev.department.filter(id => id !== deptId)
        : [...prev.department, deptId]
    }));
  };

  const handleFilterTechnicianChange = (techId) => {
    setFilters(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(techId)
        ? prev.assignedTo.filter(id => id !== techId)
        : [...prev.assignedTo, techId]
    }));
  };

  // Default center (Trondheim, Norway)
  const defaultCenter = [63.4305, 10.3951];
  const filteredTickets = getFilteredTickets();

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
        <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      {/* Desktop Filters */}
      <div className="card desktop-only" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('search')}</label>
            <div className="search-input">
              <input
                type="text"
                className="form-control"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('department')}</label>
            <select
              className="form-control"
              value={filters.department}
              onChange={(e) => handleDepartmentChange(e.target.value)}
            >
              <option value="">{t('allDepartments')}</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('assignedTo')}</label>
            <select
              className="form-control"
              value={filters.assignedTo.length > 0 ? filters.assignedTo[0] : ''}
              onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value ? [e.target.value] : [] })}
            >
              <option value="">{t('allTechnicians')}</option>
              <option value="unassigned">{t('unassigned')}</option>
              {getFilteredTechnicians().map(tech => (
                <option key={tech._id} value={tech._id}>
                  {tech.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Filters - Compact Single Line */}
      <div className="mobile-only" style={{ marginBottom: '12px', position: 'relative' }}>
        <div className="mobile-tickets-toolbar">
          {/* Circular Search Button */}
          <button 
            className="mobile-search-circular-btn"
            onClick={() => setMobileSearchExpanded(!mobileSearchExpanded)}
            title="Search"
          >
            🔍
          </button>
          
          {/* Expanded Search Overlay */}
          {mobileSearchExpanded && (
            <div className="mobile-search-expanded" ref={mobileSearchRef}>
              <input
                type="text"
                className="form-control"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                style={{ paddingRight: '40px' }}
              />
              <button
                className="mobile-search-close"
                onClick={() => setMobileSearchExpanded(false)}
              >
                ✕
              </button>
            </div>
          )}
          
          {/* Filter buttons - hidden when search is expanded */}
          {!mobileSearchExpanded && (
            <>
              <button
                className="mobile-filter-selector"
                onClick={() => setShowFilterDepartmentSelector(true)}
              >
                <span className="mobile-selector-text">
                  {filters.department.length === 0 
                    ? "📋 None selected" 
                    : filters.department.length === 1 
                      ? `📋 ${departments.find(d => d._id === filters.department[0])?.name || '1 dept'}` 
                      : `📋 ${filters.department.length} depts`}
                </span>
              </button>
              
              <button
                className="mobile-filter-selector"
                onClick={() => setShowFilterTechnicianSelector(true)}
              >
                <span className="mobile-selector-text">
                  {filters.assignedTo.length === 0 
                    ? "👤 None selected" 
                    : filters.assignedTo.length === 1 
                      ? filters.assignedTo[0] === 'unassigned'
                        ? "👤 Unassigned"
                        : `👤 ${technicians.find(t => t._id === filters.assignedTo[0])?.fullName || '1 tech'}`
                      : `👤 ${filters.assignedTo.length} techs`}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Department Selector */}
      {showFilterDepartmentSelector && ReactDOM.createPortal(
        <div className="mobile-selector-overlay" onClick={() => setShowFilterDepartmentSelector(false)}>
          <div className="mobile-selector-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-selector-header">
              <h3>📋 Select Departments</h3>
              <button 
                className="mobile-selector-close"
                onClick={() => setShowFilterDepartmentSelector(false)}
              >
                ✕
              </button>
            </div>
            <div className="mobile-selector-content">
              {departments.map(dept => (
                <div 
                  key={dept._id} 
                  className={`mobile-selector-item ${filters.department.includes(dept._id) ? 'selected' : ''}`}
                  onClick={() => handleFilterDepartmentChange(dept._id)}
                >
                  <span className="mobile-selector-check">
                    {filters.department.includes(dept._id) ? '✓' : '○'}
                  </span>
                  <span className="mobile-selector-name">{dept.name}</span>
                </div>
              ))}
            </div>
            <div className="mobile-selector-footer">
              <button 
                className="mobile-selector-done"
                onClick={() => setShowFilterDepartmentSelector(false)}
              >
                Done ({filters.department.length} selected)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Filter Technician Selector */}
      {showFilterTechnicianSelector && ReactDOM.createPortal(
        <div className="mobile-selector-overlay" onClick={() => setShowFilterTechnicianSelector(false)}>
          <div className="mobile-selector-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-selector-header">
              <h3>👥 Select Technicians</h3>
              <button 
                className="mobile-selector-close"
                onClick={() => setShowFilterTechnicianSelector(false)}
              >
                ✕
              </button>
            </div>
            <div className="mobile-selector-content">
              <div 
                className={`mobile-selector-item ${filters.assignedTo.includes('unassigned') ? 'selected' : ''}`}
                onClick={() => handleFilterTechnicianChange('unassigned')}
              >
                <span className="mobile-selector-check">
                  {filters.assignedTo.includes('unassigned') ? '✓' : '○'}
                </span>
                <span className="mobile-selector-name">Unassigned</span>
              </div>
              {getFilteredTechnicians().map(tech => (
                <div 
                  key={tech._id} 
                  className={`mobile-selector-item ${filters.assignedTo.includes(tech._id) ? 'selected' : ''}`}
                  onClick={() => handleFilterTechnicianChange(tech._id)}
                >
                  <span className="mobile-selector-check">
                    {filters.assignedTo.includes(tech._id) ? '✓' : '○'}
                  </span>
                  <span className="mobile-selector-name">{tech.fullName}</span>
                </div>
              ))}
            </div>
            <div className="mobile-selector-footer">
              <button 
                className="mobile-selector-done"
                onClick={() => setShowFilterTechnicianSelector(false)}
              >
                Done ({filters.assignedTo.length} selected)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="card" style={{ padding: '0', overflow: 'hidden', height: 'calc(100vh - 250px)', minHeight: '500px' }}>
        <MapContainer 
          center={filteredTickets.length > 0 ? [filteredTickets[0].coordinates.lat, filteredTickets[0].coordinates.lng] : defaultCenter}
          zoom={12}
          style={{ width: '100%', height: '100%', minHeight: '500px' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {filteredTickets.map((ticket) => (
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
          
          
          {filteredTickets.length > 0 && (
            <FitBounds positions={filteredTickets.map(t => [t.coordinates.lat, t.coordinates.lng])} />
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