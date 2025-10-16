import React, { useState, useEffect } from 'react';
import { ticketService } from '../services/ticketService';
import { technicianService } from '../services/technicianService';
import { departmentService } from '../services/departmentService';
import { useTranslation } from '../utils/translations';

const Dashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalTickets: 0,
    assignedTickets: 0,
    unassignedTickets: 0,
    totalTechnicians: 0,
    totalDepartments: 0
  });
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [tickets, technicians, departments] = await Promise.all([
        ticketService.getAll(),
        technicianService.getAll(),
        departmentService.getAll()
      ]);

      // Calculate stats
      const assignedTickets = tickets.filter(t => t.assignedTo && (Array.isArray(t.assignedTo) ? t.assignedTo.length > 0 : true)).length;
      const unassignedTickets = tickets.filter(t => !t.assignedTo || (Array.isArray(t.assignedTo) && t.assignedTo.length === 0)).length;

      setStats({
        totalTickets: tickets.length,
        assignedTickets: assignedTickets,
        unassignedTickets: unassignedTickets,
        totalTechnicians: technicians.length,
        totalDepartments: departments.length
      });

      // Get recent tickets (last 5)
      const sortedTickets = tickets
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      
      setRecentTickets(sortedTickets);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="loading">
        Loading dashboard data...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('dashboard')}</h1>
      </div>

      {/* Stats Cards - Desktop View */}
      <div className="stats-cards desktop-only" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#3498db', fontSize: '2rem', margin: '0 0 10px 0' }}>
            {stats.totalTickets}
          </h3>
          <p style={{ margin: 0, color: '#666' }}>{t('totalTickets')}</p>
        </div>
        
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#27ae60', fontSize: '2rem', margin: '0 0 10px 0' }}>
            {stats.assignedTickets}
          </h3>
          <p style={{ margin: 0, color: '#666' }}>Assigned Tickets</p>
        </div>
        
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#e74c3c', fontSize: '2rem', margin: '0 0 10px 0' }}>
            {stats.unassignedTickets}
          </h3>
          <p style={{ margin: 0, color: '#666' }}>Unassigned Tickets</p>
        </div>
        
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#9b59b6', fontSize: '2rem', margin: '0 0 10px 0' }}>
            {stats.totalTechnicians}
          </h3>
          <p style={{ margin: 0, color: '#666' }}>{t('totalTechnicians')}</p>
        </div>
        
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#f39c12', fontSize: '2rem', margin: '0 0 10px 0' }}>
            {stats.totalDepartments}
          </h3>
          <p style={{ margin: 0, color: '#666' }}>{t('totalDepartments')}</p>
        </div>
      </div>

      {/* Stats Card - Mobile Compact View */}
      <div className="card mobile-only mobile-stats-card" style={{ marginBottom: '30px' }}>
        <div className="mobile-stats-compact">
          <div className="mobile-stat-row mobile-stat-single-line">
            <div className="mobile-stat-pair">
              <span className="mobile-stat-label">Total tickets</span>
              <span className="mobile-stat-value" style={{ color: '#3498db' }}>{stats.totalTickets}</span>
            </div>
            <div className="mobile-stat-pair">
              <span className="mobile-stat-label">Assigned tickets</span>
              <span className="mobile-stat-value" style={{ color: '#27ae60' }}>{stats.assignedTickets}</span>
            </div>
            <div className="mobile-stat-pair">
              <span className="mobile-stat-label">Unassigned tickets</span>
              <span className="mobile-stat-value" style={{ color: '#e74c3c' }}>{stats.unassignedTickets}</span>
            </div>
            <div className="mobile-stat-pair">
              <span className="mobile-stat-label">Total technicians</span>
              <span className="mobile-stat-value" style={{ color: '#9b59b6' }}>{stats.totalTechnicians}</span>
            </div>
            <div className="mobile-stat-pair">
              <span className="mobile-stat-label">Total departments</span>
              <span className="mobile-stat-value" style={{ color: '#f39c12' }}>{stats.totalDepartments}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{t('recentTickets')}</h2>
        </div>
        
        {recentTickets.length === 0 ? (
          <div className="empty-state">
            <h3>No tickets found</h3>
            <p>Create your first ticket to get started</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title - Activity Number</th>
                <th>Assigned To</th>
                <th>Created</th>
                <th>Start Date</th>
              </tr>
            </thead>
            <tbody>
              {recentTickets.map((ticket) => (
                <tr key={ticket._id}>
                  <td>
                    {ticket.title}
                    {ticket.ticketNumber && ` - ${ticket.ticketNumber}`}
                  </td>
                  <td>
                    {ticket.assignedTo ? 
                      `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : 
                      'Unassigned'
                    }
                  </td>
                  <td>{formatDate(ticket.createdAt)}</td>
                  <td>{formatDate(ticket.startDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Dashboard;