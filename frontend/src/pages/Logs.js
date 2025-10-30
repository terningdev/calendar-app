import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../utils/translations';
import { toast } from 'react-toastify';

const Logs = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Format category display
  const formatCategory = (category) => {
    const categoryIcons = {
      'AUTH': '🔐',
      'USER': '👤',
      'TICKET': '🎫',
      'DEPARTMENT': '🏢',
      'TECHNICIAN': '🔧',
      'ABSENCE': '📅',
      'SKILL': '⭐',
      'BUG_REPORT': '🐛',
      'SYSTEM': '⚙️'
    };
    return `${categoryIcons[category] || '📋'} ${category}`;
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
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📋 System Activity Logs</h1>
        <p className="page-description">Monitor all system activities and user actions</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', padding: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary-color)' }}>{stats.totalLogs.toLocaleString()}</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Total Log Entries</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: 'var(--success-color)' }}>{stats.todayLogs.toLocaleString()}</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Today's Activity</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: 'var(--info-color)' }}>{stats.byCategory.length}</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Active Categories</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ padding: '20px' }}>
          <h3 style={{ marginTop: 0 }}>🔍 Filters</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            
            {/* Search */}
            <div className="form-group">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search descriptions, users..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-control"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {formatCategory(category)}
                  </option>
                ))}
              </select>
            </div>

            {/* Action */}
            <div className="form-group">
              <label className="form-label">Action</label>
              <select
                className="form-control"
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
            <div className="form-group">
              <label className="form-label">User</label>
              <select
                className="form-control"
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
            <div className="form-group">
              <label className="form-label">From Date</label>
              <input
                type="datetime-local"
                className="form-control"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            {/* End Date */}
            <div className="form-group">
              <label className="form-label">To Date</label>
              <input
                type="datetime-local"
                className="form-control"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={applyFilters}>
              🔍 Apply Filters
            </button>
            <button className="btn btn-secondary" onClick={clearFilters}>
              🗑️ Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="card">
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>
              📊 Activity Log ({pagination.totalCount.toLocaleString()} entries)
            </h3>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
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
              <div style={{ marginBottom: '20px' }}>
                {logs.map((log, index) => (
                  <div
                    key={log._id}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '15px',
                      marginBottom: '10px',
                      backgroundColor: index % 2 === 0 ? 'var(--card-bg)' : 'var(--accent-bg)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={`badge badge-${getActionColorClass(log.action)}`}>
                          {log.action}
                        </span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          {formatCategory(log.category)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '10px' }}>
                      <strong>{log.description}</strong>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span>
                        👤 {log.userName} ({log.userEmail})
                      </span>
                      {log.ipAddress && (
                        <span>
                          🌐 {log.ipAddress}
                        </span>
                      )}
                    </div>
                    
                    {log.changes && (
                      <details style={{ marginTop: '10px', fontSize: '0.8rem' }}>
                        <summary style={{ cursor: 'pointer', color: 'var(--primary-color)' }}>
                          View Changes
                        </summary>
                        <pre style={{ marginTop: '10px', backgroundColor: 'var(--accent-bg)', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                  <button
                    className="btn btn-secondary"
                    disabled={!pagination.hasPrev}
                    onClick={() => fetchLogs(pagination.currentPage - 1)}
                  >
                    ← Previous
                  </button>
                  
                  <span style={{ padding: '0 20px', color: 'var(--text-secondary)' }}>
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  
                  <button
                    className="btn btn-secondary"
                    disabled={!pagination.hasNext}
                    onClick={() => fetchLogs(pagination.currentPage + 1)}
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