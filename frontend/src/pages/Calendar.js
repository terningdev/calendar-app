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
import { useTranslation } from '../utils/translations';
import { useAuth } from '../contexts/AuthContext';

const Calendar = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const calendarRef = useRef(null);
  
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    department: [],
    assignedTo: []
  });

  // Check permission
  const hasPermission = (permissionName) => {
    return user?.permissions?.[permissionName] === true;
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [ticketsData, techniciansData, departmentsData] = await Promise.all([
          ticketService.getAll(),
          technicianService.getAll(),
          departmentService.getAll()
        ]);
        
        setTickets(ticketsData);
        setTechnicians(techniciansData);
        setDepartments(departmentsData);
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
  }, [user]);

  // Convert tickets to FullCalendar events
  const getEvents = () => {
    // Start with all tickets
    let filteredTickets = tickets;
    
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

    return filteredTickets.map(ticket => {
      // Get technician names
      const techNames = Array.isArray(ticket.assignedTo)
        ? ticket.assignedTo.map(tech => tech.fullName || `${tech.firstName} ${tech.lastName}`).join(', ')
        : ticket.assignedTo
          ? ticket.assignedTo.fullName || `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
          : 'Unassigned';

      // Create display title - on mobile show just title, on desktop separate techs from title
      const displayTitle = isMobile ? ticket.title : ticket.title;

      // Calculate end date - add 1 day if there's no endDate or if it's the same day
      let endDate = ticket.endDate || ticket.startDate;
      const start = new Date(ticket.startDate);
      const end = new Date(endDate);
      
      // For FullCalendar, the end date is exclusive, so we need to add 1 day
      end.setDate(end.getDate() + 1);
      
      return {
        id: ticket._id,
        title: displayTitle,
        start: ticket.startDate,
        end: end.toISOString().split('T')[0], // Format as YYYY-MM-DD
        allDay: true,
        extendedProps: {
          ticket: ticket,
          description: ticket.description,
          technicians: techNames,
          activityNumbers: ticket.activityNumbers || []
        },
        backgroundColor: getTicketColor(ticket),
        borderColor: getTicketColor(ticket),
        textColor: '#ffffff'
      };
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

  // Handle event click
  const handleEventClick = (clickInfo) => {
    const ticket = clickInfo.event.extendedProps.ticket;
    setSelectedEvent(ticket);
    setShowModal(true);
  };

  // Handle date click (for creating new tickets - future enhancement)
  const handleDateClick = (dateClickInfo) => {
    // Could open a modal to create a new ticket
    console.log('Date clicked:', dateClickInfo.dateStr);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedEvent(null);
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
    <div className="page-container">
      {/* Page Title - Mobile Only */}
      {!isMobile && (
        <div className="page-header">
          <h1 className="page-title">{t('calendar')}</h1>
        </div>
      )}
      
      {/* Desktop Filters */}
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
            <select
              className="form-control"
              value={filters.department.length > 0 ? filters.department[0] : ''}
              onChange={(e) => setFilters({ ...filters, department: e.target.value ? [e.target.value] : [] })}
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
              {technicians.filter(t => t.isActive).map(tech => (
                <option key={tech._id} value={tech._id}>
                  {tech.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Mobile Filters - Compact */}
      <div className="mobile-only" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-control"
            placeholder={t('search') + '...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: '1 1 100%', minWidth: '200px' }}
          />
          <select
            className="form-control"
            value={filters.department.length > 0 ? filters.department[0] : ''}
            onChange={(e) => setFilters({ ...filters, department: e.target.value ? [e.target.value] : [] })}
            style={{ flex: '1 1 45%' }}
          >
            <option value="">{t('allDepartments')}</option>
            {departments.map(dept => (
              <option key={dept._id} value={dept._id}>
                {dept.name}
              </option>
            ))}
          </select>
          <select
            className="form-control"
            value={filters.assignedTo.length > 0 ? filters.assignedTo[0] : ''}
            onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value ? [e.target.value] : [] })}
            style={{ flex: '1 1 45%' }}
          >
            <option value="">{t('allTechnicians')}</option>
            <option value="unassigned">{t('unassigned')}</option>
            {technicians.filter(t => t.isActive).map(tech => (
              <option key={tech._id} value={tech._id}>
                {tech.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar */}
      <div className="calendar-wrapper">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView={isMobile ? 'dayGridMonth' : 'dayGridMonth'}
          headerToolbar={{
            left: isMobile ? 'prev,next' : 'prev,next today',
            center: 'title',
            right: isMobile ? 'dayGridMonth,timeGridWeek,listWeek' : 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
          }}
          events={getEvents()}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          eventContent={(arg) => {
            // Custom event content to style technician names separately
            if (isMobile) {
              return { html: `<div class="fc-event-title-mobile">${arg.event.title}</div>` };
            } else {
              const technicians = arg.event.extendedProps.technicians;
              return { 
                html: `
                  <div class="fc-event-content-custom">
                    <div class="fc-event-tech">${technicians}</div>
                    <div class="fc-event-title-custom">${arg.event.title}</div>
                  </div>
                ` 
              };
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
          dayMaxEvents={false}
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
          eventDisplay="block"
          displayEventTime={false}
          displayEventEnd={false}
          buttonText={{
            today: 'Today',
            month: 'Month',
            week: 'Week',
            day: 'Day',
            list: 'List'
          }}
        />
      </div>

      {/* Event Detail Modal */}
      {showModal && selectedEvent && ReactDOM.createPortal(
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedEvent.title}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Activity Numbers */}
              {selectedEvent.activityNumbers && selectedEvent.activityNumbers.length > 0 && (
                <div className="detail-section">
                  <label className="detail-label">Activity Numbers:</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {selectedEvent.activityNumbers.map((actNum, idx) => (
                      <span key={idx} className="activity-badge" style={{ 
                        backgroundColor: '#0066cc',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '0.9rem'
                      }}>
                        {actNum}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="detail-section">
                <label className="detail-label">Start Date:</label>
                <div className="detail-value">{formatDate(selectedEvent.startDate)}</div>
              </div>

              {selectedEvent.endDate && (
                <div className="detail-section">
                  <label className="detail-label">End Date:</label>
                  <div className="detail-value">{formatDate(selectedEvent.endDate)}</div>
                </div>
              )}

              {/* Assigned Technicians */}
              <div className="detail-section">
                <label className="detail-label">Assigned To:</label>
                <div className="detail-value">
                  {Array.isArray(selectedEvent.assignedTo)
                    ? selectedEvent.assignedTo.length > 0
                      ? selectedEvent.assignedTo.map(tech => tech.fullName || `${tech.firstName} ${tech.lastName}`).join(', ')
                      : 'Unassigned'
                    : selectedEvent.assignedTo
                      ? selectedEvent.assignedTo.fullName || `${selectedEvent.assignedTo.firstName} ${selectedEvent.assignedTo.lastName}`
                      : 'Unassigned'}
                </div>
              </div>

              {/* Description */}
              {selectedEvent.description && (
                <div className="detail-section">
                  <label className="detail-label">Description:</label>
                  <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedEvent.description}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Calendar;
