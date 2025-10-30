import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const Logs = () => {
  const { user } = useAuth();
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    action: '',
    userId: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 50
  });
  
  const [categories, setCategories] = useState([]);
  const [actions, setActions] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);

  // Check if user has permission to view logs
  const hasPermission = () => {
    return user?.role === 'sysadmin' || user?.permissions?.viewLogs === true;
  };

  // Fetch logs with current filters and pagination
  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value))
      });

      const response = await fetch(`/api/logs?${params}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.logs);
        setPagination(data.pagination);
      } else {
        toast.error(data.message || 'Failed to fetch logs');
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Error fetching logs');
    } finally {
      setLoading(false);
    }
  };

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      const [categoriesRes, actionsRes, usersRes, statsRes] = await Promise.all([
        fetch('/api/logs/categories'),
        fetch('/api/logs/actions'),
        fetch('/api/logs/users'),
        fetch('/api/logs/stats')
      ]);

      const [categoriesData, actionsData, usersData, statsData] = await Promise.all([
        categoriesRes.json(),
        actionsRes.json(),
        usersRes.json(),
        statsRes.json()
      ]);

      if (categoriesData.success) setCategories(categoriesData.categories);
      if (actionsData.success) setActions(actionsData.actions);
      if (usersData.success) setUsers(usersData.users);
      if (statsData.success) setStats(statsData.stats);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  useEffect(() => {
    if (hasPermission()) {
      fetchFilterOptions();
      fetchLogs();
    }
  }, []);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Apply filters
  const applyFilters = () => {
    fetchLogs(1);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      category: '',
      action: '',
      userId: '',
      search: '',
      startDate: '',
      endDate: ''
    });
    setTimeout(() => fetchLogs(1), 100);
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };



  // Get action color class
  const getActionColorClass = (action) => {
    if (action.includes('CREATE') || action.includes('REGISTER')) return 'success';
    if (action.includes('UPDATE') || action.includes('EDIT') || action.includes('APPROVE')) return 'warning';
    if (action.includes('DELETE') || action.includes('REJECT')) return 'danger';
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'info';
    return 'secondary';
  };

  if (!hasPermission()) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Access Denied</h1>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>You do not have permission to view system logs.</p>
          <p>Log viewing permission is required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: window.innerWidth <= 768 ? '10px' : undefined }}>
      <div className="page-header">
        <h1 className="page-title">System Activity Logs</h1>
        <p className="page-description">Monitor all system activities and user actions</p>
      </div>

      {/* Compact Statistics */}
      {stats && (
        <div className="card" style={{ marginBottom: '15px', padding: '12px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: '12px',
            textAlign: 'center'
          }}>
            <div>
              <h4 style={{ margin: '0 0 4px 0', color: 'var(--primary-color)', fontSize: '1.2rem' }}>
                {stats.totalLogs.toLocaleString()}
              </h4>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Total Logs</p>
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', color: 'var(--success-color)', fontSize: '1.2rem' }}>
                {stats.todayLogs.toLocaleString()}
              </h4>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Today</p>
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', color: 'var(--info-color)', fontSize: '1.2rem' }}>
                {stats.byCategory.length}
              </h4>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Categories</p>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Filters */}
      {showFilters && (
        <div className="card" style={{ marginBottom: '15px' }}>
          <div style={{ padding: '15px' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
              gap: '10px', 
              marginBottom: '15px' 
            }}>
              
              {/* Search */}
              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Search</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ fontSize: '0.9rem', padding: '6px 10px' }}
                  placeholder="Search descriptions, users..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>

              {/* Category */}
              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Category</label>
                <select
                  className="form-control"
                  style={{ fontSize: '0.9rem', padding: '6px 10px' }}
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action */}
              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Action</label>
                <select
                  className="form-control"
                  style={{ fontSize: '0.9rem', padding: '6px 10px' }}
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                >
                  <option value="">All Actions</option>
                  {actions.map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>

              {/* User */}
              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>User</label>
                <select
                  className="form-control"
                  style={{ fontSize: '0.9rem', padding: '6px 10px' }}
                  value={filters.userId}
                  onChange={(e) => handleFilterChange('userId', e.target.value)}
                >
                  <option value="">All Users</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.userName} ({user.userEmail})
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>From</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  style={{ fontSize: '0.9rem', padding: '6px 10px' }}
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>

              {/* End Date */}
              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>To</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  style={{ fontSize: '0.9rem', padding: '6px 10px' }}
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-primary" 
                onClick={applyFilters}
                style={{ fontSize: '0.9rem', padding: '6px 12px' }}
              >
                Apply
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={clearFilters}
                style={{ fontSize: '0.9rem', padding: '6px 12px' }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="card">
        <div style={{ padding: '15px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '15px',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                Activity Log ({pagination.totalCount.toLocaleString()} entries)
              </h3>
              <button 
                className="btn btn-outline-secondary" 
                onClick={() => setShowFilters(!showFilters)}
                style={{ 
                  fontSize: '0.85rem', 
                  padding: '4px 8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: showFilters ? 'var(--primary-color)' : 'transparent',
                  color: showFilters ? 'white' : 'var(--text-primary)'
                }}
              >
                Filter {showFilters ? '▲' : '▼'}
              </button>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Page {pagination.currentPage} of {pagination.totalPages}
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <p>No log entries found matching your criteria.</p>
            </div>
          ) : (
            <>
              {/* Log Entries */}
              <div style={{ marginBottom: '15px' }}>
                {logs.map((log, index) => (
                  <div
                    key={log._id}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '10px',
                      marginBottom: '6px',
                      backgroundColor: index % 2 === 0 ? 'var(--card-bg)' : 'var(--accent-bg)',
                      fontSize: '0.9rem'
                    }}
                  >
                    {/* Mobile-first responsive layout */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start', 
                      marginBottom: '8px',
                      flexWrap: 'wrap',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span 
                          className={`badge badge-${getActionColorClass(log.action)}`}
                          style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                        >
                          {log.action}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {log.category}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '8px', fontSize: '0.85rem', lineHeight: '1.3' }}>
                      <strong>{log.description}</strong>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      fontSize: '0.75rem', 
                      color: 'var(--text-secondary)',
                      flexWrap: 'wrap',
                      gap: '6px'
                    }}>
                      <span style={{ minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.userName} ({log.userEmail})
                      </span>
                      {log.ipAddress && (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem' }}>
                          {log.ipAddress}
                        </span>
                      )}
                    </div>
                    
                    {log.changes && (
                      <details style={{ marginTop: '8px', fontSize: '0.75rem' }}>
                        <summary style={{ 
                          cursor: 'pointer', 
                          color: 'var(--primary-color)', 
                          padding: '2px 0',
                          fontSize: '0.75rem'
                        }}>
                          View Changes
                        </summary>
                        <pre style={{ 
                          marginTop: '6px', 
                          backgroundColor: 'var(--accent-bg)', 
                          padding: '8px', 
                          borderRadius: '4px', 
                          overflow: 'auto',
                          fontSize: '0.7rem',
                          maxHeight: '200px'
                        }}>
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    className="btn btn-secondary"
                    disabled={!pagination.hasPrev}
                    onClick={() => fetchLogs(pagination.currentPage - 1)}
                    style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                  >
                    ← Prev
                  </button>
                  
                  <span style={{ 
                    padding: '0 12px', 
                    color: 'var(--text-secondary)', 
                    fontSize: '0.85rem',
                    whiteSpace: 'nowrap'
                  }}>
                    {pagination.currentPage} / {pagination.totalPages}
                  </span>
                  
                  <button
                    className="btn btn-secondary"
                    disabled={!pagination.hasNext}
                    onClick={() => fetchLogs(pagination.currentPage + 1)}
                    style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Logs;