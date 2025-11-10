import React, { createContext, useContext, useState, useEffect } from 'react';
import regionService from '../services/regionService';

const RegionContext = createContext();

export const useRegion = () => {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error('useRegion must be used within a RegionProvider');
  }
  return context;
};

export const RegionProvider = ({ children }) => {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load regions on mount
  useEffect(() => {
    loadRegions();
  }, []);

  // Load saved region from localStorage on mount
  useEffect(() => {
    const savedRegionId = localStorage.getItem('selectedRegionId');
    if (savedRegionId && regions.length > 0) {
      const savedRegion = regions.find(region => region._id === savedRegionId);
      if (savedRegion) {
        setSelectedRegion(savedRegion);
      } else {
        // If saved region doesn't exist, select first region
        setSelectedRegion(regions[0]);
        localStorage.setItem('selectedRegionId', regions[0]._id);
      }
    } else if (regions.length > 0 && !selectedRegion) {
      // No saved region, select first one
      setSelectedRegion(regions[0]);
      localStorage.setItem('selectedRegionId', regions[0]._id);
    }
  }, [regions]);

  const loadRegions = async () => {
    try {
      setLoading(true);
      const regions = await regionService.getAll();
      setRegions(regions);
      setError(null);
    } catch (err) {
      console.error('Error loading regions:', err);
      setError('Failed to load regions');
    } finally {
      setLoading(false);
    }
  };

  const selectRegion = (region) => {
    setSelectedRegion(region);
    if (region) {
      localStorage.setItem('selectedRegionId', region._id);
    } else {
      localStorage.removeItem('selectedRegionId');
    }
    // Trigger refresh for components listening to region changes
    setRefreshTrigger(prev => prev + 1);
  };

  const refreshRegions = async () => {
    await loadRegions();
  };

  const value = {
    selectedRegion,
    regions,
    loading,
    error,
    refreshTrigger,
    selectRegion,
    refreshRegions
  };

  return (
    <RegionContext.Provider value={value}>
      {children}
    </RegionContext.Provider>
  );
};

export default RegionContext;