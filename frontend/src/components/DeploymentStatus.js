import React, { useState, useEffect } from 'react';
import './DeploymentStatus.css';

const DeploymentStatus = () => {
  const [deploymentStatus, setDeploymentStatus] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [deploymentId, setDeploymentId] = useState(null);
  const [deploymentStartTime, setDeploymentStartTime] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [showSetupHint, setShowSetupHint] = useState(false);

  // Configuration
  const API_URL = process.env.REACT_APP_API_URL || '/api';
  const CHECK_INTERVAL = 10000; // Check every 10 seconds

  // Check if backend deployment monitoring is available
  useEffect(() => {
    const checkBackendConfig = async () => {
      try {
        const response = await fetch(`${API_URL}/deployment/status`);
        const data = await response.json();
        
        if (response.ok) {
          setIsConfigured(true);
        } else if (response.status === 503) {
          // Service not configured
          setIsConfigured(false);
          setShowSetupHint(true);
          setTimeout(() => setShowSetupHint(false), 10000);
        }
      } catch (error) {
        console.warn('Deployment monitoring not available:', error);
        setIsConfigured(false);
      }
    };

    checkBackendConfig();
  }, [API_URL]);

  const checkDeploymentStatus = async () => {
    if (!isConfigured) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/deployment/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const latestDeploy = await response.json();

      if (latestDeploy && latestDeploy.id) {
        const currentStatus = latestDeploy.status;
        const currentId = latestDeploy.id;
        const startTime = new Date(latestDeploy.createdAt);

        // Check if this is a new deployment
        if (deploymentId !== currentId) {
          setDeploymentId(currentId);
          setDeploymentStartTime(startTime);
          setIsVisible(true);
        }

        // Update status
        if (deploymentStatus !== currentStatus) {
          setDeploymentStatus(currentStatus);
          
          // Show notification for status changes
          if (currentStatus === 'live') {
            showNotification('✅ Deployment Complete!', 'Your app is now live. You can refresh the page.', 'success');
          } else if (currentStatus === 'build_failed' || currentStatus === 'deploy_failed') {
            showNotification('❌ Deployment Failed', 'Check the Render dashboard for details.', 'error');
          } else if (currentStatus === 'building') {
            showNotification('🔨 Deployment Started', 'Building your app...', 'info');
          }
        }

        setLastChecked(new Date());
      }
    } catch (error) {
      console.error('Failed to check deployment status:', error);
      setLastChecked(new Date());
    }
  };

  const showNotification = (title, message, type) => {
    // Use browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: type === 'success' ? '✅' : type === 'error' ? '❌' : '🔨'
      });
    }
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  };

  useEffect(() => {
    // Request notification permission on mount
    requestNotificationPermission();

    if (isConfigured) {
      // Initial check
      checkDeploymentStatus();

      // Set up polling
      const interval = setInterval(checkDeploymentStatus, CHECK_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [deploymentId, deploymentStatus, isConfigured]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'live': return '#28a745';
      case 'building': return '#ffc107';
      case 'deploying': return '#17a2b8';
      case 'build_failed':
      case 'deploy_failed': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'live': return 'Live ✅';
      case 'building': return 'Building 🔨';
      case 'deploying': return 'Deploying 🚀';
      case 'build_failed': return 'Build Failed ❌';
      case 'deploy_failed': return 'Deploy Failed ❌';
      case 'queued': return 'Queued ⏳';
      default: return status;
    }
  };

  const formatDuration = () => {
    if (!deploymentStartTime) return '';
    const duration = (new Date() - deploymentStartTime) / 1000;
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}m ${seconds}s`;
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!isVisible && !showSetupHint) return null;

  // Setup hint when API is not configured
  if (showSetupHint && !isConfigured) {
    return (
      <div className="deployment-status-popup">
        <div className="deployment-status-header">
          <h4>🚀 Deployment Status</h4>
          <button className="close-btn" onClick={() => setShowSetupHint(false)}>×</button>
        </div>
        
        <div className="deployment-status-content">
          <div className="setup-hint">
            <p>📋 <strong>Backend Configuration Required</strong></p>
            <p>Configure Render API credentials on the server to enable deployment notifications.</p>
            <p>Set <code>RENDER_SERVICE_ID</code> and <code>RENDER_API_KEY</code> environment variables on your backend.</p>
          </div>
        </div>

        <div className="deployment-status-footer">
          <small>This message will auto-hide in 10 seconds</small>
        </div>
      </div>
    );
  }

  if (!isVisible || !deploymentStatus) return null;

  return (
    <div className="deployment-status-popup">
      <div className="deployment-status-header">
        <h4>🚀 Deployment Status</h4>
        <button className="close-btn" onClick={handleClose}>×</button>
      </div>
      
      <div className="deployment-status-content">
        <div className="status-indicator">
          <div 
            className="status-dot"
            style={{ backgroundColor: getStatusColor(deploymentStatus) }}
          ></div>
          <span className="status-text">
            {getStatusText(deploymentStatus)}
          </span>
        </div>

        {deploymentStartTime && (
          <div className="deployment-info">
            <div className="info-row">
              <span className="label">Duration:</span>
              <span className="value">{formatDuration()}</span>
            </div>
            <div className="info-row">
              <span className="label">Started:</span>
              <span className="value">{deploymentStartTime.toLocaleTimeString()}</span>
            </div>
          </div>
        )}

        {lastChecked && (
          <div className="last-checked">
            Last checked: {lastChecked.toLocaleTimeString()}
          </div>
        )}

        {deploymentStatus === 'live' && (
          <div className="action-buttons">
            <button className="refresh-btn" onClick={handleRefresh}>
              🔄 Refresh Page
            </button>
          </div>
        )}

        {(deploymentStatus === 'build_failed' || deploymentStatus === 'deploy_failed') && (
          <div className="action-buttons">
            <a 
              href="https://dashboard.render.com"
              target="_blank"
              rel="noopener noreferrer"
              className="render-link"
            >
              📊 View in Render
            </a>
          </div>
        )}
      </div>

      <div className="deployment-status-footer">
        <small>Auto-checking every {CHECK_INTERVAL / 1000}s</small>
      </div>
    </div>
  );
};

export default DeploymentStatus;