import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { toast } from 'react-toastify';
import { ticketService } from '../services/ticketService';
import { technicianService } from '../services/technicianService';
import { departmentService } from '../services/departmentService';
import { absenceService } from '../services/absenceService';
import { useTranslation } from '../utils/translations';
import { useAuth } from '../contexts/AuthContext';
import { useRegion } from '../contexts/RegionContext';
import FilterSidebar from '../components/FilterSidebar';

const Calendar = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { refreshTrigger } = useRegion();
  const calendarRef = useRef(null);
  const mobileSearchRef = useRef(null);

  // Add CSS for connected multi-day tiles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Connected multi-day tile styling */
      .multi-day-start-tile {
        border-top-right-radius: 0 !important;
        border-bottom-right-radius: 0 !important;
        position: relative !important;
        z-index: 3 !important;
        margin-right: 0px !important;
        border-right: none !important;
      }
      
      .multi-day-middle-tile {
        border-radius: 0 !important;
        margin-left: 0px !important;
        margin-right: 0px !important;
        position: relative !important;
        z-index: 3 !important;
        border-left: none !important;
        border-right: none !important;
      }
      
      .multi-day-end-tile {
        border-top-left-radius: 0 !important;
        border-bottom-left-radius: 0 !important;
        margin-left: 0px !important;
        position: relative !important;
        z-index: 3 !important;
        border-left: none !important;
      }
      
      .multi-day-connected-tile {
        z-index: 3 !important;
        position: relative !important;
      }
      
      /* Force proper spacing and alignment */
      .fc-daygrid-day-events {
        z-index: 2 !important;
        position: relative !important;
      }
      
      /* Ensure events are properly stacked */
      .fc-daygrid-event {
        margin-bottom: 1px !important;
      }
      
      /* Special handling for connected tiles to overlap properly */
      .multi-day-start-tile + .fc-daygrid-event,
      .multi-day-middle-tile + .fc-daygrid-event,
      .multi-day-connected-tile + .fc-daygrid-event {
        margin-top: 0px !important;
      }
      
      /* Ensure continuation arrows are visible */
      .multi-day-arrow {
        color: white !important;
        font-weight: bold !important;
        position: absolute !important;
        right: 3px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        z-index: 10 !important;
        text-shadow: 1px 1px 1px rgba(0,0,0,0.5) !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAgenda, setShowAgenda] = useState(false);
  const [agendaDate, setAgendaDate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [filters, setFilters] = useState({
    department: [],
    assignedTo: []
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: [],
    department: [],
    startDate: '',
    endDate: '',
    activityNumbers: []
  });

  // Check permission
  const hasPermission = (permissionName) => {
    return user?.permissions?.[permissionName] === true;
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      
      // Update FullCalendar with new dayMaxEvents when window resizes
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        // Small delay to allow resize to complete
        setTimeout(() => {
          calendarApi.updateSize();
        }, 100);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Update dayMaxEvents when relevant states change
  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      // Force a re-render with updated dayMaxEvents
      setTimeout(() => {
        calendarApi.updateSize();
      }, 100);
    }
  }, [showFilters, showAgenda]);

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

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [ticketsData, techniciansData, departmentsData, absencesData] = await Promise.all([
          ticketService.getAll(),
          technicianService.getAll(),
          departmentService.getAll(),
          absenceService.getAll()
        ]);
        
        setTickets(ticketsData);
        setTechnicians(techniciansData);
        setDepartments(departmentsData);
        setAbsences(absencesData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load calendar data');
      } finally {
        setLoading(false);
      }
    };
    
    if (user && user.permissions?.viewCalendar === true) {
      loadData();
    } else if (user) {
      setLoading(false);
    }
  }, [user, refreshTrigger]); // Add refreshTrigger dependency

  // Handle selected date styling
  useEffect(() => {
    // Remove previous selected date styling
    const prevSelected = document.querySelectorAll('.fc-day-selected');
    prevSelected.forEach(el => el.classList.remove('fc-day-selected'));
    
    // Add selected date styling
    if (selectedDate) {
      // Format date consistently for DOM query (local date string)
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const dayElement = document.querySelector(`[data-date="${dateStr}"]`);
      if (dayElement) {
        dayElement.classList.add('fc-day-selected');
      }
    }
  }, [selectedDate]);

  // Handle FullCalendar resize when agenda opens/closes
  useEffect(() => {
    if (calendarRef.current) {
      // Small delay to allow CSS transition to complete
      setTimeout(() => {
        const calendarApi = calendarRef.current.getApi();
        calendarApi.updateSize();
      }, 350); // Match the CSS transition duration
    }
  }, [showAgenda]);

  // Convert tickets and absences to FullCalendar events
  const getEvents = () => {
    // Start with all tickets
    let filteredTickets = tickets;
    
    console.log(`🔍 PROCESSING ${tickets.length} total tickets`);
    
    // Check if ticket 6423405 exists in the original tickets
    const ticket6423405 = tickets.find(t => t.title && t.title.includes('6423405'));
    if (ticket6423405) {
      console.log(`🔍 Found ticket 6423405 in original tickets:`, ticket6423405);
    } else {
      console.log(`❌ Ticket 6423405 NOT found in original tickets`);
      console.log(`🔍 Available tickets (first 10):`, tickets.map(t => ({
        title: t.title,
        startDate: t.startDate,
        endDate: t.endDate,
        id: t._id
      })).slice(0, 10));
      
      // Look for any multi-day tickets
      const multiDayTickets = tickets.filter(t => t.endDate && t.endDate !== t.startDate);
      console.log(`🔍 Found ${multiDayTickets.length} multi-day tickets:`, 
        multiDayTickets.map(t => ({
          title: t.title,
          startDate: t.startDate,
          endDate: t.endDate,
          id: t._id
        }))
      );
    }
    
    // Filter by search term
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      filteredTickets = filteredTickets.filter(ticket => {
        // Search in title
        const titleMatch = ticket.title?.toLowerCase().includes(term);
        
        // Search in description
        const descriptionMatch = ticket.description?.toLowerCase().includes(term);
        
        // Search in assigned technician names
        const technicianMatch = Array.isArray(ticket.assignedTo) 
          ? ticket.assignedTo.some(tech => tech?.fullName?.toLowerCase().includes(term))
          : ticket.assignedTo?.fullName?.toLowerCase().includes(term);
        
        // Search in activity numbers
        const activityNumberMatch = ticket.activityNumbers && Array.isArray(ticket.activityNumbers)
          ? ticket.activityNumbers.some(actNum => actNum?.toLowerCase().includes(term))
          : false;
        
        return titleMatch || descriptionMatch || technicianMatch || activityNumberMatch;
      });
    }
    
    // Filter by department
    if (filters.department && filters.department.length > 0) {
      filteredTickets = filteredTickets.filter(ticket => {
        if (!ticket.assignedTo || (Array.isArray(ticket.assignedTo) && ticket.assignedTo.length === 0)) {
          return true; // Include unassigned tickets
        }
        
        if (Array.isArray(ticket.assignedTo)) {
          return ticket.assignedTo.some(tech => 
            tech.department && filters.department.includes(tech.department._id)
          );
        } else {
          return ticket.assignedTo.department && 
                 filters.department.includes(ticket.assignedTo.department._id);
        }
      });
    }
    
    // Filter by assigned technician
    if (filters.assignedTo && filters.assignedTo.length > 0) {
      filteredTickets = filteredTickets.filter(ticket => {
        // Check for unassigned filter
        if (filters.assignedTo.includes('unassigned')) {
          const isUnassigned = !ticket.assignedTo || (Array.isArray(ticket.assignedTo) && ticket.assignedTo.length === 0);
          if (isUnassigned) return true;
        }
        
        // Check for specific technician filters
        const technicianIds = filters.assignedTo.filter(id => id !== 'unassigned');
        if (technicianIds.length > 0) {
          if (Array.isArray(ticket.assignedTo)) {
            return ticket.assignedTo.some(tech => technicianIds.includes(tech._id));
          } else if (ticket.assignedTo) {
            return technicianIds.includes(ticket.assignedTo._id);
          }
        }
        
        return false;
      });
    }

    // Process tickets into events
    const ticketEvents = filteredTickets.map(ticket => {
      // Enhanced debugging for ANY multi-day ticket
      if (ticket.endDate && ticket.endDate !== ticket.startDate) {
        console.log(`🔍 DEBUGGING MULTI-DAY TICKET: ${ticket.title}`);
        console.log(`  Full ticket object:`, ticket);
        console.log(`  Title: ${ticket.title}`);
        console.log(`  StartDate: ${ticket.startDate}`);
        console.log(`  EndDate: ${ticket.endDate}`);
        console.log(`  StartDate type: ${typeof ticket.startDate}`);
        console.log(`  EndDate type: ${typeof ticket.endDate}`);
      }
      
      // Get technician names
      const techNames = Array.isArray(ticket.assignedTo)
        ? ticket.assignedTo.map(tech => tech.fullName || `${tech.firstName} ${tech.lastName}`).join(', ')
        : ticket.assignedTo
          ? ticket.assignedTo.fullName || `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
          : 'Unassigned';

      // Create display title - on mobile show just title, on desktop separate techs from title
      const displayTitle = isMobile ? ticket.title : ticket.title;

      // Calculate end date - for multi-day tickets, ensure proper spanning
      let endDate = ticket.endDate || ticket.startDate;
      
      // Convert dates to proper format for FullCalendar
      // Handle both ISO strings and Date objects
      let startDateForFC, endDateForFC;
      
      if (typeof ticket.startDate === 'string') {
        startDateForFC = ticket.startDate.split('T')[0]; // Get YYYY-MM-DD part
      } else {
        startDateForFC = new Date(ticket.startDate).toISOString().split('T')[0];
      }
      
      if (typeof endDate === 'string') {
        endDateForFC = endDate.split('T')[0]; // Get YYYY-MM-DD part
      } else {
        endDateForFC = new Date(endDate).toISOString().split('T')[0];
      }
      
      // For multi-day events, use all-day format with date-only strings (the FullCalendar standard)
      let finalStartDate, finalEndDate;
      if (ticket.endDate && ticket.endDate !== ticket.startDate) {
        // For multi-day events, use date-only strings and allDay: true (FullCalendar standard)
        finalStartDate = startDateForFC; // "2025-11-04"
        const endDateObj = new Date(endDateForFC);
        endDateObj.setDate(endDateObj.getDate() + 1); // FullCalendar end dates are exclusive
        finalEndDate = endDateObj.toISOString().split('T')[0]; // "2025-11-06"
        
        console.log(`🔍 USING ALL-DAY FORMAT FOR MULTI-DAY SPANNING: ${ticket.title}`);
        console.log(`  Start date: ${finalStartDate}`);
        console.log(`  End date (with +1 day): ${finalEndDate}`);
        
        const daysBetween = Math.ceil((new Date(endDateForFC) - new Date(startDateForFC)) / (1000 * 60 * 60 * 24));
        console.log(`  Days between: ${daysBetween}`);
      } else {
        // For single-day events, use string format
        finalStartDate = startDateForFC;
        const endDateObj = new Date(endDateForFC);
        endDateObj.setDate(endDateObj.getDate() + 1);
        finalEndDate = endDateObj.toISOString().split('T')[0];
      }
      
      // Enhanced debugging for multi-day tickets
      if (ticket.endDate && ticket.endDate !== ticket.startDate) {
        console.log(`🔍 MULTI-DAY TICKET DATE PROCESSING: ${ticket.title}`);
        console.log(`  Original startDate: ${ticket.startDate} (${typeof ticket.startDate})`);
        console.log(`  Original endDate: ${ticket.endDate} (${typeof ticket.endDate})`);
        console.log(`  Formatted startDateForFC: ${startDateForFC}`);
        console.log(`  Formatted endDateForFC: ${endDateForFC}`);
        console.log(`  Final start (for FullCalendar): ${finalStartDate}`);
        console.log(`  Final end (for FullCalendar): ${finalEndDate}`);
        console.log(`  Are dates different? ${ticket.endDate !== ticket.startDate}`);
        
        const startDate = new Date(startDateForFC);
        const endDate = new Date(endDateForFC);
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        console.log(`  Duration: ${daysDiff} days`);
      }
      
      // Debug logging for multi-day events
      if (ticket.endDate && ticket.endDate !== ticket.startDate) {
        console.log(`Multi-day ticket: ${ticket.title}`);
        console.log(`  Start: ${finalStartDate}`);
        console.log(`  End: ${finalEndDate}`);
      }
      
      // Final debugging for multi-day tickets
      if (ticket.endDate && ticket.endDate !== ticket.startDate) {
        console.log(`🔍 MULTI-DAY TICKET FINAL EVENT: ${ticket.title}`);
        console.log(`  Final start: ${finalStartDate}`);
        console.log(`  Final end: ${finalEndDate}`);
        console.log(`  className: ${ticket.endDate && ticket.endDate !== ticket.startDate ? 'multi-day-event' : 'single-day-event'}`);
      }
      
      const eventObject = {
        id: ticket._id,
        title: displayTitle,
        start: finalStartDate,
        end: finalEndDate,
        // For multi-day events, use allDay: true with date-only strings (FullCalendar standard)
        ...(ticket.endDate && ticket.endDate !== ticket.startDate 
          ? { allDay: true } // Use allDay: true for multi-day events with date-only strings
          : { allDay: true } // Set allDay true for single-day events
        ),
        extendedProps: {
          ticket: ticket,
          description: ticket.description,
          technicians: techNames,
          activityNumbers: ticket.activityNumbers || [],
          eventType: 'ticket'
        },
        backgroundColor: getTicketColor(ticket),
        borderColor: getTicketColor(ticket),
        textColor: '#ffffff',
        className: ticket.endDate && ticket.endDate !== ticket.startDate ? 'multi-day-event' : 'single-day-event',
        // For multi-day events, force block display and spanning behavior
        ...(ticket.endDate && ticket.endDate !== ticket.startDate && {
          eventDisplay: 'block',
          display: 'block'
        })
      };

      // Log the final event object for multi-day tickets
      if (ticket.endDate && ticket.endDate !== ticket.startDate) {
        console.log(`🔍 COMPLETE EVENT OBJECT:`, JSON.stringify(eventObject, null, 2));
        console.log(`🔍 EVENT OBJECT BREAKDOWN:`, {
          id: eventObject.id,
          title: eventObject.title,
          start: eventObject.start,
          startType: typeof eventObject.start,
          end: eventObject.end,
          endType: typeof eventObject.end,
          allDay: eventObject.allDay,
          className: eventObject.className
        });
      }
      
      return eventObject;
    });



    const finalEvents = [...ticketEvents];
    
    // Debug: Log final events array for multi-day tickets
    const multiDayEvents = finalEvents.filter(e => {
      const start = new Date(e.start);
      const end = new Date(e.end);
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      return daysDiff > 1;
    });
    
    if (multiDayEvents.length > 0) {
      console.log(`🔍 FINAL MULTI-DAY EVENTS BEING PASSED TO FULLCALENDAR (${multiDayEvents.length}):`, 
        multiDayEvents.map(e => ({
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end,
          className: e.className,
          allDay: e.allDay
        }))
      );
    }

    return finalEvents;
  };

  // Get vakt and absence data for a specific date
  const getVaktAndAbsenceForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    const vaktForDate = absences.filter(absence => {
      if (absence.type !== 'vakt') return false;
      const startDate = new Date(absence.startDate).toISOString().split('T')[0];
      const endDate = new Date(absence.endDate).toISOString().split('T')[0];
      return dateStr >= startDate && dateStr <= endDate;
    });
    
    const absenceForDate = absences.filter(absence => {
      if (absence.type !== 'absence') return false;
      const startDate = new Date(absence.startDate).toISOString().split('T')[0];
      const endDate = new Date(absence.endDate).toISOString().split('T')[0];
      return dateStr >= startDate && dateStr <= endDate;
    });
    
    return { vakt: vaktForDate, absence: absenceForDate };
  };

  // Get events for a specific date (for agenda view)
  const getMaxTicketsForCell = () => {
    // Base calculation on available space
    let maxTickets = 3; // Default
    
    // Adjust based on window width
    if (window.innerWidth < 768) {
      maxTickets = 2; // Mobile
    } else if (window.innerWidth < 1200) {
      maxTickets = 3; // Medium screens
    } else {
      maxTickets = 4; // Large screens
    }
    
    // Reduce if filters or agenda are open
    if (showFilters || showAgenda) {
      maxTickets = Math.max(2, maxTickets - 1);
    }
    
    return maxTickets;
  };

  // Get events for a specific date (for agenda view)
  const getEventsForDate = (date) => {
    if (!date) return [];
    
    // Create a date object for the selected date at start of day
    const selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const allEvents = getEvents();
    
    return allEvents.filter(event => {
      // Get event start and end dates
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end || event.start);
      
      // Create date objects at start of day for comparison
      const eventStartDay = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
      const eventEndDay = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
      
      // Check if selected date falls within the event's date range (inclusive)
      // For multi-day events, this will show the event on all days it spans
      return selectedDate >= eventStartDay && selectedDate <= eventEndDay;
    });
  };

  // Get ticket color based on technician's department or status
  const getTicketColor = (ticket) => {
    // Default colors
    const colors = [
      '#0066cc', // Blue
      '#28a745', // Green
      '#dc3545', // Red
      '#ffc107', // Yellow
      '#6f42c1', // Purple
      '#fd7e14', // Orange
      '#17a2b8', // Cyan
      '#e83e8c'  // Pink
    ];
    
    // Try to get color based on first assigned technician's department
    if (Array.isArray(ticket.assignedTo) && ticket.assignedTo.length > 0 && ticket.assignedTo[0].department) {
      const deptId = ticket.assignedTo[0].department._id || ticket.assignedTo[0].department;
      const deptIndex = departments.findIndex(d => d._id === deptId);
      if (deptIndex >= 0) {
        return colors[deptIndex % colors.length];
      }
    } else if (ticket.assignedTo && ticket.assignedTo.department) {
      const deptId = ticket.assignedTo.department._id || ticket.assignedTo.department;
      const deptIndex = departments.findIndex(d => d._id === deptId);
      if (deptIndex >= 0) {
        return colors[deptIndex % colors.length];
      }
    }
    
    // Default color for unassigned
    return '#6c757d';
  };

  // Handle event click - show action selection
  const handleEventClick = (clickInfo) => {
    const ticket = clickInfo.event.extendedProps.ticket;
    setSelectedEvent(ticket);
    setShowActionModal(true);
  };

  // Handle view action
  const handleViewAction = () => {
    setShowActionModal(false);
    setShowViewModal(true);
  };

  // Handle edit action
  const handleEditAction = () => {
    setShowActionModal(false);
    
    // Get activity numbers
    let activityNumbers = selectedEvent.activityNumbers && selectedEvent.activityNumbers.length > 0 
      ? [...selectedEvent.activityNumbers] 
      : [];
    
    // Extract departments from assigned technicians
    let selectedDepartments = [];
    if (selectedEvent.assignedTo && selectedEvent.assignedTo.length > 0) {
      const assignedTechnicians = Array.isArray(selectedEvent.assignedTo) ? selectedEvent.assignedTo : [selectedEvent.assignedTo];
      const departmentIds = assignedTechnicians
        .filter(tech => tech && tech.department)
        .map(tech => tech.department._id);
      selectedDepartments = [...new Set(departmentIds)];
    }
    
    setFormData({
      title: selectedEvent.title,
      activityNumbers: activityNumbers,
      description: selectedEvent.description,
      assignedTo: Array.isArray(selectedEvent.assignedTo) 
        ? selectedEvent.assignedTo.map(tech => tech._id) 
        : selectedEvent.assignedTo 
        ? [selectedEvent.assignedTo._id] 
        : [],
      department: selectedDepartments,
      startDate: new Date(selectedEvent.startDate).toISOString().slice(0, 10),
      endDate: selectedEvent.endDate ? new Date(selectedEvent.endDate).toISOString().slice(0, 10) : ''
    });
    setShowEditModal(true);
  };

  // Handle date click (open agenda for any day)
  const handleDateClick = (dateClickInfo) => {
    // Create a local date to avoid timezone issues
    const localDate = new Date(dateClickInfo.dateStr + 'T00:00:00');
    setAgendaDate(localDate);
    setSelectedDate(localDate);
    setShowAgenda(true);
  };

  // Get filtered technicians based on selected departments in form
  const getFormFilteredTechnicians = () => {
    if (formData.department.length === 0) {
      return [];
    }
    return technicians.filter(tech => 
      tech.isActive && tech.department && formData.department.includes(tech.department._id)
    );
  };

  // Get filtered technicians based on selected departments in filter
  const getFilteredTechnicians = () => {
    if (filters.department.length === 0) {
      return technicians.filter(tech => tech.isActive);
    }
    return technicians.filter(tech => 
      tech.isActive && tech.department && filters.department.includes(tech.department._id)
    );
  };

  // Close modals
  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedEvent(null);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedEvent(null);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedEvent(null);
    setFormData({
      title: '',
      description: '',
      assignedTo: [],
      department: [],
      startDate: '',
      endDate: '',
      activityNumbers: []
    });
  };

  // Handle update ticket
  const handleUpdateTicket = async (e) => {
    e.preventDefault();
    
    try {
      const cleanData = {
        ...formData,
        activityNumbers: formData.activityNumbers.filter(n => n !== '')
      };

      await ticketService.update(selectedEvent._id, cleanData);
      toast.success('Ticket updated successfully');
      
      // Reload data
      const ticketsData = await ticketService.getAll();
      setTickets(ticketsData);
      
      closeEditModal();
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('Failed to update ticket');
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check permission to view calendar
  if (!user) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">{t('calendar')}</h1>
        </div>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!hasPermission('viewCalendar')) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">{t('calendar')}</h1>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>You do not have permission to view the calendar.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">{t('calendar')}</h1>
        </div>
        <div className="loading">Loading calendar...</div>
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
      
      <div className={`page-container ${showFilters ? 'filter-sidebar-active' : ''}`}>
        {/* Old Desktop Filters - Remove this section */}
        {false && (
        <div className="card desktop-only" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{t('search')}</label>
              <div className="search-input">
                <input
                  type="text"
                  className="form-control"
                  placeholder={t('search') + '...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{t('department')}</label>
              <div className="checkbox-filter-container">
                {departments.map(dept => (
                  <label key={dept._id} className="checkbox-filter-item">
                    <input
                      type="checkbox"
                      checked={filters.department.includes(dept._id)}
                      onChange={(e) => {
                        const newDepartments = e.target.checked
                          ? [...filters.department, dept._id]
                          : filters.department.filter(id => id !== dept._id);
                        setFilters({ 
                          ...filters, 
                          department: newDepartments,
                          // Clear technician filter when department changes
                          assignedTo: newDepartments.length !== filters.department.length ? [] : filters.assignedTo
                        });
                      }}
                    />
                    <span className="checkbox-filter-label">{dept.name}</span>
                  </label>
                ))}
                {departments.length === 0 && (
                  <div className="text-muted" style={{ fontSize: '0.9rem', padding: '8px' }}>
                    No departments available
                  </div>
                )}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{t('assignedTo')}</label>
              <div className="checkbox-filter-container">
                <label className="checkbox-filter-item">
                  <input
                    type="checkbox"
                    checked={filters.assignedTo.includes('unassigned')}
                    onChange={(e) => {
                      const newAssignedTo = e.target.checked
                        ? [...filters.assignedTo, 'unassigned']
                        : filters.assignedTo.filter(id => id !== 'unassigned');
                      setFilters({ ...filters, assignedTo: newAssignedTo });
                    }}
                  />
                  <span className="checkbox-filter-label">{t('unassigned')}</span>
                </label>
                {getFilteredTechnicians().map(tech => (
                  <label key={tech._id} className="checkbox-filter-item">
                    <input
                      type="checkbox"
                      checked={filters.assignedTo.includes(tech._id)}
                      onChange={(e) => {
                        const newAssignedTo = e.target.checked
                          ? [...filters.assignedTo, tech._id]
                          : filters.assignedTo.filter(id => id !== tech._id);
                        setFilters({ ...filters, assignedTo: newAssignedTo });
                      }}
                    />
                    <span className="checkbox-filter-label">{tech.fullName}</span>
                  </label>
                ))}
                {getFilteredTechnicians().length === 0 && filters.department.length > 0 && (
                  <div className="text-muted" style={{ fontSize: '0.9rem', padding: '8px' }}>
                    No technicians available for selected departments
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Calendar Container */}
      <div className="calendar-container" style={{ display: 'flex', gap: '15px' }}>
        {/* Calendar */}
        <div className={`calendar-wrapper ${showAgenda ? 'with-agenda' : ''}`}>
          <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView={isMobile ? 'dayGridMonth' : 'dayGridMonth'}
          headerToolbar={{
            left: isMobile ? 'prev,next' : 'prev,next today filterButton',
            center: 'title',
            right: isMobile ? 'dayGridMonth,timeGridWeek,listWeek' : 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
          }}
          customButtons={{
            filterButton: {
              text: 'Filter',
              click: function() {
                setShowFilters(!showFilters);
              }
            }
          }}
          events={getEvents()}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          dayMaxEvents={getMaxTicketsForCell()}
          moreLinkClick="popover"
          moreLinkClassNames="fc-more-link-custom"
          moreLinkContent={(args) => `+${args.num}`}
          eventDisplay="block"
          displayEventTime={false}
          displayEventEnd={false}
          eventOverlap={true}
          selectOverlap={true}
          eventMaxStack={10}
          progressiveEventRendering={true}
          eventSourceSuccess={(events) => {
            console.log(`🔍 FullCalendar received ${events.length} events for rendering`);
            return events;
          }}
          eventAllow={(dropInfo, draggedEvent) => {
            // This helps FullCalendar understand multi-day event constraints
            return true;
          }}
          eventClassNames={(info) => {
            // Force proper class names for multi-day events
            const event = info.event;
            const isMultiDay = event.classNames.includes('multi-day-event');
            
            if (isMultiDay) {
              console.log(`🔍 FORCING MULTI-DAY CLASSES: ${event.title}`);
              return ['multi-day-event', 'fc-daygrid-block-event', 'fc-h-event'];
            }
            
            return ['single-day-event', 'fc-daygrid-block-event', 'fc-h-event'];
          }}
          eventDidMount={(info) => {
            // Multi-day spanning solution: Create connected visual tiles
            console.log(`🔍 FULLCALENDAR MOUNTED EVENT: ${info.event.title}`);
            console.log(`  Event start: ${info.event.start}`);
            console.log(`  Event end: ${info.event.end}`);
            console.log(`  Event allDay: ${info.event.allDay}`);
            console.log(`  Event className: ${info.event.classNames}`);
            
            const isMultiDay = info.event.classNames.includes('multi-day-event');
            console.log(`  Is multi-day: ${isMultiDay}`);
            
            if (isMultiDay) {
              console.log(`🔍 CREATING CONNECTED MULTI-DAY TILES: ${info.event.title}`);
              
              // Get event dates
              const startDateStr = info.event.startStr.split('T')[0];
              const endDateStr = info.event.endStr.split('T')[0];
              
              // Calculate duration
              const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
              const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
              const startDateLocal = new Date(startYear, startMonth - 1, startDay);
              const endDateLocal = new Date(endYear, endMonth - 1, endDay);
              const daysDiff = Math.ceil((endDateLocal - startDateLocal) / (1000 * 60 * 60 * 24));
              
              console.log(`  Creating connected tiles for ${daysDiff} days (${startDateStr} to ${endDateStr})`);
              
              // Style the first tile as the start of a connected span
              info.el.style.borderTopRightRadius = '0px';
              info.el.style.borderBottomRightRadius = '0px';
              info.el.style.marginRight = '0px';
              info.el.style.borderRight = 'none';
              info.el.style.zIndex = '3';
              info.el.classList.add('multi-day-start-tile');
              
              // Add arrow indicator for continuation
              const arrow = document.createElement('span');
              arrow.innerHTML = '→';
              arrow.className = 'multi-day-arrow';
              arrow.style.cssText = `
                position: absolute !important;
                right: 2px !important;
                top: 50% !important;
                transform: translateY(-50%) !important;
                color: white !important;
                font-weight: bold !important;
                font-size: 14px !important;
                z-index: 10 !important;
                text-shadow: 1px 1px 1px rgba(0,0,0,0.5) !important;
                pointer-events: none !important;
              `;
              info.el.appendChild(arrow);
              
              // Create connected tiles for subsequent days
              let currentDate = new Date(startDateLocal);
              currentDate.setDate(currentDate.getDate() + 1); // Start from next day
              
              for (let dayIndex = 1; dayIndex < daysDiff; dayIndex++) {
                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                
                console.log(`  Creating connected tile ${dayIndex} for ${dateStr}`);
                
                // Find the target day cell
                const dayCell = document.querySelector(`[data-date="${dateStr}"]`);
                if (dayCell) {
                  // Create connected tile
                  const connectedTile = info.el.cloneNode(true);
                  
                  // Remove the arrow from cloned tiles first
                  const clonedArrow = connectedTile.querySelector('span');
                  if (clonedArrow) clonedArrow.remove();
                  
                  // Reset classes for connected tile
                  connectedTile.classList.remove('fc-event-start', 'fc-event-end', 'multi-day-start-tile');
                  connectedTile.classList.add('multi-day-connected-tile');
                  
                  // Determine if this is the last tile
                  const isLastTile = (dayIndex === daysDiff - 1);
                  
                  if (isLastTile) {
                    // Last tile styling - connect on left, round on right
                    connectedTile.style.borderTopLeftRadius = '0px';
                    connectedTile.style.borderBottomLeftRadius = '0px';
                    connectedTile.style.borderTopRightRadius = '3px';
                    connectedTile.style.borderBottomRightRadius = '3px';
                    connectedTile.style.marginLeft = '0px';
                    connectedTile.style.marginRight = '0px';
                    connectedTile.style.borderLeft = 'none';
                    connectedTile.classList.add('multi-day-end-tile');
                  } else {
                    // Middle tile styling - no rounded corners, connected on both sides
                    connectedTile.style.borderRadius = '0px';
                    connectedTile.style.marginLeft = '0px';
                    connectedTile.style.marginRight = '0px';
                    connectedTile.style.borderLeft = 'none';
                    connectedTile.style.borderRight = 'none';
                    connectedTile.classList.add('multi-day-middle-tile');
                    
                    // Add continuation arrow for middle tiles
                    const middleArrow = document.createElement('span');
                    middleArrow.innerHTML = '→';
                    middleArrow.className = 'multi-day-arrow';
                    middleArrow.style.cssText = arrow.style.cssText;
                    connectedTile.appendChild(middleArrow);
                  }
                  
                  // Ensure proper styling for all connected tiles
                  connectedTile.style.cssText += `
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    position: relative !important;
                    width: 100% !important;
                    background-color: ${info.event.backgroundColor} !important;
                    border-top: 1px solid ${info.event.borderColor} !important;
                    border-bottom: 1px solid ${info.event.borderColor} !important;
                    z-index: 3 !important;
                    box-sizing: border-box !important;
                    min-height: 20px !important;
                  `;
                  
                  // Find container for the connected tile
                  let container = dayCell.querySelector('.fc-daygrid-day-events');
                  if (!container) {
                    const dayTop = dayCell.querySelector('.fc-daygrid-day-top');
                    if (dayTop) {
                      container = document.createElement('div');
                      container.className = 'fc-daygrid-day-events';
                      container.style.cssText = 'position: relative; z-index: 2;';
                      dayTop.appendChild(container);
                    }
                  }
                  
                  if (!container) {
                    container = dayCell.querySelector('.fc-daygrid-day-top') || dayCell;
                  }
                  
                  // Add the connected tile
                  container.appendChild(connectedTile);
                  
                  console.log(`  Added connected tile ${dayIndex} for ${dateStr}`);
                } else {
                  console.warn(`  Could not find day cell for ${dateStr}`);
                }
                
                currentDate.setDate(currentDate.getDate() + 1);
              }
              
              console.log(`  Completed connected tiles for ${info.event.title}`);
            }
          }}
          eventContent={(eventInfo) => {
            // Force proper content for multi-day events
            const isMultiDay = eventInfo.event.classNames.includes('multi-day-event');
            
            if (isMultiDay) {
              console.log(`🔍 FORCING MULTI-DAY CONTENT: ${eventInfo.event.title}`);
              
              return {
                html: `<div class="fc-event-main-frame">
                  <div class="fc-event-title-container">
                    <div class="fc-event-title fc-sticky">${eventInfo.event.title}</div>
                  </div>
                </div>`
              };
            }
            
            // Custom event content to style technician names separately for single-day events
            if (isMobile) {
              return { html: `<div class="fc-event-title-mobile">${eventInfo.event.title}</div>` };
            } else {
              const technicians = eventInfo.event.extendedProps.technicians;
              return { 
                html: `
                  <div class="fc-event-content-custom">
                    <div class="fc-event-tech">${technicians}</div>
                    <div class="fc-event-title-custom">${eventInfo.event.title}</div>
                  </div>
                ` 
              };
            }
          }}
          dayCellClassNames={(arg) => {
            // Highlight today's date
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const cellDate = new Date(arg.date);
            cellDate.setHours(0, 0, 0, 0);
            return cellDate.getTime() === today.getTime() ? 'fc-day-today-custom' : '';
          }}
          dayCellDidMount={(arg) => {
            const dateStr = arg.date.toISOString().split('T')[0];
            const { vakt, absence } = getVaktAndAbsenceForDate(arg.date);
            
            // Remove any existing symbols
            const existingSymbols = arg.el.querySelector('.custom-day-symbols');
            if (existingSymbols) {
              existingSymbols.remove();
            }
            
            if (vakt.length > 0 || absence.length > 0) {
              // Create symbols container
              const symbolsContainer = document.createElement('div');
              symbolsContainer.className = 'custom-day-symbols';
              symbolsContainer.style.cssText = `
                position: absolute !important;
                top: 2px !important;
                right: 2px !important;
                display: flex !important;
                flex-direction: row !important;
                gap: 2px !important;
                z-index: 999 !important;
                pointer-events: auto !important;
              `;
              
              // Add absence symbol first
              if (absence.length > 0) {
                const techNames = absence.map(a => 
                  a.technicianId 
                    ? a.technicianId.fullName || `${a.technicianId.firstName} ${a.technicianId.lastName}`
                    : 'Unknown'
                ).join(', ');
                
                const absenceSpan = document.createElement('span');
                absenceSpan.innerHTML = '🔶';
                absenceSpan.title = techNames;
                absenceSpan.style.cssText = `
                  font-size: 10px !important;
                  background: rgba(255,255,255,0.9) !important;
                  border-radius: 3px !important;
                  padding: 1px 2px !important;
                  line-height: 1 !important;
                  display: inline-block !important;
                `;
                symbolsContainer.appendChild(absenceSpan);
                console.log('Added absence symbol for date:', arg.date.getDate(), 'technicians:', techNames);
              }
              
              // Add vakt symbol second
              if (vakt.length > 0) {
                const techNames = vakt.map(v => 
                  v.technicianId 
                    ? v.technicianId.fullName || `${v.technicianId.firstName} ${v.technicianId.lastName}`
                    : 'Unknown'
                ).join(', ');
                
                const vaktSpan = document.createElement('span');
                vaktSpan.innerHTML = '📅';
                vaktSpan.title = techNames;
                vaktSpan.style.cssText = `
                  font-size: 10px !important;
                  background: rgba(255,255,255,0.9) !important;
                  border-radius: 3px !important;
                  padding: 1px 2px !important;
                  line-height: 1 !important;
                  display: inline-block !important;
                `;
                symbolsContainer.appendChild(vaktSpan);
                console.log('Added vakt symbol for date:', arg.date.getDate(), 'technicians:', techNames);
              }
              
              // Make sure the cell has relative positioning
              arg.el.style.position = 'relative';
              arg.el.appendChild(symbolsContainer);
            }
          }}
          height={isMobile ? 'auto' : '85vh'}
          contentHeight={isMobile ? 'auto' : undefined}
          aspectRatio={isMobile ? undefined : 1.8}
          firstDay={1} // Monday
          slotMinTime="06:00:00"
          slotMaxTime="20:00:00"
          allDaySlot={true}
          nowIndicator={true}
          navLinks={true}
          editable={false}
          selectable={false}
          selectMirror={true}
          eventOrder="start,-duration,title"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
            hour12: false
          }}
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
            hour12: false
          }}
          // Force proper multi-day rendering
          dayMaxEventRows={false}
          eventConstraint={undefined}
          buttonText={{
            today: 'Today',
            month: 'Month',
            week: 'Week',
            day: 'Day',
            list: 'List'
          }}
        />
        </div>

        {/* Agenda View */}
        {showAgenda && (
          <div className="agenda-panel">
            <div className="agenda-header">
              <h5>Agenda for {agendaDate?.toLocaleDateString()}</h5>
              <button 
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowAgenda(false)}
              >
                ✕
              </button>
            </div>
            <div className="agenda-content">
              {getEventsForDate(agendaDate).map((event, index) => (
                <div key={index} className="agenda-item" onClick={() => handleEventClick({ event: { extendedProps: event.extendedProps } })}>
                  <div className="agenda-item-time">
                    {event.allDay ? 'All Day' : event.start}
                  </div>
                  <div className="agenda-item-content">
                    <div className="agenda-item-title">{event.title}</div>
                    {event.extendedProps.eventType === 'ticket' && (
                      <div className="agenda-item-tech">{event.extendedProps.technicians}</div>
                    )}
                  </div>
                  <div 
                    className="agenda-item-color" 
                    style={{ backgroundColor: event.backgroundColor }}
                  ></div>
                </div>
              ))}
              {getEventsForDate(agendaDate).length === 0 && (
                <div className="agenda-empty">No events for this date</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Selection Modal */}
      {showActionModal && selectedEvent && ReactDOM.createPortal(
        <>
          <div className="modal-backdrop" onClick={closeActionModal}></div>
          <div className="modal" style={{ display: 'flex' }}>
            <div className="modal-content" style={{ maxWidth: '400px', width: '90%' }}>
              <div className="modal-header">
                <h2 className="modal-title">Select Action</h2>
                <button className="modal-close" onClick={closeActionModal}>×</button>
              </div>
              <div className="modal-body">
                <p style={{ marginBottom: '20px', color: '#666' }}>
                  What would you like to do with this ticket?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleViewAction}
                    style={{ width: '100%', padding: '12px' }}
                  >
                    👁️ View Details
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={handleEditAction}
                    style={{ width: '100%', padding: '12px' }}
                  >
                    ✏️ Edit Ticket
                  </button>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeActionModal}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* View Ticket Modal */}
      {showViewModal && selectedEvent && ReactDOM.createPortal(
        <>
          <div className="modal-backdrop" onClick={closeViewModal}></div>
          <div className="modal" style={{ display: 'flex' }}>
            <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
              <div className="modal-header">
                <h2 className="modal-title">Ticket Details</h2>
                <button className="modal-close" onClick={closeViewModal}>×</button>
              </div>
              <div className="modal-body">
                <div className="view-ticket-content">
                  {/* Title */}
                  <div className="view-field">
                    <label className="view-label">Title:</label>
                    <div className="view-value">{selectedEvent.title}</div>
                  </div>

                  {/* Activity Numbers */}
                  {selectedEvent.activityNumbers && selectedEvent.activityNumbers.length > 0 && (
                    <div className="view-field">
                      <label className="view-label">Activity Numbers:</label>
                      <div className="view-value">
                        {selectedEvent.activityNumbers.join(' + ')}
                      </div>
                    </div>
                  )}
                  
                  {/* Description */}
                  <div className="view-field">
                    <label className="view-label">Description:</label>
                    <div className="view-value" style={{ whiteSpace: 'pre-wrap' }}>
                      {selectedEvent.description || 'No description'}
                    </div>
                  </div>
                  
                  {/* Department - Technician */}
                  <div className="view-row">
                    <div className="view-field view-field-half">
                      <label className="view-label">Department:</label>
                      <div className="view-value">
                        {Array.isArray(selectedEvent.assignedTo) && selectedEvent.assignedTo.length > 0
                          ? [...new Set(selectedEvent.assignedTo
                              .filter(tech => tech.department)
                              .map(tech => tech.department.name))]
                              .join(', ')
                          : selectedEvent.assignedTo?.department?.name || 'Not assigned'}
                      </div>
                    </div>
                    <div className="view-field view-field-half">
                      <label className="view-label">Technician:</label>
                      <div className="view-value">
                        {Array.isArray(selectedEvent.assignedTo) && selectedEvent.assignedTo.length > 0
                          ? selectedEvent.assignedTo
                              .map(tech => tech.fullName || `${tech.firstName} ${tech.lastName}`)
                              .join(', ')
                          : selectedEvent.assignedTo
                            ? selectedEvent.assignedTo.fullName || `${selectedEvent.assignedTo.firstName} ${selectedEvent.assignedTo.lastName}`
                            : 'Unassigned'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Start Date - End Date */}
                  <div className="view-row">
                    <div className="view-field view-field-half">
                      <label className="view-label">Start Date:</label>
                      <div className="view-value">{formatDate(selectedEvent.startDate)}</div>
                    </div>
                    {selectedEvent.endDate && (
                      <div className="view-field view-field-half">
                        <label className="view-label">End Date:</label>
                        <div className="view-value">{formatDate(selectedEvent.endDate)}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeViewModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Edit Ticket Modal */}
      {showEditModal && selectedEvent && ReactDOM.createPortal(
        <div className="modal">
          <div className="modal-content ticket-modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Ticket</h2>
              <button className="modal-close" onClick={closeEditModal}>×</button>
            </div>
            
            <form onSubmit={handleUpdateTicket}>
              {/* Title */}
              <div className="form-row-100">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Activity Numbers */}
              <div className="form-row-100">
                <div className="form-group">
                  <label className="form-label">Activity Numbers</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.activityNumbers.join(' + ')}
                    onChange={(e) => {
                      const numbers = e.target.value.split('+').map(n => n.trim());
                      setFormData({ ...formData, activityNumbers: numbers });
                    }}
                    onBlur={() => {
                      const cleaned = formData.activityNumbers.filter(n => n !== '');
                      setFormData({ ...formData, activityNumbers: cleaned });
                    }}
                    placeholder="Optional: e.g., 123456 + 789012"
                  />
                </div>
              </div>
              
              {/* Description */}
              <div className="form-row-100">
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>
              
              {/* Department */}
              <div className="form-row-100">
                <div className="form-group">
                  <label className="form-label">Department</label>
                  
                  {/* Desktop: Multi-select */}
                  <select
                    multiple
                    className="form-control form-select-modern desktop-only"
                    value={formData.department}
                    onChange={(e) => {
                      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                      setFormData({
                        ...formData,
                        department: selectedOptions,
                        assignedTo: formData.assignedTo.filter(techId => {
                          const tech = getFormFilteredTechnicians().find(t => t._id === techId);
                          return tech && selectedOptions.includes(tech.department._id);
                        })
                      });
                    }}
                    size="4"
                  >
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>
                        📋 {dept.name}
                      </option>
                    ))}
                  </select>
                  
                  {/* Mobile: Checkboxes */}
                  <div className="mobile-only" style={{
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    padding: '8px',
                    backgroundColor: '#f8f9fa',
                    maxHeight: '150px',
                    overflowY: 'auto'
                  }}>
                    {departments.map(dept => (
                      <label key={dept._id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        cursor: 'pointer',
                        backgroundColor: formData.department.includes(dept._id) ? '#e7f3ff' : 'transparent',
                        borderRadius: '4px',
                        marginBottom: '4px'
                      }}>
                        <input
                          type="checkbox"
                          checked={formData.department.includes(dept._id)}
                          onChange={(e) => {
                            const newDepartments = e.target.checked
                              ? [...formData.department, dept._id]
                              : formData.department.filter(id => id !== dept._id);
                            
                            setFormData({
                              ...formData,
                              department: newDepartments,
                              assignedTo: formData.assignedTo.filter(techId => {
                                const tech = getFormFilteredTechnicians().find(t => t._id === techId);
                                return tech && newDepartments.includes(tech.department._id);
                              })
                            });
                          }}
                          style={{ marginRight: '8px' }}
                        />
                        <span>📋 {dept.name}</span>
                      </label>
                    ))}
                  </div>
                  
                  <small style={{ color: '#666', fontSize: '0.85rem' }}>
                    <span className="desktop-only">Hold Ctrl (Windows) or Cmd (Mac) to select multiple</span>
                    <span className="mobile-only">Tap to select multiple departments</span>
                  </small>
                </div>
              </div>
              
              {/* Technician */}
              <div className="form-row-100">
                <div className="form-group">
                  <label className="form-label">Assigned To</label>
                  
                  {/* Desktop: Multi-select */}
                  <select
                    multiple
                    className="form-control form-select-modern desktop-only"
                    value={formData.assignedTo}
                    onChange={(e) => {
                      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                      setFormData({ ...formData, assignedTo: selectedOptions });
                    }}
                    disabled={formData.department.length === 0}
                    size="5"
                  >
                    {formData.department.length === 0 ? (
                      <option disabled>Please select departments first</option>
                    ) : (
                      getFormFilteredTechnicians().map(tech => (
                        <option key={tech._id} value={tech._id}>
                          👤 {tech.fullName} {tech.department && `(${tech.department.name})`}
                        </option>
                      ))
                    )}
                  </select>
                  
                  {/* Mobile: Checkboxes */}
                  <div className="mobile-only" style={{
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    padding: '8px',
                    backgroundColor: formData.department.length === 0 ? '#f0f0f0' : '#f8f9fa',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    opacity: formData.department.length === 0 ? 0.6 : 1
                  }}>
                    {formData.department.length === 0 ? (
                      <div style={{ color: '#999', fontStyle: 'italic', padding: '8px', textAlign: 'center' }}>
                        Please select departments first
                      </div>
                    ) : getFormFilteredTechnicians().length === 0 ? (
                      <div style={{ color: '#999', fontStyle: 'italic', padding: '8px', textAlign: 'center' }}>
                        No technicians available
                      </div>
                    ) : (
                      getFormFilteredTechnicians().map(tech => (
                        <label key={tech._id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px',
                          cursor: 'pointer',
                          backgroundColor: formData.assignedTo.includes(tech._id) ? '#e7f3ff' : 'transparent',
                          borderRadius: '4px',
                          marginBottom: '4px'
                        }}>
                          <input
                            type="checkbox"
                            checked={formData.assignedTo.includes(tech._id)}
                            onChange={(e) => {
                              const newAssignedTo = e.target.checked
                                ? [...formData.assignedTo, tech._id]
                                : formData.assignedTo.filter(id => id !== tech._id);
                              
                              setFormData({
                                ...formData,
                                assignedTo: newAssignedTo
                              });
                            }}
                            style={{ marginRight: '8px' }}
                          />
                          <span>👤 {tech.fullName} {tech.department && `(${tech.department.name})`}</span>
                        </label>
                      ))
                    )}
                  </div>
                  
                  <small style={{ color: '#666', fontSize: '0.85rem' }}>
                    <span className="desktop-only">Hold Ctrl (Windows) or Cmd (Mac) to select multiple</span>
                    <span className="mobile-only">Tap to select multiple technicians</span>
                  </small>
                </div>
              </div>
              
              {/* Dates */}
              <div className="form-row-50-50">
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">End Date (Optional)</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
    </>
  );
};

export default Calendar;
