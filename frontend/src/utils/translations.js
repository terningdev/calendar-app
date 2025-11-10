import React, { createContext, useContext, useState, useEffect } from 'react';

// Translation utility for the Calendar application
export const translations = {
  en: {
    // Navigation
    appName: 'Onitio - Planlegger App',
    dashboard: 'Dashboard',
    calendar: 'Calendar',
    tickets: 'Tickets',
    absenceVakt: 'Absence & On call',
    administrator: 'Admin',
    skills: 'Skills',
    
    // Common words
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    close: 'Close',
    create: 'Create',
    update: 'Update',
    add: 'Add',
    remove: 'Remove',
    search: 'Search',
    filter: 'Filter',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
    
    // Form fields
    name: 'Name',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    description: 'Description',
    title: 'Title',
    department: 'Department',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    actions: 'Actions',
    technician: 'Technician',
    
    // Dashboard stats
    totalTickets: 'Total Tickets',
    openTickets: 'Open Tickets',
    inProgressTickets: 'In Progress Tickets',
    totalTechnicians: 'Total Technicians',
    totalDepartments: 'Total Departments',
    recentTickets: 'Recent Tickets',
    
    // Table headers and content
    technicianName: 'Technician Name',
    departmentName: 'Department Name',
    createdAt: 'Created At',
    updatedAt: 'Updated At',
    
    // Calendar specific
    today: 'Today',
    month: 'Month',
    week: 'Week',
    threeDays: '3 Days',
    threeDayList: '3 Day List',
    day: 'Day',
    events: 'Events',
    
    // Weekdays (full names)
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
    
    // Months
    january: 'January',
    february: 'February',
    march: 'March',
    april: 'April',
    may: 'May',
    june: 'June',
    july: 'July',
    august: 'August',
    september: 'September',
    october: 'October',
    november: 'November',
    december: 'December',
    
    // Tickets
    ticketNumber: 'Ticket Number',
    assignedTo: 'Assigned To',
    createdBy: 'Created By',
    createdOn: 'Created on',
    startDate: 'Start Date',
    endDate: 'End Date',
    editTicket: 'Edit Ticket',
    createTicket: 'Create Ticket',
    unassigned: 'Unassigned',
    titleActivityNumber: 'Title - Activity Number',
    allTechnicians: 'All Technicians',
    allDepartments: 'All Departments',
    filterByTechnician: 'Filter by Technician',
    selected: 'selected',
    
    // Departments
    addDepartment: 'Add Department',
    departments: 'Departments',
    departmentsAndTechnicians: 'Departments & Technicians',
    
    // Technicians
    addTechnician: 'Add Technician',
    technicians: 'Technicians',
    
    // Absences
    absences: 'Absences',
    vakt: 'Vakt',
    absence: 'Absence',
    createAbsence: 'Create Absence',
    createVakt: 'Create Vakt',
    createAbsenceOrVakt: 'Create Absence or Vakt',
    type: 'Type',
    duration: 'Duration',
    days: 'days',
    
    // Settings
    settings: 'Settings',
    console: 'Console',
    theme: 'Theme',
    language: 'Language',
    light: 'Light',
    dark: 'Dark',
    english: 'English',
    norwegian: 'Norwegian',
    
    // Messages
    confirmDelete: 'Are you sure you want to delete this item?',
    saveSuccess: 'Saved successfully',
    deleteSuccess: 'Deleted successfully',
    updateSuccess: 'Updated successfully',
    createSuccess: 'Created successfully',
    errorLoading: 'Error loading data',
    errorSaving: 'Error saving data',
    errorDeleting: 'Error deleting data'
  },
  
  no: {
    // Navigation
    appName: 'Onitio - Planlegger App',
    dashboard: 'Dashbord',
    calendar: 'Kalender',
    tickets: 'Aktiviteter',
    absenceVakt: 'Fravær / Vakt',
    administrator: 'Avdelinger og Teknikere',
    skills: 'Ferdigheter',
    
    // Common words
    save: 'Lagre',
    cancel: 'Avbryt',
    edit: 'Rediger',
    delete: 'Slett',
    close: 'Lukk',
    create: 'Opprett',
    update: 'Oppdater',
    add: 'Legg til',
    remove: 'Fjern',
    search: 'Søk',
    filter: 'Filter',
    loading: 'Laster...',
    error: 'Feil',
    success: 'Suksess',
    confirm: 'Bekreft',
    yes: 'Ja',
    no: 'Nei',
    
    // Form fields
    name: 'Navn',
    firstName: 'Fornavn',
    lastName: 'Etternavn',
    email: 'E-post',
    phone: 'Telefon',
    description: 'Beskrivelse',
    title: 'Tittel',
    department: 'Avdeling',
    status: 'Status',
    active: 'Aktiv',
    inactive: 'Inaktiv',
    actions: 'Handlinger',
    technician: 'Tekniker',
    
    // Dashboard stats
    totalTickets: 'Totale Aktiviteter',
    openTickets: 'Åpne Aktiviteter',
    inProgressTickets: 'Pågående Aktiviteter',
    totalTechnicians: 'Totale Teknikere',
    totalDepartments: 'Totale Avdelinger',
    recentTickets: 'Nylige Aktiviteter',
    
    // Table headers and content
    technicianName: 'Tekniker Navn',
    departmentName: 'Avdelingsnavn',
    createdAt: 'Opprettet',
    updatedAt: 'Oppdatert',
    
    // Calendar specific
    today: 'I dag',
    month: 'Måned',
    week: 'Uke',
    threeDays: '3 Dager',
    threeDayList: '3 Dager Liste',
    day: 'Dag',
    events: 'Hendelser',
    
    // Weekdays (full names)
    monday: 'Mandag',
    tuesday: 'Tirsdag',
    wednesday: 'Onsdag',
    thursday: 'Torsdag',
    friday: 'Fredag',
    saturday: 'Lørdag',
    sunday: 'Søndag',
    
    // Months
    january: 'Januar',
    february: 'Februar',
    march: 'Mars',
    april: 'April',
    may: 'Mai',
    june: 'Juni',
    july: 'Juli',
    august: 'August',
    september: 'September',
    october: 'Oktober',
    november: 'November',
    december: 'Desember',
    
    // Tickets
    ticketNumber: 'Billettnummer',
    assignedTo: 'Tildelt til',
    createdBy: 'Opprettet av',
    createdOn: 'Opprettet den',
    startDate: 'Startdato',
    endDate: 'Sluttdato',
    editTicket: 'Rediger Aktivitet',
    createTicket: 'Opprett Aktivitet',
    unassigned: 'Ikke tildelt',
    titleActivityNumber: 'Tittel - Aktivitetsnummer',
    allTechnicians: 'Alle Teknikere',
    allDepartments: 'Alle Avdelinger',
    filterByTechnician: 'Filtrer etter Tekniker',
    selected: 'valgt',
    
    // Departments
    addDepartment: 'Legg til Avdeling',
    departments: 'Avdelinger',
    departmentsAndTechnicians: 'Avdelinger og Teknikere',
    
    // Technicians
    addTechnician: 'Legg til Tekniker',
    technicians: 'Teknikere',
    
    // Absences
    absences: 'Fravær',
    vakt: 'Vakt',
    absence: 'Fravær',
    createAbsence: 'Opprett Fravær',
    createVakt: 'Opprett Vakt',
    createAbsenceOrVakt: 'Opprett Fravær eller Vakt',
    type: 'Type',
    duration: 'Varighet',
    days: 'dager',
    
    // Settings
    settings: 'Innstillinger',
    console: 'Konsoll',
    theme: 'Tema',
    language: 'Språk',
    light: 'Lys',
    dark: 'Mørk',
    english: 'Engelsk',
    norwegian: 'Norsk',
    
    // Messages
    confirmDelete: 'Er du sikker på at du vil slette dette elementet?',
    saveSuccess: 'Lagret vellykket',
    deleteSuccess: 'Slettet vellykket',
    updateSuccess: 'Oppdatert vellykket',
    createSuccess: 'Opprettet vellykket',
    errorLoading: 'Feil ved lasting av data',
    errorSaving: 'Feil ved lagring av data',
    errorDeleting: 'Feil ved sletting av data'
  }
};

// Create language context
const LanguageContext = createContext();

// Language provider component
export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
  
  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };
  
  const t = (key) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };
  
  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Hook to use translation
export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};