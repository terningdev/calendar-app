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
import FilterSidebar from '../components/FilterSidebar';

const Calendar = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const calendarRef = useRef(null);
  const mobileSearchRef = useRef(null);
  
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [departments, setDepartments] = useState([]);
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
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  // Get events for a specific date (for agenda view)
  const getEventsForDate = (date) => {
    if (!date) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    const allEvents = getEvents();
    
    return allEvents.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const targetDate = new Date(dateStr);
      
      // Check if the target date falls within the event's date range
      return targetDate >= eventStart && targetDate < eventEnd;
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

  // Handle date click (for creating new tickets - future enhancement)
  const handleDateClick = (dateClickInfo) => {
    // Could open a modal to create a new ticket
    console.log('Date clicked:', dateClickInfo.dateStr);
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
          dayCellClassNames={(arg) => {
            // Highlight today's date
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const cellDate = new Date(arg.date);
            cellDate.setHours(0, 0, 0, 0);
            return cellDate.getTime() === today.getTime() ? 'fc-day-today-custom' : '';
          }}
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
          dayMaxEvents={4}
          moreLinkClick={(info) => {
            setAgendaDate(info.date);
            setShowAgenda(true);
            return 'popover'; // This prevents the default behavior
          }}
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
                    <div className="agenda-item-tech">{event.extendedProps.technicians}</div>
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
