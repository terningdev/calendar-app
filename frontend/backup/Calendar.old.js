import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Calendar as BigCalendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/nb'; // Norwegian locale
import { toast } from 'react-toastify';
import { ticketService } from '../services/ticketService';
import { technicianService } from '../services/technicianService';
import { absenceService } from '../services/absenceService';
import { departmentService } from '../services/departmentService';
import { useTranslation } from '../utils/translations';

const Calendar = () => {
  const { t, language } = useTranslation();

  // Configure moment based on current language
  useEffect(() => {
    const locale = language === 'no' ? 'nb' : 'en';
    moment.locale(locale);
    
    // Configure moment to use Monday as first day of week for both locales
    moment.updateLocale(locale, {
      week: {
        dow: 1, // Monday is the first day of the week
        doy: 4  // First week of year must contain 4th of January
      }
    });
  }, [language]);

const localizer = momentLocalizer(moment);
  
  // Function to detect if we're on mobile
  const isMobile = () => {
    return window.innerWidth <= 768;
  };
  
  // Set initial view based on screen size
  const getInitialView = () => {
    return isMobile() ? 'day' : 'month';
  };
  
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState(getInitialView());
  const [customColors, setCustomColors] = useState({
    unassignedTickets: '#e74c3c',
    assignedTickets: '#27ae60',
    absence: '#e67e22',
    vakt: '#9b59b6'
  });
  
  // Form data for editing tickets
  const [formData, setFormData] = useState({
    title: '',
    activityNumber: '',
    description: '',
    assignedTo: [],
    department: [],
    startDate: '',
    endDate: '',
    createdBy: 'System User'
  });

  // Helper function to format technician name (First Name + Last Initial)
  const formatTechnicianName = (technician) => {
    if (!technician || !technician.firstName) return t('unassigned');
    
    const firstName = technician.firstName;
    const lastInitial = technician.lastName ? `${technician.lastName.charAt(0)}.` : '';
    
    return `${firstName} ${lastInitial}`.trim();
  };

  // Helper function to format multiple technicians
  const formatTechniciansNames = (assignedTo) => {
    if (!assignedTo) return t('unassigned');
    
    if (Array.isArray(assignedTo)) {
      if (assignedTo.length === 0) return t('unassigned');
      if (assignedTo.length === 1) return formatTechnicianName(assignedTo[0]);
      return assignedTo.map(tech => formatTechnicianName(tech)).join(', ');
    } else {
      return formatTechnicianName(assignedTo);
    }
  };

  // Helper function to get filtered technicians for form based on selected departments
  const getFormFilteredTechnicians = () => {
    let filteredTechnicians;
    if (!formData.department || formData.department.length === 0) {
      filteredTechnicians = [];
    } else {
      filteredTechnicians = technicians.filter(tech => 
        formData.department.includes(tech.department?._id)
      );
    }
    
    // Sort technicians alphabetically by first name
    return filteredTechnicians.sort((a, b) => 
      a.firstName.localeCompare(b.firstName)
    );
  };

  // Helper function to handle department change in form
  const handleFormDepartmentChange = (departmentId) => {
    const isSelected = formData.department.includes(departmentId);
    let newDepartments;
    
    if (isSelected) {
      // Remove department
      newDepartments = formData.department.filter(id => id !== departmentId);
    } else {
      // Add department
      newDepartments = [...formData.department, departmentId];
    }
    
    // Filter out technicians that are no longer in selected departments
    const technicianIdsInNewDepartments = technicians
      .filter(tech => newDepartments.includes(tech.department?._id))
      .map(tech => tech._id);
    
    const filteredAssignedTo = formData.assignedTo.filter(techId => 
      technicianIdsInNewDepartments.includes(techId)
    );
    
    setFormData({
      ...formData,
      department: newDepartments,
      assignedTo: filteredAssignedTo
    });
  };

  // Custom date formats for the calendar
  const formats = {
    dateFormat: 'DD',
    dayFormat: (date, culture, localizer) => {
      const dayNames = {
        en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        no: ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag']
      };
      const locale = language === 'no' ? 'no' : 'en';
      return dayNames[locale][moment(date).day()];
    },
    weekdayFormat: (date, culture, localizer) => {
      const dayNames = {
        en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        no: ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag']
      };
      const locale = language === 'no' ? 'no' : 'en';
      return dayNames[locale][moment(date).day()];
    },
    monthHeaderFormat: (date, culture, localizer) => {
      const monthNames = {
        en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        no: ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember']
      };
      const locale = language === 'no' ? 'no' : 'en';
      return `${monthNames[locale][moment(date).month()]} ${moment(date).year()}`;
    }
  };

  // Custom date cell component to show week numbers
  const CustomDateCellWrapper = ({ children, value }) => {
    const isMonday = moment(value).day() === 1;
    const weekNumber = moment(value).week();
    const shouldShowWeekNumber = isMonday && (view === 'month' || view === 'week');
    
    return (
      <div className="custom-date-cell">
        {shouldShowWeekNumber && (
          <div className="week-number">
            {language === 'no' ? `Uke ${weekNumber}` : `W${weekNumber}`}
          </div>
        )}
        {children}
      </div>
    );
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Calculate date range based on current view
      let startDate, endDate;
      const date = moment(currentDate);
      
      switch (view) {
        case 'month':
          startDate = date.clone().startOf('month').startOf('week');
          endDate = date.clone().endOf('month').endOf('week');
          break;
        case 'week':
          startDate = date.clone().startOf('week');
          endDate = date.clone().endOf('week');
          break;
        case 'day':
          // For day view, expand range to catch multi-day tickets
          // Look back and forward 30 days to ensure we get all overlapping tickets
          startDate = date.clone().subtract(30, 'days').startOf('day');
          endDate = date.clone().add(30, 'days').endOf('day');
          break;
        default:
          startDate = date.clone().startOf('month');
          endDate = date.clone().endOf('month');
      }

      // Load data with individual error handling
      const [ticketsData, absencesData, techniciansData, departmentsData] = await Promise.allSettled([
        ticketService.getForCalendar(
          startDate.toISOString(),
          endDate.toISOString()
        ),
        absenceService.getForCalendar(
          startDate.toISOString(),
          endDate.toISOString()
        ),
        technicianService.getAll(),
        departmentService.getAll()
      ]);

      // Handle resolved/rejected promises
      const tickets = ticketsData.status === 'fulfilled' ? ticketsData.value : [];
      const absences = absencesData.status === 'fulfilled' ? absencesData.value : [];
      const technicians = techniciansData.status === 'fulfilled' ? techniciansData.value : [];
      const departments = departmentsData.status === 'fulfilled' ? departmentsData.value : [];

      setTickets(tickets);
      setAbsences(absences);
      setTechnicians(technicians);
      setDepartments(departments);
      
      // Group tickets by date and create count events for month/week view
      const ticketsByDate = {};
      if (Array.isArray(tickets)) {
        tickets.forEach(ticket => {
          if (ticket && ticket.startDate) {
            const dateKey = moment(ticket.startDate).format('YYYY-MM-DD');
            if (!ticketsByDate[dateKey]) {
              ticketsByDate[dateKey] = [];
            }
            ticketsByDate[dateKey].push(ticket);
          }
        });
      }

      // Create absence events that span multiple days
      const absenceEvents = [];
      if (Array.isArray(absences)) {
        absences.forEach(absence => {
          if (absence && absence.startDate && absence.endDate && absence.technicianId) {
            const startDate = new Date(absence.startDate);
            const endDate = new Date(absence.endDate);
            
            let title = `${absence.technicianId.fullName} - ${absence.title}`;
            
            absenceEvents.push({
              id: `absence-${absence._id}`,
              title: title,
              start: startDate,
              end: endDate,
              resource: { type: 'absence', data: absence },
              allDay: true
            });
          }
        });
      }

      let calendarEvents = [];
      
      if (view === 'day' || view === 'week') {
        // For day and week view, show individual tickets with full details
        let filteredTickets = Array.isArray(tickets) ? tickets : [];
        
        // For day view, filter to only show tickets that overlap with the current day
        if (view === 'day') {
          const currentDayStart = moment(currentDate).startOf('day');
          const currentDayEnd = moment(currentDate).endOf('day');
          
          filteredTickets = filteredTickets.filter(ticket => {
            if (!ticket || !ticket.startDate) return false;
            
            const ticketStart = moment(ticket.startDate);
            const ticketEnd = ticket.endDate ? moment(ticket.endDate) : ticketStart;
            
            // Check if ticket overlaps with current day
            return ticketStart.isSameOrBefore(currentDayEnd) && 
                   ticketEnd.isSameOrAfter(currentDayStart);
          });
        }
        
        const ticketEvents = filteredTickets.map(ticket => {
          if (!ticket || !ticket._id || !ticket.startDate) return null;
          
          const startTime = new Date(ticket.startDate);
          let endTime;
          
          if (ticket.endDate) {
            // For multi-day tickets, set end time to end of the end date
            endTime = new Date(ticket.endDate);
            endTime.setHours(23, 59, 59, 999);
          } else {
            // For single-day tickets, set end time to end of start date
            endTime = new Date(startTime);
            endTime.setHours(23, 59, 59, 999);
          }
          
          const title = ticket.title;
          
          return {
            id: ticket._id,
            title: title,
            start: startTime,
            end: endTime,
            resource: { type: 'ticket', data: ticket },
            allDay: true
          };
        }).filter(Boolean);

        // For day and week view, include all absence events (they'll span correctly)
        calendarEvents = [...ticketEvents, ...absenceEvents];
      } else {
        // For month view, separate multi-day tickets from single-day tickets
        const multiDayTicketEvents = [];
        const singleDayTicketsByDate = {};
        
        // Process all tickets to separate multi-day from single-day
        Array.isArray(tickets) && tickets.forEach(ticket => {
          if (!ticket || !ticket._id || !ticket.startDate) return;
          
          const startDate = moment(ticket.startDate);
          const endDate = ticket.endDate ? moment(ticket.endDate) : startDate;
          const isMultiDay = !startDate.isSame(endDate, 'day');
          
          if (isMultiDay) {
            // Create individual events for multi-day tickets
            const technicianName = formatTechniciansNames(ticket.assignedTo);
            
            multiDayTicketEvents.push({
              id: `multiday-ticket-${ticket._id}`,
              title: `${technicianName} - ${ticket.title}`,
              start: startDate.toDate(),
              end: endDate.toDate(),
              resource: { type: 'multiday-ticket', data: ticket },
              allDay: true
            });
          } else {
            // Group single-day tickets by date
            const dateKey = startDate.format('YYYY-MM-DD');
            if (!singleDayTicketsByDate[dateKey]) {
              singleDayTicketsByDate[dateKey] = [];
            }
            singleDayTicketsByDate[dateKey].push(ticket);
          }
        });
        
        // Create summary events for single-day tickets grouped by date and assignment status
        const singleDayTicketEvents = [];
        const allDates = Object.keys(singleDayTicketsByDate);
        
        allDates.forEach(dateKey => {
          const ticketsForDate = singleDayTicketsByDate[dateKey] || [];
          if (ticketsForDate.length > 0) {
            const date = new Date(dateKey);
            
            // Separate assigned and unassigned tickets
            const assignedTickets = ticketsForDate.filter(ticket => 
              Array.isArray(ticket.assignedTo) ? ticket.assignedTo.length > 0 : !!ticket.assignedTo
            );
            const unassignedTickets = ticketsForDate.filter(ticket => 
              Array.isArray(ticket.assignedTo) ? ticket.assignedTo.length === 0 : !ticket.assignedTo
            );
            
            // Create separate events for assigned and unassigned tickets
            if (assignedTickets.length > 0) {
              const title = `${assignedTickets.length} ticket${assignedTickets.length !== 1 ? 's' : ''}`;
              
              singleDayTicketEvents.push({
                id: `assigned-tickets-${dateKey}`,
                title: title,
                start: date,
                end: date,
                resource: { type: 'assigned-ticket-summary', tickets: assignedTickets, date: dateKey },
                allDay: true
              });
            }
            
            if (unassignedTickets.length > 0) {
              const title = `${unassignedTickets.length} unassigned ticket${unassignedTickets.length !== 1 ? 's' : ''}`;
              
              singleDayTicketEvents.push({
                id: `unassigned-tickets-${dateKey}`,
                title: title,
                start: date,
                end: date,
                resource: { type: 'unassigned-ticket-summary', tickets: unassignedTickets, date: dateKey },
                allDay: true
              });
            }
          }
        });
        
        // Combine all events: multi-day tickets, single-day ticket summaries, and absence events
        calendarEvents = [...multiDayTicketEvents, ...singleDayTicketEvents, ...absenceEvents];
      }

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error loading calendar data:', error);
      setError('Failed to load calendar data. Please try refreshing the page.');
      toast.error('Error loading calendar data');
    } finally {
      setLoading(false);
    }
  }, [currentDate, view]);

  useEffect(() => {
    // Debounce the loadData call to prevent excessive API calls
    const timeoutId = setTimeout(() => {
      loadData();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [loadData]);

  // Handle window resize to switch between mobile/desktop default views
  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = isMobile();
      const currentIsMobile = view === 'day';
      
      // Only change view if switching between mobile/desktop and user hasn't manually changed view
      if (newIsMobile && !currentIsMobile) {
        setView('day');
      } else if (!newIsMobile && currentIsMobile && view === 'day') {
        setView('month');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [view]);

  // Load custom colors from localStorage and listen for changes
  useEffect(() => {
    const loadCustomColors = () => {
      const savedColors = localStorage.getItem('calendarColors');
      if (savedColors) {
        try {
          const colors = JSON.parse(savedColors);
          setCustomColors(prev => ({ ...prev, ...colors }));
        } catch (error) {
          console.warn('Error loading custom colors:', error);
        }
      }
    };

    // Load colors on mount
    loadCustomColors();

    // Listen for color changes from Administrator component
    const handleColorChange = (event) => {
      setCustomColors(prev => ({ ...prev, ...event.detail }));
    };

    window.addEventListener('colorSettingsChanged', handleColorChange);
    
    return () => {
      window.removeEventListener('colorSettingsChanged', handleColorChange);
    };
  }, []);

  const handleSelectEvent = (event) => {
    if (view === 'day' || view === 'threeDayList') {
      // In day view and 3-day list view, show details modal for tickets (absences don't have a modal yet)
      if (event.resource?.type === 'ticket') {
        setSelectedEvent(event.resource.data);
        setShowModal(true);
      } else if (event.resource?.type === 'absence') {
        // For now, just log the absence details - could add absence modal later
        console.log('Selected absence:', event.resource.data);
      } else {
        // Legacy format
        setSelectedEvent(event.resource);
        setShowModal(true);
      }
    } else {
      // In month/week view, handle different event types
      if (event.resource?.type === 'assigned-ticket-summary' || event.resource?.type === 'unassigned-ticket-summary') {
        const selectedDate = new Date(event.resource.date);
        setCurrentDate(selectedDate);
        setView('day');
      } else if (event.resource?.type === 'ticket-summary') {
        // Legacy ticket summary
        const selectedDate = new Date(event.resource.date);
        setCurrentDate(selectedDate);
        setView('day');
      } else if (event.resource?.type === 'multiday-ticket') {
        // Multi-day ticket click - show ticket details
        setSelectedEvent(event.resource.data);
        setShowModal(true);
      } else if (event.resource?.type === 'absence') {
        // For absence spans, switch to day view on the start date
        setCurrentDate(event.start);
        setView('day');
      } else if (event.resource?.type === 'summary') {
        // Legacy format
        const selectedDate = new Date(event.resource.date);
        setCurrentDate(selectedDate);
        setView('day');
      } else {
        // Fallback: use event start date
        setCurrentDate(event.start);
        setView('day');
      }
    }
  };

  const handleSelectSlot = ({ start }) => {
    // When clicking on an empty slot, switch to day view
    setCurrentDate(start);
    setView('day');
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEvent(null);
  };

  // Edit modal functions
  const openEditModal = (ticket) => {
    // Always use the actual title field - never parse it from ticketNumber
    let title = ticket.title;
    let activityNumber = '';
    
    // Only try to extract activity number if ticketNumber is different from title
    if (ticket.ticketNumber && ticket.ticketNumber !== ticket.title) {
      // Check if ticketNumber starts with the title followed by " - "
      const titlePrefix = ticket.title + ' - ';
      if (ticket.ticketNumber.startsWith(titlePrefix)) {
        // Extract everything after "title - " as the activity number
        activityNumber = ticket.ticketNumber.substring(titlePrefix.length);
      }
      // If ticketNumber doesn't follow the "title - activity" pattern, 
      // it's a custom ticketNumber, so don't try to parse it
    }

    // Extract assigned technicians
    const assignedTechIds = Array.isArray(ticket.assignedTo) 
      ? ticket.assignedTo.map(tech => tech._id || tech)
      : ticket.assignedTo ? [ticket.assignedTo._id || ticket.assignedTo] : [];

    // Extract departments from assigned technicians (default to Trondheim if none)
    const assignedTechnicians = technicians.filter(tech => assignedTechIds.includes(tech._id));
    const departmentIds = assignedTechnicians.length > 0 
      ? [...new Set(assignedTechnicians.map(tech => tech.department?._id).filter(Boolean))]
      : [departments.find(dept => dept.name === 'Trondheim')?._id].filter(Boolean);

    setFormData({
      title: title,
      activityNumber: activityNumber,
      description: ticket.description,
      assignedTo: assignedTechIds,
      department: departmentIds,
      startDate: ticket.startDate ? moment(ticket.startDate).format('YYYY-MM-DD') : '',
      endDate: ticket.endDate ? moment(ticket.endDate).format('YYYY-MM-DD') : '',
      createdBy: ticket.createdBy || 'System User'
    });

    setEditingTicket(ticket);
    setShowEditModal(true);
    setShowModal(false); // Close the details modal
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingTicket(null);
    setFormData({
      title: '',
      activityNumber: '',
      description: '',
      assignedTo: [],
      department: [],
      startDate: '',
      endDate: '',
      createdBy: 'System User'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      const cleanData = { ...formData };
      
      // Auto-generate ticket number from title and optional activity number
      if (cleanData.title) {
        if (cleanData.activityNumber && cleanData.activityNumber.trim() !== '') {
          cleanData.ticketNumber = `${cleanData.title} - ${cleanData.activityNumber}`;
        } else {
          cleanData.ticketNumber = cleanData.title;
        }
      }
      
      // Remove temporary fields
      delete cleanData.activityNumber;
      delete cleanData.department;
      
      // Remove assignedTo if empty array
      if (!cleanData.assignedTo || cleanData.assignedTo.length === 0) {
        cleanData.assignedTo = [];
      }

      await ticketService.update(editingTicket._id, cleanData);
      toast.success('Ticket updated successfully!');
      
      // Reload data to refresh the calendar
      await loadData();
      
      closeEditModal();
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('Error updating ticket');
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    try {
      await ticketService.delete(ticketId);
      toast.success('Ticket deleted successfully!');
      
      // Reload data to refresh the calendar
      await loadData();
      
      closeEditModal();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast.error('Error deleting ticket');
    }
  };

  const eventStyleGetter = (event) => {
    let backgroundColor = '#3498db'; // Default blue
    
    try {
      if (event?.resource?.type === 'absence') {
        const absence = event.resource.data;
        // Different colors for absence vs vakt using custom colors
        // Check both the new 'type' field and legacy 'title' field for backwards compatibility
        if (absence?.type === 'vakt' || absence?.title?.toLowerCase().includes('vakt')) {
          backgroundColor = customColors.vakt;
        } else {
          backgroundColor = customColors.absence;
        }
      } else if (event?.resource?.type === 'ticket') {
        const ticket = event.resource.data;
        // Color code by assigned status for tickets using custom colors
        const isAssigned = Array.isArray(ticket?.assignedTo) 
          ? ticket.assignedTo.length > 0 
          : !!ticket?.assignedTo;
        backgroundColor = isAssigned ? customColors.assignedTickets : customColors.unassignedTickets;
      } else if (event?.resource?.type === 'multiday-ticket') {
        const ticket = event.resource.data;
        // Color code by assigned status for multi-day tickets using custom colors
        const isAssigned = Array.isArray(ticket?.assignedTo) 
          ? ticket.assignedTo.length > 0 
          : !!ticket?.assignedTo;
        backgroundColor = isAssigned ? customColors.assignedTickets : customColors.unassignedTickets;
      } else if (event?.resource?.type === 'assigned-ticket-summary') {
        // Green for assigned ticket summaries
        backgroundColor = customColors.assignedTickets;
      } else if (event?.resource?.type === 'unassigned-ticket-summary') {
        // Red for unassigned ticket summaries
        backgroundColor = customColors.unassignedTickets;
      } else if (event?.resource?.type === 'ticket-summary') {
        // Legacy blue for ticket summaries (fallback)
        backgroundColor = '#3498db';
      } else if (event?.resource?.type === 'summary') {
        // Legacy mixed color for summary view with both tickets and absences
        if (event.resource.tickets?.length > 0 && event.resource.absences?.length > 0) {
          backgroundColor = '#9b59b6'; // Purple for mixed
        } else if (event.resource.absences?.length > 0) {
          // Check if any absence is vakt for smarter color selection
          const hasVakt = event.resource.absences.some(absence => 
            absence?.type === 'vakt' || absence?.title?.toLowerCase().includes('vakt')
          );
          backgroundColor = hasVakt ? customColors.vakt : customColors.absence;
        } else {
          backgroundColor = '#3498db'; // Blue for tickets only
        }
      } else {
        // Legacy format for backwards compatibility using custom colors
        const ticket = event.resource;
        if (ticket?.assignedTo) {
          backgroundColor = customColors.assignedTickets;
        } else {
          backgroundColor = customColors.unassignedTickets;
        }
      }
    } catch (error) {
      console.warn('Error in eventStyleGetter:', error);
      // Fall back to default color
    }

    // Add class for tickets with descriptions in week view
    let className = '';
    if (view === 'week' && event.resource?.type === 'ticket') {
      const ticket = event.resource.data;
      const hasDescription = ticket.description && ticket.description.trim() !== '';
      if (hasDescription) {
        className = 'ticket-with-description';
      }
    } else if (view === 'week' && event.resource && event.resource.description && event.resource.description.trim() !== '') {
      // Legacy format
      className = 'ticket-with-description';
    }

    return {
      className,
      style: {
        backgroundColor,
        borderRadius: '3px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  const formatEventTitle = (event) => {
    if (event.resource?.type === 'absence') {
      const absence = event.resource.data;
      return `${absence.technicianId.fullName} - ${absence.title}`;
    } else if (event.resource?.type === 'multiday-ticket') {
      // Multi-day tickets in month view: already formatted as "Technician - Title"
      return event.title;
    } else if (event.resource?.type === 'ticket') {
      const ticket = event.resource.data;
      const technicianName = formatTechniciansNames(ticket.assignedTo);
      
      // For day view, let CustomEvent component handle the formatting entirely
      if (view === 'day') {
        return `${technicianName} - ${ticket.title}`;
      }
      
      // For week view, use format: Technician - Title
      if (view === 'week') {
        return `${technicianName} - ${ticket.title}`;
      }
      
      // For other views (month), use original format
      return `${ticket.title} - ${technicianName}`;
    } else if (event.resource?.type === 'assigned-ticket-summary') {
      // Assigned ticket summary already has the title formatted
      return event.title;
    } else if (event.resource?.type === 'unassigned-ticket-summary') {
      // Unassigned ticket summary already has the title formatted
      return event.title;
    } else if (event.resource?.type === 'ticket-summary') {
      // Legacy ticket summary already has the title formatted
      return event.title;
    } else if (event.resource?.type === 'summary') {
      // Legacy summary view already has the title formatted
      return event.title;
    } else {
      // Legacy format for backwards compatibility
      const ticket = event.resource;
      const technicianName = formatTechniciansNames(ticket.assignedTo);
      
      // For day view, let CustomEvent component handle the formatting entirely
      if (view === 'day') {
        return `${technicianName} - ${ticket.title}`;
      }
      
      // For week view, use format: Technician - Title
      if (view === 'week') {
        return `${technicianName} - ${ticket.title}`;
      }
      
      // For other views (month), use original format
      return `${ticket.title} - ${technicianName}`;
    }
  };

  const CustomEvent = ({ event }) => {
    if (view === 'day') {
      // Day view: show individual items with detailed format
      if (event.resource?.type === 'absence') {
        const absence = event.resource.data;
        return (
          <div style={{ height: '100%', padding: '2px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {absence.technicianId.fullName} - {absence.title}
            </span>
          </div>
        );
      } else if (event.resource?.type === 'ticket') {
        const ticket = event.resource.data;
        const technicianName = formatTechniciansNames(ticket.assignedTo);
        
        // Extract activity number from ticketNumber using smart parsing
        let activityNumber = '';
        // Only try to extract activity number if ticketNumber is different from title
        if (ticket.ticketNumber && ticket.ticketNumber !== ticket.title) {
          // Check if ticketNumber starts with the title followed by " - "
          const titlePrefix = ticket.title + ' - ';
          if (ticket.ticketNumber.startsWith(titlePrefix)) {
            // Extract everything after "title - " as the activity number
            activityNumber = ticket.ticketNumber.substring(titlePrefix.length);
          }
          // If ticketNumber doesn't follow the "title - activity" pattern, 
          // it's a custom ticketNumber, so don't try to parse it
        }
        
        // Format the display lines according to user requirements
        const line1 = `${technicianName} - ${ticket.title}`;
        const line2Parts = [];
        if (activityNumber) {
          line2Parts.push(activityNumber);
        }
        if (ticket.description) {
          line2Parts.push(ticket.description);
        }
        const line2 = line2Parts.join(' - ');
        
        return (
          <div style={{ 
            height: '100%', 
            padding: '2px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            fontSize: '0.75rem',
            lineHeight: '1.2'
          }}>
            <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {line1}
            </div>
            {line2 && (
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {line2}
              </div>
            )}
          </div>
        );
      } else {
        // Legacy format for backwards compatibility
        const ticket = event.resource;
        const technicianName = ticket.assignedTo ? 
          formatTechnicianName(ticket.assignedTo) : 
          t('unassigned');
        
        // Extract activity number from ticketNumber using smart parsing
        let activityNumber = '';
        // Only try to extract activity number if ticketNumber is different from title
        if (ticket.ticketNumber && ticket.ticketNumber !== ticket.title) {
          // Check if ticketNumber starts with the title followed by " - "
          const titlePrefix = ticket.title + ' - ';
          if (ticket.ticketNumber.startsWith(titlePrefix)) {
            // Extract everything after "title - " as the activity number
            activityNumber = ticket.ticketNumber.substring(titlePrefix.length);
          }
          // If ticketNumber doesn't follow the "title - activity" pattern, 
          // it's a custom ticketNumber, so don't try to parse it
        }
        
        // Format the display lines according to user requirements
        const line1 = `${technicianName} - ${ticket.title}`;
        const line2Parts = [];
        if (activityNumber) {
          line2Parts.push(activityNumber);
        }
        if (ticket.description) {
          line2Parts.push(ticket.description);
        }
        const line2 = line2Parts.join(' - ');
        
        return (
          <div style={{ 
            height: '100%', 
            padding: '2px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            fontSize: '0.75rem',
            lineHeight: '1.2'
          }}>
            <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {line1}
            </div>
            {line2 && (
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {line2}
              </div>
            )}
          </div>
        );
      }
    } else if (view === 'week') {
      // Week view: show Technician - Title format
      if (event.resource?.type === 'absence') {
        const absence = event.resource.data;
        return (
          <div style={{ 
            height: '100%', 
            width: '100%',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: 0,
            padding: '2px'
          }}>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: 'bold', 
              textAlign: 'center',
              color: 'white',
              textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {absence.technicianId.fullName} - {absence.title}
            </span>
          </div>
        );
      } else if (event.resource?.type === 'multiday-ticket') {
        // Multi-day tickets: display with technician name - title format
        return (
          <div style={{ 
            height: '100%', 
            width: '100%',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: 0,
            padding: '2px'
          }}>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: 'bold', 
              textAlign: 'center',
              color: 'white',
              textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {event.title}
            </span>
          </div>
        );
      } else if (event.resource?.type === 'ticket') {
        const ticket = event.resource.data;
        const technicianName = formatTechniciansNames(ticket.assignedTo);
        
        // Check if description exists
        const hasDescription = ticket.description && ticket.description.trim() !== '';
        
        return (
          <div style={{ 
            height: '100%', 
            width: '100%',
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: hasDescription ? 'flex-start' : 'center',
            margin: 0,
            padding: '2px',
            lineHeight: '1.1'
          }}>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: 'bold', 
              textAlign: 'center',
              color: 'white',
              textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {technicianName} - {ticket.title}
            </span>
            {hasDescription && (
              <span style={{ 
                fontSize: '0.7rem', 
                textAlign: 'center',
                color: 'white',
                textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: '1px'
              }}>
                {ticket.description}
              </span>
            )}
          </div>
        );
      } else {
        // Legacy format for backwards compatibility
        const ticket = event.resource;
        const technicianName = formatTechniciansNames(ticket.assignedTo);
        
        // Check if description exists
        const hasDescription = ticket.description && ticket.description.trim() !== '';
        
        return (
          <div style={{ 
            height: '100%', 
            width: '100%',
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: hasDescription ? 'flex-start' : 'center',
            margin: 0,
            padding: '2px',
            lineHeight: '1.1'
          }}>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: 'bold', 
              textAlign: 'center',
              color: 'white',
              textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {technicianName} - {ticket.title}
            </span>
            {hasDescription && (
              <span style={{ 
                fontSize: '0.7rem', 
                textAlign: 'center',
                color: 'white',
                textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: '1px'
              }}>
                {ticket.description}
              </span>
            )}
          </div>
        );
      }
    } else {
      // Month view: show count centered within the date cell
      return (
        <div style={{ 
          height: '100%', 
          width: '100%',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: 0,
          padding: '2px'
        }}>
          <span style={{ 
            fontSize: '0.75rem', 
            fontWeight: 'bold', 
            textAlign: 'center',
            color: 'white',
            textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
            whiteSpace: 'nowrap'
          }}>
            {event.title}
          </span>
        </div>
      );
    }
  };

  const formatDate = (dateString) => {
    return moment(dateString).format('DD/MM/YYYY h:mm A');
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Custom view handler
  const handleViewChange = (newView) => {
    setView(newView);
    loadData(newView);
  };

  // Custom navigation handler
  const handleNavigate = (newDate, view, action) => {
    setCurrentDate(newDate);
  };

  // Custom toolbar component
  const CustomToolbar = ({ onNavigate, onView, view: currentView, date, label }) => {
    
    // Use our actual view state instead of the one passed by React Big Calendar
    const actualView = view;
    
    return (
      <div className="custom-calendar-toolbar">
        <div className="toolbar-left">
          {/* Back - Today - Next */}
          <button 
            className="toolbar-btn toolbar-arrow-btn"
            onClick={() => onNavigate('PREV')}
            title="Previous"
          >
            ‹
          </button>
          
          <button 
            className="toolbar-btn toolbar-today-btn"
            onClick={() => onNavigate('TODAY')}
          >
            {t('today')}
          </button>
          
          <button 
            className="toolbar-btn toolbar-arrow-btn"
            onClick={() => onNavigate('NEXT')}
            title="Next"
          >
            ›
          </button>
        </div>
        
        <div className="toolbar-center">
          <span className="toolbar-label">{label}</span>
        </div>
        
        <div className="toolbar-right">
          {/* Month - Week - 3 Days - Day */}
          <button 
            className={`toolbar-btn toolbar-view-btn ${actualView === 'month' ? 'active' : ''}`}
            onClick={() => {
              setView('month');
              onView('month');
            }}
          >
            {t('month')}
          </button>
          
          <button 
            className={`toolbar-btn toolbar-view-btn ${actualView === 'week' ? 'active' : ''}`}
            onClick={() => {
              setView('week');
              onView('week');
            }}
          >
            {t('week')}
          </button>
          
          <button 
            className={`toolbar-btn toolbar-view-btn ${actualView === 'day' ? 'active' : ''}`}
            onClick={() => {
              setView('day');
              onView('day');
            }}
          >
            {t('day')}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading calendar...</div>;
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <h3 style={{ color: '#e74c3c', marginBottom: '10px' }}>Error Loading Calendar</h3>
        <p style={{ marginBottom: '20px' }}>{error}</p>
        <button 
          className="btn btn-primary" 
          onClick={() => {
            setError(null);
            loadData();
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`calendar-container calendar-${view}`} 
      style={{ 
        position: 'absolute',
        top: '60px', // Height of navigation bar
        left: '0',
        right: '0',
        bottom: '0',
        overflow: 'hidden'
      }}
    >
      {/* Calendar */}
      <div className="calendar-wrapper">
        <BigCalendar
          localizer={localizer}
          culture={language === 'no' ? 'nb' : 'en'}
          events={events}
          startAccessor="start"
          endAccessor="end"
          titleAccessor={formatEventTitle}
          allDayAccessor={() => true}
          showMultiDayTimes={false}
          date={currentDate}
          view={view}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          eventPropGetter={eventStyleGetter}
          formats={formats}
          getNow={() => new Date()}
          toolbar={true}
          components={{
            event: CustomEvent,
            toolbar: CustomToolbar,
            dateCellWrapper: CustomDateCellWrapper,
            week: {
              header: ({ date, localizer }) => {
                const dayNames = {
                  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                  no: ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag']
                };
                const locale = language === 'no' ? 'no' : 'en';
                const dayName = dayNames[locale][moment(date).day()];
                return `${dayName} ${moment(date).format('D/M')}`;
              }
            }
          }}
          views={['month', 'week', 'day', 'agenda']}
          step={30}
          timeslots={2}
          min={new Date(2025, 0, 1, 7, 0, 0)}
          max={new Date(2025, 0, 1, 19, 0, 0)}
          style={{ height: '100%' }}
        />
      </div>

      {/* Ticket Details Modal */}
      {showModal && selectedEvent && ReactDOM.createPortal(
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Ticket Details</h2>
              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>
            
            <div style={{ padding: '0 0 20px 0' }}>
              <div style={{ marginBottom: '15px' }}>
                <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>
                  {selectedEvent.title}
                  {selectedEvent.ticketNumber && ` - ${selectedEvent.ticketNumber}`}
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                <div>
                  <strong>Start Date:</strong><br />
                  {formatDate(selectedEvent.startDate)}
                </div>
                <div>
                  <strong>End Date:</strong><br />
                  {selectedEvent.endDate ? formatDate(selectedEvent.endDate) : 'Not specified'}
                </div>
                <div>
                  <strong>{t('assignedTo')}:</strong><br />
                  {formatTechniciansNames(selectedEvent.assignedTo)}
                </div>
                <div>
                  <strong>{t('createdBy')}:</strong><br />
                  {selectedEvent.createdBy}
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <strong>{t('description')}:</strong><br />
                <p style={{ margin: '5px 0', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                  {selectedEvent.description}
                </p>
              </div>

              <div style={{ fontSize: '0.9rem', color: '#666' }}>
                <strong>{t('createdBy')}:</strong> {selectedEvent.createdBy}<br />
                <strong>{t('createdOn')}:</strong> {formatDate(selectedEvent.createdAt)}
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>
                {t('close')}
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => openEditModal(selectedEvent)}
              >
                {t('editTicket')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Ticket Modal */}
      {showEditModal && editingTicket && ReactDOM.createPortal(
        <div className="modal">
          <div className="modal-content ticket-modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Ticket</h2>
              <button className="modal-close" onClick={closeEditModal}>
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              {/* Title (66%) - Activity number (33%) */}
              <div className="form-row-66-33">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Enter ticket title"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Activity Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.activityNumber}
                    onChange={(e) => setFormData({ ...formData, activityNumber: e.target.value })}
                    placeholder="Optional: e.g., ACT-2025-001"
                  />
                </div>
              </div>
              
              {/* Description (100%) */}
              <div className="form-row-100">
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional: Enter ticket description..."
                  />
                </div>
              </div>
              
              {/* Department (50%) - Technicians (50%) */}
              <div className="form-row-50-50">
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <div className="department-selection" style={{ 
                    border: '1px solid #ddd', 
                    borderRadius: '4px', 
                    padding: '6px', 
                    height: '150px', 
                    overflowY: 'auto' 
                  }}>
                    <div style={{ marginBottom: '6px', fontWeight: 'bold', fontSize: '0.85rem', color: '#666' }}>
                      Select departments (multiple allowed):
                    </div>
                    {departments.map(dept => (
                      <label key={dept._id} style={{ 
                        display: 'block', 
                        marginBottom: '3px', 
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        padding: '2px 0'
                      }}>
                        <input
                          type="checkbox"
                          checked={formData.department.includes(dept._id)}
                          onChange={() => handleFormDepartmentChange(dept._id)}
                          style={{ marginRight: '6px' }}
                        />
                        {dept.name}
                      </label>
                    ))}
                    {formData.department.length > 0 && (
                      <div style={{ marginTop: '6px', fontSize: '0.85rem', color: '#666' }}>
                        Selected: {formData.department.length} department{formData.department.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Assigned To</label>
                  <div className="technician-selection" style={{ 
                    border: '1px solid #ddd', 
                    borderRadius: '4px', 
                    padding: '6px', 
                    height: '150px', 
                    overflowY: 'auto' 
                  }}>
                    <div style={{ marginBottom: '6px', fontWeight: 'bold', fontSize: '0.85rem', color: '#666' }}>
                      Select technicians (multiple allowed):
                    </div>
                    {formData.department && formData.department.length > 0 ? (
                      getFormFilteredTechnicians().length > 0 ? (
                        getFormFilteredTechnicians().map(tech => (
                          <label key={tech._id} style={{ 
                            display: 'block', 
                            marginBottom: '3px', 
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            padding: '2px 0'
                          }}>
                            <input
                              type="checkbox"
                              checked={formData.assignedTo.includes(tech._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ 
                                    ...formData, 
                                    assignedTo: [...formData.assignedTo, tech._id] 
                                  });
                                } else {
                                  setFormData({ 
                                    ...formData, 
                                    assignedTo: formData.assignedTo.filter(id => id !== tech._id) 
                                  });
                                }
                              }}
                              style={{ marginRight: '6px' }}
                            />
                            {tech.fullName}
                          </label>
                        ))
                      ) : (
                        <div style={{ color: '#999', fontStyle: 'italic', fontSize: '0.9rem' }}>
                          No technicians available in selected departments
                        </div>
                      )
                    ) : (
                      <div style={{ color: '#999', fontStyle: 'italic', fontSize: '0.9rem' }}>
                        Please select at least one department first
                      </div>
                    )}
                    {formData.assignedTo.length > 0 && (
                      <div style={{ marginTop: '6px', fontSize: '0.85rem', color: '#666' }}>
                        Selected: {formData.assignedTo.length} technician{formData.assignedTo.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Start date (50%) - End date (50%) */}
              <div className="form-row-50-50">
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    onKeyDown={(e) => e.preventDefault()}
                    style={{ cursor: 'pointer' }}
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
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    onKeyDown={(e) => e.preventDefault()}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              </div>
              
              {/* Created by (100%) */}
              <div className="form-row-100">
                <div className="form-group">
                  <label className="form-label">Created By</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.createdBy}
                    onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <div>
                    <button 
                      type="button" 
                      className="btn btn-danger"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this ticket?')) {
                          handleDeleteTicket(editingTicket._id);
                        }
                      }}
                    >
                      {t('delete')}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Update
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Calendar;