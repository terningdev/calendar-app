import React, { useState, useEffect } from 'react';
import { ticketService } from '../services/ticketService';
import { technicianService } from '../services/technicianService';
import { departmentService } from '../services/departmentService';
import { useTranslation } from '../utils/translations';
import { useRegion } from '../contexts/RegionContext';

const Dashboard = () => {
  const { t } = useTranslation();
  const { refreshTrigger } = useRegion();
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
  const [timeView, setTimeView] = useState('day'); // 'day', 'month', 'year'

  useEffect(() => {
    loadDashboardData();
  }, [refreshTrigger]); // Add refreshTrigger dependency

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

      // Process tickets by date and department based on time view
      processTicketsByTimeView(tickets, departmentsData, timeView);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processTicketsByTimeView = (tickets, departmentsData, view) => {
    const ticketsByPeriodMap = {};
    
    tickets.forEach(ticket => {
      const date = new Date(ticket.startDate);
      let period;
      let displayFormat;
      
      if (view === 'day') {
        period = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
        displayFormat = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (view === 'month') {
        period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
        displayFormat = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      } else if (view === 'year') {
        period = String(date.getFullYear()); // YYYY
        displayFormat = String(date.getFullYear());
      }
      
      if (!ticketsByPeriodMap[period]) {
        ticketsByPeriodMap[period] = { period, displayFormat };
        departmentsData.forEach(dept => {
          ticketsByPeriodMap[period][dept._id] = 0;
        });
      }
      
      // Get department ID from assignedTo array
      if (ticket.assignedTo && ticket.assignedTo.length > 0) {
        ticket.assignedTo.forEach(user => {
          if (user.department) {
            const deptId = typeof user.department === 'object' ? user.department._id : user.department;
            if (ticketsByPeriodMap[period][deptId] !== undefined) {
              ticketsByPeriodMap[period][deptId]++;
            }
          }
        });
      }
    });

    // Convert to array and sort by period
    const sortedPeriods = Object.keys(ticketsByPeriodMap).sort();
    
    // Limit data points based on view
    let limitedPeriods;
    if (view === 'day') {
      limitedPeriods = sortedPeriods.slice(-30); // Last 30 days
    } else if (view === 'month') {
      limitedPeriods = sortedPeriods.slice(-12); // Last 12 months
    } else {
      limitedPeriods = sortedPeriods.slice(-10); // Last 10 years
    }
    
    const chartData = limitedPeriods.map(period => ticketsByPeriodMap[period]);
    setTicketsByDate(chartData);
  };

  // Re-process data when time view changes
  useEffect(() => {
    if (departments.length > 0 && !loading) {
      const reloadData = async () => {
        try {
          const tickets = await ticketService.getAll();
          processTicketsByTimeView(tickets, departments, timeView);
        } catch (error) {
          console.error('Error reloading tickets:', error);
        }
      };
      reloadData();
    }
  }, [timeView]);

  const getMaxTickets = () => {
    let max = 0;
    ticketsByDate.forEach(period => {
      departments.forEach(dept => {
        const count = period[dept._id] || 0;
        if (count > max) {
          max = count;
        }
      });
    });
    return Math.max(max, 5); // Minimum height of 5
  };

  const getDepartmentColor = (index) => {
    const colors = ['#3498db', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'];
    return colors[index % colors.length];
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
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h2 className="card-title">Tickets per {timeView === 'day' ? 'Day' : timeView === 'month' ? 'Month' : 'Year'} by Department</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setTimeView('day')}
              className={`btn ${timeView === 'day' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 15px', fontSize: '0.9rem' }}
            >
              Day
            </button>
            <button
              onClick={() => setTimeView('month')}
              className={`btn ${timeView === 'month' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 15px', fontSize: '0.9rem' }}
            >
              Month
            </button>
            <button
              onClick={() => setTimeView('year')}
              className={`btn ${timeView === 'year' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 15px', fontSize: '0.9rem' }}
            >
              Year
            </button>
          </div>
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
                    style={{ backgroundColor: getDepartmentColor(index) }}
                  ></span>
                  <span className="legend-label">{dept.name}</span>
                </div>
              ))}
            </div>

            {/* Line Chart */}
            <div className="line-chart-container" style={{ 
              padding: '20px', 
              overflowX: 'auto',
              position: 'relative'
            }}>
              <svg
                width={Math.max(800, ticketsByDate.length * 60)}
                height="400"
                style={{ minWidth: '100%' }}
              >
                {/* Y-axis grid lines and labels */}
                {[0, 1, 2, 3, 4, 5].map(i => {
                  const y = 350 - (i * 60);
                  const value = Math.round((maxTickets / 5) * i);
                  return (
                    <g key={i}>
                      <line
                        x1="50"
                        y1={y}
                        x2={Math.max(800, ticketsByDate.length * 60) - 20}
                        y2={y}
                        stroke="var(--border-color)"
                        strokeWidth="1"
                        opacity="0.3"
                      />
                      <text
                        x="40"
                        y={y + 5}
                        textAnchor="end"
                        fontSize="12"
                        fill="var(--text-secondary)"
                      >
                        {value}
                      </text>
                    </g>
                  );
                })}

                {/* X-axis */}
                <line
                  x1="50"
                  y1="350"
                  x2={Math.max(800, ticketsByDate.length * 60) - 20}
                  y2="350"
                  stroke="var(--text-primary)"
                  strokeWidth="2"
                />

                {/* Y-axis */}
                <line
                  x1="50"
                  y1="50"
                  x2="50"
                  y2="350"
                  stroke="var(--text-primary)"
                  strokeWidth="2"
                />

                {/* X-axis labels */}
                {ticketsByDate.map((period, index) => {
                  const x = 50 + (index * ((Math.max(800, ticketsByDate.length * 60) - 70) / (ticketsByDate.length - 1 || 1)));
                  return (
                    <text
                      key={index}
                      x={x}
                      y="370"
                      textAnchor="middle"
                      fontSize="11"
                      fill="var(--text-secondary)"
                      transform={`rotate(-45, ${x}, 370)`}
                    >
                      {period.displayFormat}
                    </text>
                  );
                })}

                {/* Department lines */}
                {departments.map((dept, deptIndex) => {
                  const color = getDepartmentColor(deptIndex);
                  const points = ticketsByDate.map((period, index) => {
                    const x = 50 + (index * ((Math.max(800, ticketsByDate.length * 60) - 70) / (ticketsByDate.length - 1 || 1)));
                    const count = period[dept._id] || 0;
                    const y = 350 - ((count / maxTickets) * 300);
                    return { x, y, count };
                  });

                  // Create path for line
                  const pathData = points.map((p, i) => 
                    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
                  ).join(' ');

                  return (
                    <g key={dept._id}>
                      {/* Line */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke={color}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      
                      {/* Data points */}
                      {points.map((p, i) => (
                        <g key={i}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="5"
                            fill={color}
                            stroke="white"
                            strokeWidth="2"
                          />
                          <title>{`${dept.name}: ${p.count} ticket${p.count !== 1 ? 's' : ''}`}</title>
                          {/* Display count on chart */}
                          {p.count > 0 && (
                            <text
                              x={p.x}
                              y={p.y - 10}
                              textAnchor="middle"
                              fontSize="11"
                              fontWeight="bold"
                              fill={color}
                            >
                              {p.count}
                            </text>
                          )}
                        </g>
                      ))}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;