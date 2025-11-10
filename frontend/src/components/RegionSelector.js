import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useRegion } from '../contexts/RegionContext';

const RegionSelector = () => {
  const { selectedRegion, regions, loading, selectRegion } = useRegion();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleRegionSelect = (region) => {
    selectRegion(region);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  if (loading || regions.length === 0) {
    return null;
  }

  return (
    <div className="region-selector" ref={dropdownRef}>
      <button 
        className="region-selector-button"
        onClick={toggleDropdown}
        aria-label="Select region"
      >
        <span className="region-selector-text">
          📍 {selectedRegion?.name || 'Select Region'}
        </span>
        <span className={`region-selector-arrow ${isOpen ? 'open' : ''}`}>
          ▼
        </span>
      </button>
      
      {isOpen && (
        <div className="region-selector-dropdown">
          {regions.map((region) => (
            <div
              key={region._id}
              className={`region-selector-item ${selectedRegion?._id === region._id ? 'selected' : ''}`}
              onClick={() => handleRegionSelect(region)}
            >
              <span className="region-selector-name">{region.name}</span>
              {region.description && (
                <span className="region-selector-description">{region.description}</span>
              )}
              {selectedRegion?._id === region._id && (
                <span className="region-selector-check">✓</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RegionSelector;