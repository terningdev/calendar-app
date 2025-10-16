import api from './api';

export const ticketService = {
  // Get all tickets with optional filters
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params.append(key, filters[key]);
      }
    });
    
    const response = await api.get(`/tickets?${params.toString()}`);
    return response.data;
  },

  // Get tickets for calendar view
  getForCalendar: async (startDate, endDate) => {
    const response = await api.get(`/tickets/calendar?start=${startDate}&end=${endDate}`);
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