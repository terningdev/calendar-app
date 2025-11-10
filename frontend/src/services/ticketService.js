import api from './api';

// Helper function to get current region from localStorage
const getCurrentRegionId = () => {
  return localStorage.getItem('selectedRegionId');
};

export const ticketService = {
  // Get all tickets with optional filters
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    
    // Add region filter if available and not already specified
    const regionId = getCurrentRegionId();
    if (regionId && !filters.regionId) {
      filters.regionId = regionId;
    }
    
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value) {
        // Handle array values (like assignedTo and department filters)
        if (Array.isArray(value) && value.length > 0) {
          value.forEach(item => params.append(key, item));
        } else if (!Array.isArray(value)) {
          params.append(key, value);
        }
      }
    });
    
    const response = await api.get(`/tickets?${params.toString()}`);
    return response.data;
  },

  // Get tickets for calendar view
  getForCalendar: async (startDate, endDate) => {
    const params = new URLSearchParams();
    params.append('start', startDate);
    params.append('end', endDate);
    
    // Add region filter if available
    const regionId = getCurrentRegionId();
    if (regionId) {
      params.append('regionId', regionId);
    }
    
    const response = await api.get(`/tickets/calendar?${params.toString()}`);
    return response.data;
  },

  // Get ticket by ID
  getById: async (id) => {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  },

  // Create new ticket
  create: async (ticketData) => {
    const response = await api.post('/tickets', ticketData);
    return response.data;
  },

  // Update ticket
  update: async (id, ticketData) => {
    const response = await api.put(`/tickets/${id}`, ticketData);
    return response.data;
  },

  // Add note to ticket
  addNote: async (id, noteData) => {
    const response = await api.post(`/tickets/${id}/notes`, noteData);
    return response.data;
  },

  // Delete ticket
  delete: async (id) => {
    const response = await api.delete(`/tickets/${id}`);
    return response.data;
  },
};