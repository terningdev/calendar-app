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
import { useAuth } from '../contexts/AuthContext';
import FilterSidebar from '../components/FilterSidebar';

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
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState({ current: 0, total: 0 });
  const [geocodedTickets, setGeocodedTickets] = useState([]);
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);
  const [showFilterDepartmentSelector, setShowFilterDepartmentSelector] = useState(false);
  const [showFilterTechnicianSelector, setShowFilterTechnicianSelector] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const mobileSearchRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    assignedTo: [],
    department: []
  });

  // Check permission - use user permissions from session
  const hasPermission = (permissionName) => {
    // First check session permissions (most reliable)
    if (user?.permissions?.[permissionName] !== undefined) {
      return user.permissions[permissionName] === true;
    }
    // Fallback for sysadmin users
    if (user?.role === 'sysadmin') {
      return true;
    }
    return false;
  };

  // Clean up expired cache entries on component mount
  const cleanupExpiredCache = () => {
    try {
      const keys = Object.keys(localStorage);
      const geocodeKeys = keys.filter(key => key.startsWith('geocode_'));
      const now = Date.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      
      geocodeKeys.forEach(key => {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const data = JSON.parse(cached);
            // Remove if old format (no timestamp) or expired
            if (!data.timestamp || (now - data.timestamp) > thirtyDays) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // Remove corrupted cache entries
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Error cleaning up geocoding cache:', error);
    }
  };

  // Get cached geocoding result with expiration check
  const getCachedGeocode = (address) => {
    try {
      const cached = localStorage.getItem(`geocode_${address}`);
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      const now = Date.now();
      const cacheAge = now - data.timestamp;
      const thirtyDays = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      
      // If cache is older than 30 days, remove it and return null
      if (cacheAge > thirtyDays) {
        localStorage.removeItem(`geocode_${address}`);
        return null;
      }
      
      return data.coords;
    } catch (error) {
      return null;
    }
  };

  // Cache geocoding result with timestamp
  const setCachedGeocode = (address, coords) => {
    try {
      const cacheData = {
        coords: coords,
        timestamp: Date.now()
      };
      localStorage.setItem(`geocode_${address}`, JSON.stringify(cacheData));
    } catch (error) {
      // localStorage might be full, ignore error
    }
  };

  // Nominatim geocoding service (free OpenStreetMap geocoder) with caching
  const geocodeAddress = async (address) => {
    // Check cache first
    const cached = getCachedGeocode(address);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const coords = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
        
        // Cache the result
        setCachedGeocode(address, coords);
        return coords;
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

  // Load basic data first (for map to show immediately)
  const loadBasicData = async () => {
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
      
      // Filter tickets that have an address and are not old activities (today or future)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of today
      
      const ticketsWithAddress = fetchedTickets.filter(ticket => {
        // Must have an address
        if (!ticket.address || ticket.address.trim() === '') return false;
        
        // Must be today or in the future (exclude old activities)
        const ticketDate = new Date(ticket.startDate);
        ticketDate.setHours(0, 0, 0, 0); // Set to start of ticket date
        
        return ticketDate >= today;
      });
      
      setTickets(ticketsWithAddress);
      
      // Map is ready to show (without markers yet)
      setLoading(false);
      setMapReady(true);
      
      // Start geocoding process in background
      if (ticketsWithAddress.length > 0) {
        geocodeTicketsProgressively(ticketsWithAddress);
      }
    } catch (error) {
      console.error('Error loading basic data:', error);
      toast.error('Error loading map data');
      setLoading(false);
    }
  };

  // Geocode tickets with caching optimization
  const geocodeTicketsProgressively = async (ticketsWithAddress) => {
    setGeocodingProgress({ current: 0, total: ticketsWithAddress.length });
    
    let apiRequestCount = 0;
    
    for (let i = 0; i < ticketsWithAddress.length; i++) {
      const ticket = ticketsWithAddress[i];
      
      // Check if this address is cached
      const cached = getCachedGeocode(ticket.address);
      
      if (!cached && apiRequestCount > 0) {
        // Only delay for uncached addresses (API requests)
        // Nominatim requires 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      try {
        const coords = await geocodeAddress(ticket.address);
        if (coords) {
          const geocodedTicket = {
            ...ticket,
            coordinates: coords,
          };
          
          // Update markers immediately when this ticket is geocoded
          setGeocodedTickets(prev => [...prev, geocodedTicket]);
          
          // Increment API request count only for uncached requests
          if (!cached) {
            apiRequestCount++;
          }
        }
      } catch (error) {
        console.error('Error geocoding ticket:', ticket.address, error);
      }
      
      // Update progress immediately after each ticket
      setGeocodingProgress({ current: i + 1, total: ticketsWithAddress.length });
    }
  };

  useEffect(() => {
    cleanupExpiredCache();
    loadBasicData();
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
    return technicians.filter(tech => {
      const techDeptId = typeof tech.department === 'object' ? tech.department._id : tech.department;
      return filters.department.includes(techDeptId);
    });
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
        const ticketDepts = Array.isArray(ticket.department) 
          ? ticket.department.map(d => typeof d === 'object' ? d._id : d)
          : [];
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
        <p>Loading map data...</p>
      </div>
    );
  }

  // Check permission to view maps
  if (!user) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Maps</h1>
        </div>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!hasPermission('viewMaps')) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Maps</h1>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>You do not have permission to view the maps.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Filter Sidebar */}
      <FilterSidebar
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={setFilters}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        departments={departments}
        technicians={technicians}
      />
      
      <div className={`maps-container ${showFilters ? 'filter-sidebar-active' : ''}`}>
        <div className="card" style={{ padding: '0', overflow: 'hidden', height: 'calc(100vh - 150px)', minHeight: '500px', position: 'relative' }}>
          {/* Filter Button */}
          <button
            className="filter-toggle-button"
            onClick={() => setShowFilters(!showFilters)}
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              zIndex: 1000,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 1)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'}
          >
            🔍 Filter
          </button>

          <MapContainer 
            center={filteredTickets.length > 0 && filteredTickets[0].coordinates 
              ? [filteredTickets[0].coordinates.lat, filteredTickets[0].coordinates.lng] 
              : defaultCenter}
            zoom={12}
            style={{ width: '100%', height: '100%', minHeight: '500px' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {filteredTickets.filter(ticket => ticket.coordinates).map((ticket) => (
              <Marker 
                key={ticket._id}
                position={[ticket.coordinates.lat, ticket.coordinates.lng]}
              >
                <Popup>
                  <div style={{ minWidth: '200px' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: 'bold' }}>
                      {ticket.title}
                    </h3>
                    {ticket.activityNumbers && ticket.activityNumbers.length > 0 && (
                      <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>
                        <strong>Activity:</strong> {ticket.activityNumbers.join(', ')}
                      </p>
                    )}
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
              <FitBounds positions={filteredTickets.filter(t => t.coordinates).map(t => [t.coordinates.lat, t.coordinates.lng])} />
            )}
          </MapContainer>
        </div>
      </div>
    </>
  );
};

export default Maps;