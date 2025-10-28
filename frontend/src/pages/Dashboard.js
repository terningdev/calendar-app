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
  const [ticketsByDate, setTicketsByDate] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [tickets, technicians, departmentsData] = await Promise.all([
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
        totalDepartments: departmentsData.length
      });

      setDepartments(departmentsData);

      // Process tickets by date and department
      const ticketsByDateMap = {};
      
      tickets.forEach(ticket => {
        const date = new Date(ticket.startDate).toLocaleDateString('en-CA'); // YYYY-MM-DD format
        if (!ticketsByDateMap[date]) {
          ticketsByDateMap[date] = {};
          departmentsData.forEach(dept => {
            ticketsByDateMap[date][dept._id] = 0;
          });
        }
        
        if (ticket.department) {
          const deptId = typeof ticket.department === 'object' ? ticket.department._id : ticket.department;
          if (ticketsByDateMap[date][deptId] !== undefined) {
            ticketsByDateMap[date][deptId]++;
          }
        }
      });

      // Convert to array and sort by date (last 30 dates)
      const sortedDates = Object.keys(ticketsByDateMap)
        .sort((a, b) => new Date(a) - new Date(b))
        .slice(-30);
      
      const chartData = sortedDates.map(date => ({
        date,
        displayDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ...ticketsByDateMap[date]
      }));

      setTicketsByDate(chartData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMaxTickets = () => {
    let max = 0;
    ticketsByDate.forEach(day => {
      // Calculate the sum of all departments for this day (stacked bar total)
      let dayTotal = 0;
      departments.forEach(dept => {
        dayTotal += (day[dept._id] || 0);
      });
      if (dayTotal > max) {
        max = dayTotal;
      }
    });
    return Math.max(max, 5); // Minimum height of 5
  };

  if (loading) {
    return (
      <div className="loading">
        Loading dashboard data...
      </div>
    );
  }

  const maxTickets = getMaxTickets();

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

      {/* Stats Card - Mobile Compact Grid View */}
      <div className="card mobile-only mobile-stats-card">
        <div className="mobile-stats-grid">
          <div className="mobile-stat-item">
            <div className="mobile-stat-value" style={{ color: '#3498db' }}>{stats.totalTickets}</div>
            <div className="mobile-stat-label">Tickets</div>
          </div>
          <div className="mobile-stat-item">
            <div className="mobile-stat-value" style={{ color: '#27ae60' }}>{stats.assignedTickets}</div>
            <div className="mobile-stat-label">Assigned</div>
          </div>
          <div className="mobile-stat-item">
            <div className="mobile-stat-value" style={{ color: '#e74c3c' }}>{stats.unassignedTickets}</div>
            <div className="mobile-stat-label">Unassigned</div>
          </div>
          <div className="mobile-stat-item">
            <div className="mobile-stat-value" style={{ color: '#9b59b6' }}>{stats.totalTechnicians}</div>
            <div className="mobile-stat-label">Technicians</div>
          </div>
          <div className="mobile-stat-item">
            <div className="mobile-stat-value" style={{ color: '#f39c12' }}>{stats.totalDepartments}</div>
            <div className="mobile-stat-label">Departments</div>
          </div>
        </div>
      </div>

      {/* Tickets by Date Chart */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Tickets per Date by Department</h2>
        </div>
        
        {ticketsByDate.length === 0 ? (
          <div className="empty-state">
            <h3>No ticket data available</h3>
            <p>Create tickets to see the chart</p>
          </div>
        ) : (
          <div>
            {/* Legend */}
            <div className="chart-legend">
              {departments.map((dept, index) => (
                <div key={dept._id} className="legend-item">
                  <span 
                    className="legend-color" 
                    style={{ backgroundColor: index === 0 ? '#3498db' : '#27ae60' }}
                  ></span>
                  <span className="legend-label">{dept.name}</span>
                </div>
              ))}
            </div>

            {/* Bar Chart */}
            <div className="bar-chart-container">
              <div className="bar-chart-scroll">
                {ticketsByDate.map((day, dayIndex) => (
                  <div key={dayIndex} className="bar-chart-column">
                    <div className="bar-chart-bars">
                      {departments.map((dept, deptIndex) => {
                        const count = day[dept._id] || 0;
                        const heightPercent = (count / maxTickets) * 100;
                        const color = deptIndex === 0 ? '#3498db' : '#27ae60';
                        
                        return (
                          <div 
                            key={dept._id} 
                            className="bar-chart-bar"
                            style={{ 
                              height: `${heightPercent}%`,
                              backgroundColor: color,
                              opacity: count === 0 ? 0.2 : 1
                            }}
                            title={`${dept.name}: ${count} ticket${count !== 1 ? 's' : ''}`}
                          >
                            {count > 0 && <span className="bar-label">{count}</span>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="bar-chart-label">{day.displayDate}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;