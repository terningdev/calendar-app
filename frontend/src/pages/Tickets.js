import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'react-toastify';
import { ticketService } from '../services/ticketService';
import { technicianService } from '../services/technicianService';
import { departmentService } from '../services/departmentService';
import { useTranslation } from '../utils/translations';

const Tickets = () => {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [showOldActivitiesModal, setShowOldActivitiesModal] = useState(false);
  const [showDepartmentSelector, setShowDepartmentSelector] = useState(false);
  const [showTechnicianSelector, setShowTechnicianSelector] = useState(false);
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const [showFilterDepartmentSelector, setShowFilterDepartmentSelector] = useState(false);
  const [showFilterTechnicianSelector, setShowFilterTechnicianSelector] = useState(false);
  const [selectedOldTickets, setSelectedOldTickets] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignedTo: [],
    department: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    ticketNumber: '',
    title: '',
    description: '',
    assignedTo: [],
    department: [],
    createdBy: 'System User',
    startDate: '',
    endDate: ''
  });

  // Function to extract activity number from ticket
  const extractActivityNumber = (ticket) => {
    // Only try to extract activity number if ticketNumber is different from title
    if (ticket.ticketNumber && ticket.ticketNumber !== ticket.title) {
      // Check if ticketNumber starts with the title followed by " - "
      const titlePrefix = ticket.title + ' - ';
      if (ticket.ticketNumber.startsWith(titlePrefix)) {
        // Extract everything after "title - " as the activity number
        return ticket.ticketNumber.substring(titlePrefix.length);
      }
    }
    return null;
  };

  const loadTickets = useCallback(async () => {
    try {
      const ticketsData = await ticketService.getAll(filters);
      // Add activityNumber field to each ticket by extracting from ticketNumber
      const ticketsWithActivityNumber = ticketsData.map(ticket => ({
        ...ticket,
        activityNumber: extractActivityNumber(ticket)
      }));
      setTickets(ticketsWithActivityNumber);
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ticketsData, techniciansData, departmentsData] = await Promise.allSettled([
        ticketService.getAll(),
        technicianService.getAll(),
        departmentService.getAll()
      ]);
      
      // Handle resolved/rejected promises safely
      const tickets = ticketsData.status === 'fulfilled' ? ticketsData.value : [];
      const technicians = techniciansData.status === 'fulfilled' ? techniciansData.value : [];
      const departments = departmentsData.status === 'fulfilled' ? departmentsData.value : [];
      
      setTickets(tickets);
      setTechnicians(technicians.filter(t => t.isActive));
      setDepartments(departments.filter(d => d.isActive));
      
      // Set default department to Trondheim if it exists
      const trondheimDept = departments.find(d => d.name === 'Trondheim' && d.isActive);
      if (trondheimDept) {
        setFilters(prev => ({ ...prev, department: [trondheimDept._id] }));
      }
    } catch (error) {
      toast.error('Error loading data');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validate form data
      if (!formData.title) {
        toast.error('Title is required');
        return;
      }
      
      if (!formData.startDate) {
        toast.error('Start date is required');
        return;
      }
      
      // Validate date order if both dates provided
      if (formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
        toast.error('End date must be after start date');
        return;
      }
      
      // Clean up form data - remove empty fields that should be optional
      const cleanData = { ...formData };
      
      // Auto-generate ticket number from title and optional activity number
      if (cleanData.title) {
        if (cleanData.activityNumber && cleanData.activityNumber.trim() !== '') {
          cleanData.ticketNumber = `${cleanData.title} - ${cleanData.activityNumber}`;
        } else {
          cleanData.ticketNumber = cleanData.title;
        }
      }
      
      // Remove temporary activityNumber field
      delete cleanData.activityNumber;
      
      // Remove assignedTo if empty array
      if (!cleanData.assignedTo || cleanData.assignedTo.length === 0) {
        delete cleanData.assignedTo;
      }
      
      // Ensure description is always a string (empty string if no content)
      cleanData.description = cleanData.description || '';
      
      // Remove endDate if empty
      if (!cleanData.endDate || cleanData.endDate === '') {
        delete cleanData.endDate;
      }
      
      if (editingTicket) {
        await ticketService.update(editingTicket._id, cleanData);
        toast.success('Ticket updated successfully');
      } else {
        await ticketService.create(cleanData);
        toast.success('Ticket created successfully');
      }
      
      closeModal();
      loadTickets();
    } catch (error) {
      console.error('Error saving ticket:', error);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        const errorMsg = error.response.data?.message || 'Invalid input data';
        toast.error(errorMsg);
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error('Failed to save ticket. Please check your internet connection.');
      }
    }
  };

  const handleEdit = (ticket) => {
    setEditingTicket(ticket);
    
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
    
    // Extract departments from assigned technicians
    let selectedDepartments = [];
    if (ticket.assignedTo && ticket.assignedTo.length > 0) {
      const assignedTechnicians = Array.isArray(ticket.assignedTo) ? ticket.assignedTo : [ticket.assignedTo];
      const departmentIds = assignedTechnicians
        .filter(tech => tech && tech.department)
        .map(tech => tech.department._id);
      selectedDepartments = [...new Set(departmentIds)]; // Remove duplicates
    }
    
    // If no departments from technicians, default to Trondheim
    if (selectedDepartments.length === 0) {
      const trondheimDept = departments.find(dept => dept.name === 'Trondheim');
      if (trondheimDept) {
        selectedDepartments = [trondheimDept._id];
      }
    }
    
    setFormData({
      title: title,
      activityNumber: activityNumber,
      description: ticket.description,
      assignedTo: Array.isArray(ticket.assignedTo) 
        ? ticket.assignedTo.map(tech => tech._id) 
        : ticket.assignedTo 
        ? [ticket.assignedTo._id] 
        : [],
      department: selectedDepartments,
      createdBy: ticket.createdBy,
      startDate: new Date(ticket.startDate).toISOString().slice(0, 10),
      endDate: ticket.endDate ? new Date(ticket.endDate).toISOString().slice(0, 10) : ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this ticket?')) {
      try {
        await ticketService.delete(id);
        toast.success('Ticket deleted successfully');
        loadTickets();
      } catch (error) {
        toast.error('Error deleting ticket');
      }
    }
  };

  const handleDeleteFromModal = async (id) => {
    if (window.confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      try {
        await ticketService.delete(id);
        toast.success('Ticket deleted successfully');
        setEditingTicket(null);
        setShowModal(false);
        loadTickets();
      } catch (error) {
        toast.error('Error deleting ticket');
      }
    }
  };

  const openCreateModal = () => {
    setEditingTicket(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Default to Trondheim department
    const trondheimDept = departments.find(dept => dept.name === 'Trondheim');
    const defaultDepartments = trondheimDept ? [trondheimDept._id] : [];
    
    setFormData({
      title: '',
      activityNumber: '',
      description: '',
      assignedTo: [],
      department: defaultDepartments,
      createdBy: 'System User',
      startDate: tomorrow.toISOString().slice(0, 10),
      endDate: ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTicket(null);
  };

  // Get technicians filtered by selected department
  const getFilteredTechnicians = () => {
    let filteredTechnicians;
    if (!filters.department || filters.department.length === 0) {
      filteredTechnicians = technicians;
    } else {
      filteredTechnicians = technicians.filter(tech => 
        tech.department && filters.department.includes(tech.department._id)
      );
    }
    
    // Sort technicians alphabetically by first name
    return filteredTechnicians.sort((a, b) => 
      a.firstName.localeCompare(b.firstName)
    );
  };

  // Get technicians filtered by form's selected departments (for editing)
  const getFormFilteredTechnicians = () => {
    let filteredTechnicians;
    if (!formData.department || formData.department.length === 0) {
      filteredTechnicians = technicians;
    } else {
      filteredTechnicians = technicians.filter(tech => 
        tech.department && formData.department.includes(tech.department._id)
      );
    }
    
    // Sort technicians alphabetically by first name
    return filteredTechnicians.sort((a, b) => 
      a.firstName.localeCompare(b.firstName)
    );
  };

  // Handle department change and reset technician filter (for legacy support)
  const handleDepartmentChange = (departmentId) => {
    if (departmentId === '') {
      setFilters(prev => ({ 
        ...prev, 
        department: [],
        assignedTo: [] // Reset technician filter when department changes
      }));
    } else {
      setFilters(prev => ({ 
        ...prev, 
        department: [departmentId],
        assignedTo: [] // Reset technician filter when department changes
      }));
    }
  };

  // Handle filter department multi-selection
  const handleFilterDepartmentChange = (departmentId) => {
    setFilters(prev => {
      const currentDepartments = prev.department || [];
      let newDepartments;
      
      if (currentDepartments.includes(departmentId)) {
        newDepartments = currentDepartments.filter(id => id !== departmentId);
      } else {
        newDepartments = [...currentDepartments, departmentId];
      }
      
      return { ...prev, department: newDepartments };
    });
  };

  // Handle filter technician multi-selection
  const handleFilterTechnicianChange = (technicianId) => {
    setFilters(prev => {
      const currentTechnicians = prev.assignedTo || [];
      let newTechnicians;
      
      if (currentTechnicians.includes(technicianId)) {
        newTechnicians = currentTechnicians.filter(id => id !== technicianId);
      } else {
        newTechnicians = [...currentTechnicians, technicianId];
      }
      
      return { ...prev, assignedTo: newTechnicians };
    });
  };

  // Handle form department change and reset selected technicians
  const handleFormDepartmentChange = (departmentId) => {
    const currentDepartments = formData.department || [];
    let newDepartments;
    
    if (currentDepartments.includes(departmentId)) {
      // Remove department if already selected
      newDepartments = currentDepartments.filter(id => id !== departmentId);
    } else {
      // Add department if not selected
      newDepartments = [...currentDepartments, departmentId];
    }
    
    // Filter out technicians that are not in the newly selected departments
    const validTechnicians = technicians.filter(tech => 
      tech.department && newDepartments.includes(tech.department._id)
    );
    const validTechnicianIds = validTechnicians.map(tech => tech._id);
    const filteredAssignedTo = formData.assignedTo.filter(techId => 
      validTechnicianIds.includes(techId)
    );
    
    setFormData(prev => ({
      ...prev,
      department: newDepartments,
      assignedTo: filteredAssignedTo
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateHeader = (dateString) => {
    const date = new Date(dateString);
    const options = { 
      weekday: 'long', 
      day: '2-digit', 
      month: '2-digit' 
    };
    return date.toLocaleDateString('en-GB', options);
  };

  // Function to check if ticket is assigned
  const isTicketAssigned = (ticket) => {
    if (!ticket.assignedTo) return false;
    if (Array.isArray(ticket.assignedTo)) {
      return ticket.assignedTo.length > 0;
    }
    return true;
  };

  // Function to get ticket background color based on assignment status
  const getTicketBackgroundColor = (ticket) => {
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    
    let assignedColor, unassignedColor;
    
    if (isDarkMode) {
      // Use brighter colors for dark mode for better visibility
      assignedColor = localStorage.getItem('color-assigned-tickets') || '#4ade80'; // Brighter green
      unassignedColor = localStorage.getItem('color-unassigned-tickets') || '#f87171'; // Brighter red
    } else {
      // Use original colors for light mode
      assignedColor = localStorage.getItem('color-assigned-tickets') || '#27ae60';
      unassignedColor = localStorage.getItem('color-unassigned-tickets') || '#e74c3c';
    }
    
    return isTicketAssigned(ticket) ? assignedColor : unassignedColor;
  };

  // Function to get ticket border color (lighter version of background)
  const getTicketBorderColor = (ticket) => {
    const backgroundColor = getTicketBackgroundColor(ticket);
    // Make border color slightly lighter by adding opacity
    return backgroundColor + '40'; // Add alpha channel for lighter border
  };

  // Function to detect if device is mobile
  const isMobileDevice = () => {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Function to generate clickable URL for activity number
  const generateActivityURL = (activityNumber) => {
    if (!activityNumber) return null;
    
    if (isMobileDevice()) {
      return `https://arnika.onitio.com?id=${encodeURIComponent(activityNumber)}&db=sesam10`;
    } else {
      return `http://sunflower/SunflowerWeb/ActivityDetail.aspx?ActivityId=${encodeURIComponent(activityNumber)}`;
    }
  };

  // Function to render activity button (Arnika/Sunflower)
  const renderActivityButton = (ticket, isMobile = false) => {
    const activityNumber = extractActivityNumber(ticket);
    const url = generateActivityURL(activityNumber);
    
    if (!url) return null;
    
    const buttonText = isMobileDevice() ? 'Arnika' : 'Sunflower';
    
    const mobileStyle = isMobile ? { 
      padding: '6px 12px', 
      fontSize: '0.75rem' 
    } : {};
    
    return (
      <button 
        className="btn btn-small btn-primary"
        onClick={(e) => {
          e.stopPropagation();
          window.open(url, '_blank', 'noopener,noreferrer');
        }}
        style={mobileStyle}
        title={`Open in ${buttonText}`}
      >
        {buttonText}
      </button>
    );
  };

  // Function to get all dates a ticket spans
  const getTicketDates = (ticket) => {
    const startDate = new Date(ticket.startDate);
    const endDate = ticket.endDate ? new Date(ticket.endDate) : startDate;
    const dates = [];
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate).toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  // Function to group tickets by date (agenda view)
  const getTicketsGroupedByDate = () => {
    const filtered = getFilteredTickets();
    const groupedByDate = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    // For each ticket, add it to all dates it spans
    filtered.forEach(ticket => {
      const ticketDates = getTicketDates(ticket);
      ticketDates.forEach(date => {
        // Only include dates that are today or in the future
        const dateObj = new Date(date);
        if (dateObj >= today) {
          if (!groupedByDate[date]) {
            groupedByDate[date] = [];
          }
          groupedByDate[date].push(ticket);
        }
      });
    });
    
    // Sort dates and return as array of {date, tickets}
    return Object.keys(groupedByDate)
      .sort()
      .map(date => ({
        date,
        tickets: groupedByDate[date]
      }));
  };

  const getFilteredTickets = () => {
    let filtered = tickets;
    
    // Note: Date filtering is now handled in getTicketsGroupedByDate() to filter individual dates, not entire tickets
    
    // Filter by search term
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(ticket => {
        // Search in title (from ticketNumber)
        const titleMatch = ticket.ticketNumber?.toLowerCase().includes(term);
        
        // Search in description
        const descriptionMatch = ticket.description?.toLowerCase().includes(term);
        
        // Search in assigned technician names
        const technicianMatch = Array.isArray(ticket.assignedTo) 
          ? ticket.assignedTo.some(tech => tech?.fullName?.toLowerCase().includes(term))
          : ticket.assignedTo?.fullName?.toLowerCase().includes(term);
        
        // Search in dates (formatted)
        const startDateMatch = formatDate(ticket.startDate)?.toLowerCase().includes(term);
        const endDateMatch = ticket.endDate ? formatDate(ticket.endDate)?.toLowerCase().includes(term) : false;
        
        return titleMatch || descriptionMatch || technicianMatch || startDateMatch || endDateMatch;
      });
    }
    
    // Filter by department
    if (filters.department && filters.department.length > 0) {
      filtered = filtered.filter(ticket => {
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
      filtered = filtered.filter(ticket => {
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
          } else {
            return ticket.assignedTo && technicianIds.includes(ticket.assignedTo._id);
          }
        }
        
        return false;
      });
    }
    
    // Sort by start date
    return filtered.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  };

  const getOldTickets = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return tickets.filter(ticket => {
      const endDate = ticket.endDate ? new Date(ticket.endDate) : null;
      const startDate = new Date(ticket.startDate);
      const compareDate = endDate || startDate;
      return compareDate < today;
    }).sort((a, b) => new Date(b.startDate) - new Date(a.startDate)); // Most recent first
  };

  const handleSelectOldTicket = (ticketId) => {
    setSelectedOldTickets(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleSelectAllOldTickets = () => {
    const oldTickets = getOldTickets();
    if (selectedOldTickets.length === oldTickets.length) {
      setSelectedOldTickets([]);
    } else {
      setSelectedOldTickets(oldTickets.map(ticket => ticket._id));
    }
  };

  const handleDeleteSelectedOldTickets = async () => {
    if (selectedOldTickets.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedOldTickets.length} old ticket(s)?`)) {
      try {
        await Promise.all(selectedOldTickets.map(id => ticketService.delete(id)));
        toast.success(`Successfully deleted ${selectedOldTickets.length} old ticket(s)`);
        setSelectedOldTickets([]);
        loadTickets();
      } catch (error) {
        console.error('Error deleting tickets:', error);
        toast.error('Error deleting tickets');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading tickets...</div>;
  }

  const filteredTickets = getFilteredTickets();

  return (
    <div>
      {/* Desktop Header */}
      <div className="page-header desktop-only">
        <h1 className="page-title">{t('tickets')}</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={openCreateModal}>
            {t('createTicket')}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              console.log('Opening Old Activities Modal');
              setShowOldActivitiesModal(true);
              console.log('showOldActivitiesModal should now be true');
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            📅 Old Activities ({getOldTickets().length})
          </button>
        </div>
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
              value={filters.assignedTo}
              onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })}
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
      <div className="mobile-only" style={{ marginBottom: '12px' }}>
        <div className="mobile-tickets-toolbar">
          <button 
            className="mobile-toolbar-btn mobile-search-btn"
            onClick={() => setShowSearchPopup(true)}
          >
            <span className="btn-icon">🔍</span>
            <span className="btn-text">Search</span>
          </button>
          
          <button
            className="mobile-filter-selector"
            onClick={() => setShowFilterDepartmentSelector(true)}
          >
            <span className="mobile-selector-text">
              {filters.department.length === 0 
                ? "📋 None selected" 
                : filters.department.length === 1
                  ? `📋 ${departments.find(d => d._id === filters.department[0])?.name || 'Department'}`
                  : `📋 ${filters.department.length} selected`
              }
            </span>
            <span className="mobile-selector-arrow">▶</span>
          </button>
          
          <button
            className="mobile-filter-selector"
            onClick={() => setShowFilterTechnicianSelector(true)}
          >
            <span className="mobile-selector-text">
              {filters.assignedTo.length === 0 
                ? "👥 None selected"
                : filters.assignedTo.length === 1
                  ? filters.assignedTo[0] === 'unassigned'
                    ? "👥 Unassigned"
                    : `👥 ${technicians.find(t => t._id === filters.assignedTo[0])?.fullName || 'Technician'}`
                  : `👥 ${filters.assignedTo.length} selected`
              }
            </span>
            <span className="mobile-selector-arrow">▶</span>
          </button>
          
          <button 
            className="mobile-toolbar-btn mobile-create-btn"
            onClick={openCreateModal}
          >
            <span className="btn-icon">+</span>
            <span className="btn-text">Create</span>
          </button>
        </div>
      </div>

      {filteredTickets.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No tickets found</h3>
            <p>Create your first ticket to get started</p>
            <button className="btn btn-primary" onClick={openCreateModal}>
              Create Ticket
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Agenda View */}
          <div className="desktop-only">
            {getTicketsGroupedByDate().map(({ date, tickets }) => (
              <div key={date} className="card" style={{ marginBottom: '12px' }}>
                {/* Date Header */}
                <div className="agenda-date-header">
                  {formatDateHeader(date)} - {tickets.length} ticket(s)
                </div>
                
                {/* Tickets for this date */}
                <div style={{ padding: '0' }}>
                  {tickets.map((ticket, index) => (
                    <div 
                      key={`${ticket._id}-${date}`} 
                      className="agenda-ticket-row"
                      style={{ 
                        borderBottom: index < tickets.length - 1 ? undefined : 'none',
                        borderLeft: `4px solid ${getTicketBackgroundColor(ticket)}`,
                        paddingLeft: '12px'
                      }}
                    >
                      <div>
                        <div className="agenda-ticket-title">
                          {ticket.title}
                        </div>
                        {ticket.description && (
                          <div className="agenda-ticket-description">
                            {ticket.description}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <div className="agenda-activity-number">
                          {ticket.activityNumber || '-'}
                        </div>
                      </div>
                      
                      <div>
                        {Array.isArray(ticket.assignedTo) ? (
                          ticket.assignedTo.length > 0 ? (
                            <div>
                              {ticket.assignedTo.map((tech) => (
                                <div key={tech._id} style={{ fontSize: '0.9rem', marginBottom: '2px' }}>
                                  {tech.fullName}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="agenda-unassigned">Unassigned</span>
                          )
                        ) : ticket.assignedTo ? (
                          ticket.assignedTo.fullName
                        ) : (
                          <span className="agenda-unassigned">Unassigned</span>
                        )}
                      </div>
                      
                      <div className="agenda-date-info">
                        {formatDate(ticket.startDate)}
                      </div>
                      
                      <div className="agenda-date-info">
                        {ticket.endDate ? formatDate(ticket.endDate) : (
                          <span className="agenda-date-not-set">Not set</span>
                        )}
                      </div>
                      
                      <div className="agenda-buttons">
                        <button 
                          className="btn btn-small btn-secondary"
                          onClick={() => handleEdit(ticket)}
                        >
                          {t('edit')}
                        </button>
                        {renderActivityButton(ticket) && (
                          renderActivityButton(ticket)
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Agenda View */}
          <div className="mobile-only">
            {getTicketsGroupedByDate().map(({ date, tickets }) => (
              <div key={date} style={{ marginBottom: '12px' }}>
                {/* Mobile Date Header */}
                <div className="mobile-agenda-date-header">
                  {formatDateHeader(date)} - {tickets.length} ticket(s)
                </div>
                
                {/* Mobile Tickets for this date */}
                {tickets.map((ticket, index) => (
                  <div 
                    key={`${ticket._id}-${date}`} 
                    className={`card mobile-ticket-card mobile-agenda-ticket ${
                      index === 0 ? 'first-ticket' : ''
                    } ${index === tickets.length - 1 ? 'last-ticket' : ''}`}
                    style={{ 
                      marginBottom: index < tickets.length - 1 ? '0' : '0', 
                      borderRadius: index === 0 ? '0 0 8px 8px' : index === tickets.length - 1 ? '0 0 8px 8px' : '0',
                      marginTop: '0',
                      borderLeft: `4px solid ${getTicketBackgroundColor(ticket)}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      padding: '12px'
                    }}
                  >
                    <div style={{ flex: '1', paddingRight: '12px' }}>
                      <div className="mobile-agenda-ticket-title">
                        {ticket.title}
                      </div>
                      <div className="mobile-agenda-ticket-description">
                        {ticket.activityNumber ? ticket.activityNumber : '-'}
                        {ticket.description && ` - ${ticket.description}`}
                      </div>
                      <div className="mobile-agenda-field">
                        {formatDate(ticket.startDate)}
                        {ticket.endDate && ticket.endDate !== ticket.startDate && ` - ${formatDate(ticket.endDate)}`}
                        {' - '}
                        {Array.isArray(ticket.assignedTo) ? (
                          ticket.assignedTo.length > 0 ? (
                            ticket.assignedTo.map(tech => tech.fullName).join(', ')
                          ) : (
                            t('unassigned')
                          )
                        ) : ticket.assignedTo ? (
                          ticket.assignedTo.fullName
                        ) : (
                          t('unassigned')
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '4px', flexShrink: 0 }}>
                      {renderActivityButton(ticket, true) && (
                        renderActivityButton(ticket, true)
                      )}
                      <button 
                        className="btn btn-small btn-secondary"
                        onClick={() => handleEdit(ticket)}
                        style={{ padding: '6px 12px', fontSize: '0.75rem', minWidth: '60px' }}
                      >
                        {t('edit')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal">
          <div className="modal-content ticket-modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingTicket ? 'Edit Ticket' : 'Create Ticket'}
              </h2>
              <button className="modal-close" onClick={closeModal}>
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
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional: Enter ticket description..."
                  />
                </div>
              </div>
              
              {/* Department (100%) */}
              <div className="form-row-100">
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select
                    multiple
                    className="form-control form-select-modern"
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
                    style={{
                      minHeight: '100px',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      backgroundColor: '#f8f9fa'
                    }}
                  >
                    {departments.map(dept => (
                      <option 
                        key={dept._id} 
                        value={dept._id}
                        style={{
                          padding: '6px 10px',
                          cursor: 'pointer',
                          backgroundColor: formData.department.includes(dept._id) ? '#e7f3ff' : 'white',
                          color: formData.department.includes(dept._id) ? '#004085' : '#333'
                        }}
                      >
                        📋 {dept.name}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                    Hold Ctrl (Windows) or Cmd (Mac) to select multiple departments
                  </small>
                </div>
              </div>
              
              {/* Technician (100%) */}
              <div className="form-row-100">
                <div className="form-group">
                  <label className="form-label">Assigned To</label>
                  <select
                    multiple
                    className="form-control form-select-modern"
                    value={formData.assignedTo}
                    onChange={(e) => {
                      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                      setFormData({
                        ...formData,
                        assignedTo: selectedOptions
                      });
                    }}
                    disabled={formData.department.length === 0}
                    size="5"
                    style={{
                      minHeight: '120px',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      backgroundColor: formData.department.length === 0 ? '#f0f0f0' : '#f8f9fa',
                      cursor: formData.department.length === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {formData.department.length === 0 ? (
                      <option disabled style={{ color: '#999', fontStyle: 'italic' }}>
                        Please select departments first
                      </option>
                    ) : getFormFilteredTechnicians().length === 0 ? (
                      <option disabled style={{ color: '#999', fontStyle: 'italic' }}>
                        No technicians available in selected departments
                      </option>
                    ) : (
                      getFormFilteredTechnicians().map(tech => (
                        <option 
                          key={tech._id} 
                          value={tech._id}
                          style={{
                            padding: '6px 10px',
                            cursor: 'pointer',
                            backgroundColor: formData.assignedTo.includes(tech._id) ? '#e7f3ff' : 'white',
                            color: formData.assignedTo.includes(tech._id) ? '#004085' : '#333'
                          }}
                        >
                          👤 {tech.fullName} {tech.department && `(${tech.department.name})`}
                        </option>
                      ))
                    )}
                  </select>
                  <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                    Hold Ctrl (Windows) or Cmd (Mac) to select multiple technicians
                  </small>
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
              
              {/* Created By / Updated By Info (read-only) */}
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '6px',
                marginTop: '15px',
                fontSize: '0.85rem',
                color: '#666'
              }}>
                <div style={{ marginBottom: '6px' }}>
                  <strong>Created by:</strong> {editingTicket ? (editingTicket.createdBy || 'Unknown') : (formData.createdBy || 'Current user')}
                  {editingTicket && editingTicket.createdAt && ` • ${new Date(editingTicket.createdAt).toLocaleString('nb-NO', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}`}
                </div>
                {editingTicket && editingTicket.updatedAt && editingTicket.updatedAt !== editingTicket.createdAt && (
                  <div>
                    <strong>Updated by:</strong> {editingTicket.createdBy || 'Unknown'} 
                    {` • ${new Date(editingTicket.updatedAt).toLocaleString('nb-NO', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}`}
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <div>
                    {editingTicket && (
                      <button 
                        type="button" 
                        className="btn btn-danger"
                        onClick={() => handleDeleteFromModal(editingTicket._id)}
                      >
                        {t('delete')}
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn btn-secondary" onClick={closeModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingTicket ? 'Update' : 'Create'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Old Activities Window Modal */}
      {console.log('Tickets page - showOldActivitiesModal:', showOldActivitiesModal)}
      {showOldActivitiesModal && console.log('ABOUT TO RENDER OLD ACTIVITIES MODAL')}
      {showOldActivitiesModal && ReactDOM.createPortal(
        <>
          <div 
            className="window-modal-backdrop" 
            onClick={() => setShowOldActivitiesModal(false)}
          ></div>
          <div className="window-modal" id="old-activities-modal-test">
            <div className="window-modal-header">
              <h2 className="window-modal-title">
                Old Activities ({getOldTickets().length})
              </h2>
              <button 
                className="window-modal-close" 
                onClick={() => setShowOldActivitiesModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="window-modal-body">
              {getOldTickets().length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  <p>No old activities found</p>
                </div>
              ) : (
                <>
                  {/* Header with select all and delete buttons */}
                  <div className="old-activities-header">
                    <label className="old-activities-select-all">
                      <input
                        type="checkbox"
                        checked={selectedOldTickets.length === getOldTickets().length && getOldTickets().length > 0}
                        onChange={handleSelectAllOldTickets}
                      />
                      <span>Select All ({selectedOldTickets.length} selected)</span>
                    </label>
                    
                    <button 
                      className="btn btn-danger old-activities-delete-btn"
                      onClick={handleDeleteSelectedOldTickets}
                      disabled={selectedOldTickets.length === 0}
                    >
                      Delete Selected ({selectedOldTickets.length})
                    </button>
                  </div>

                  {/* Old tickets list */}
                  <div className="old-activities-list">
                    {getOldTickets().map((ticket) => (
                      <div 
                        key={ticket._id} 
                        className={`old-activity-item ${
                          selectedOldTickets.includes(ticket._id) ? 'selected' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="old-activity-checkbox"
                          checked={selectedOldTickets.includes(ticket._id)}
                          onChange={() => handleSelectOldTicket(ticket._id)}
                        />
                        
                        <div className="old-activity-content">
                          <span className="old-activity-title">
                            {ticket.ticketNumber}
                          </span>
                          <span className="old-activity-separator">-</span>
                          <span className="old-activity-assignee">
                            {Array.isArray(ticket.assignedTo) ? (
                              ticket.assignedTo.length > 0 ? (
                                ticket.assignedTo.map(tech => tech.fullName).join(', ')
                              ) : (
                                'Unassigned'
                              )
                            ) : ticket.assignedTo ? (
                              ticket.assignedTo.fullName
                            ) : (
                              'Unassigned'
                            )}
                          </span>
                          <span className="old-activity-separator">-</span>
                          <span className="old-activity-dates">
                            {formatDate(ticket.startDate)}
                            {ticket.endDate && ticket.endDate !== ticket.startDate && 
                              ` - ${formatDate(ticket.endDate)}`
                            }
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            
            <div className="window-modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowOldActivitiesModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Mobile Department Selector Modal */}
      {showDepartmentSelector && ReactDOM.createPortal(
        <div className="mobile-selector-overlay" onClick={() => setShowDepartmentSelector(false)}>
          <div className="mobile-selector-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-selector-header">
              <h3>📋 Select Departments</h3>
              <button 
                className="mobile-selector-close"
                onClick={() => setShowDepartmentSelector(false)}
              >
                ✕
              </button>
            </div>
            <div className="mobile-selector-content">
              {departments.map(dept => (
                <div 
                  key={dept._id} 
                  className={`mobile-selector-item ${formData.department.includes(dept._id) ? 'selected' : ''}`}
                  onClick={() => handleFormDepartmentChange(dept._id)}
                >
                  <span className="mobile-selector-check">
                    {formData.department.includes(dept._id) ? '✓' : '○'}
                  </span>
                  <span className="mobile-selector-name">{dept.name}</span>
                </div>
              ))}
            </div>
            <div className="mobile-selector-footer">
              <button 
                className="mobile-selector-done"
                onClick={() => setShowDepartmentSelector(false)}
              >
                Done ({formData.department.length} selected)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Mobile Technician Selector Modal */}
      {showTechnicianSelector && ReactDOM.createPortal(
        <div className="mobile-selector-overlay" onClick={() => setShowTechnicianSelector(false)}>
          <div className="mobile-selector-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-selector-header">
              <h3>👥 Select Technicians</h3>
              <button 
                className="mobile-selector-close"
                onClick={() => setShowTechnicianSelector(false)}
              >
                ✕
              </button>
            </div>
            <div className="mobile-selector-content">
              {formData.department && formData.department.length > 0 ? (
                getFormFilteredTechnicians().length > 0 ? (
                  getFormFilteredTechnicians().map(tech => (
                    <div 
                      key={tech._id} 
                      className={`mobile-selector-item ${formData.assignedTo.includes(tech._id) ? 'selected' : ''}`}
                      onClick={() => {
                        if (formData.assignedTo.includes(tech._id)) {
                          setFormData({ 
                            ...formData, 
                            assignedTo: formData.assignedTo.filter(id => id !== tech._id) 
                          });
                        } else {
                          setFormData({ 
                            ...formData, 
                            assignedTo: [...formData.assignedTo, tech._id] 
                          });
                        }
                      }}
                    >
                      <span className="mobile-selector-check">
                        {formData.assignedTo.includes(tech._id) ? '✓' : '○'}
                      </span>
                      <span className="mobile-selector-name">{tech.fullName}</span>
                    </div>
                  ))
                ) : (
                  <div className="mobile-selector-empty">
                    No technicians available in selected departments
                  </div>
                )
              ) : (
                <div className="mobile-selector-empty">
                  Please select departments first
                </div>
              )}
            </div>
            <div className="mobile-selector-footer">
              <button 
                className="mobile-selector-done"
                onClick={() => setShowTechnicianSelector(false)}
              >
                Done ({formData.assignedTo.length} selected)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Mobile Search Popup */}
      {showSearchPopup && ReactDOM.createPortal(
        <div className="mobile-search-overlay" onClick={() => setShowSearchPopup(false)}>
          <div className="mobile-search-container" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              className="mobile-search-input-simple"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
        </div>,
        document.body
      )}

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
    </div>
  );
};

export default Tickets;