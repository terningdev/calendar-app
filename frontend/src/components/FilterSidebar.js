import React, { useState, useEffect } from 'react';
import { useTranslation } from '../utils/translations';

const FilterSidebar = ({ 
  isOpen, 
  onClose, 
  filters, 
  onFiltersChange, 
  searchTerm, 
  onSearchChange, 
  departments, 
  technicians,
  className = ''
}) => {
  const { t } = useTranslation();
  const [expandedDepartments, setExpandedDepartments] = useState({});

  // Auto-expand departments that have selected technicians
  useEffect(() => {
    if (filters.assignedTo && filters.assignedTo.length > 0) {
      const newExpandedDepartments = { ...expandedDepartments };
      
      technicians.forEach(tech => {
        if (filters.assignedTo.includes(tech._id)) {
          const deptId = typeof tech.department === 'object' ? tech.department._id : tech.department;
          if (deptId) {
            newExpandedDepartments[deptId] = true;
          }
        }
      });
      
      setExpandedDepartments(newExpandedDepartments);
    }
  }, [filters.assignedTo, technicians]);

  // Get technicians for a specific department
  const getTechniciansForDepartment = (departmentId) => {
    return technicians.filter(tech => {
      const techDeptId = typeof tech.department === 'object' ? tech.department._id : tech.department;
      return techDeptId === departmentId;
    });
  };

  // Handle department checkbox change
  const handleDepartmentChange = (departmentId, checked) => {
    const newDepartments = checked
      ? [...filters.department, departmentId]
      : filters.department.filter(id => id !== departmentId);
    
    // When unchecking a department, also uncheck all its technicians
    const newAssignedTo = checked 
      ? filters.assignedTo 
      : filters.assignedTo.filter(techId => {
          if (techId === 'unassigned') return true;
          const tech = technicians.find(t => t._id === techId);
          if (!tech) return true;
          const techDeptId = typeof tech.department === 'object' ? tech.department._id : tech.department;
          return techDeptId !== departmentId;
        });

    onFiltersChange({
      ...filters,
      department: newDepartments,
      assignedTo: newAssignedTo
    });
  };

  // Handle technician checkbox change
  const handleTechnicianChange = (technicianId, checked) => {
    const newAssignedTo = checked
      ? [...filters.assignedTo, technicianId]
      : filters.assignedTo.filter(id => id !== technicianId);
    
    onFiltersChange({
      ...filters,
      assignedTo: newAssignedTo
    });
  };

  // Toggle department expansion
  const toggleDepartment = (departmentId) => {
    setExpandedDepartments(prev => ({
      ...prev,
      [departmentId]: !prev[departmentId]
    }));
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div className="filter-sidebar-overlay" onClick={onClose}></div>
      )}
      
      {/* Sidebar */}
      <div className={`filter-sidebar ${isOpen ? 'filter-sidebar-open' : ''} ${className}`}>
        {/* Header */}
        <div className="filter-sidebar-header">
          <h3 className="filter-sidebar-title">{t('filters')}</h3>
          <button className="filter-sidebar-close" onClick={onClose}>
            <span>&times;</span>
          </button>
        </div>

        {/* Content */}
        <div className="filter-sidebar-content">
          {/* Search */}
          <div className="filter-sidebar-section">
            <label className="filter-sidebar-label">{t('search')}</label>
            <div className="filter-sidebar-search">
              <input
                type="text"
                className="filter-sidebar-input"
                placeholder={t('search') + '...'}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>

          {/* Departments and Technicians Tree */}
          <div className="filter-sidebar-section">
            <label className="filter-sidebar-label">{t('departmentsAndTechnicians')}</label>
            
            {/* Unassigned option */}
            <div className="filter-tree-node filter-tree-leaf">
              <label className="filter-tree-item">
                <input
                  type="checkbox"
                  checked={filters.assignedTo.includes('unassigned')}
                  onChange={(e) => handleTechnicianChange('unassigned', e.target.checked)}
                />
                <span className="filter-tree-label">{t('unassigned')}</span>
              </label>
            </div>

            {/* Department tree */}
            {departments.map(dept => {
              const deptTechnicians = getTechniciansForDepartment(dept._id);
              const isExpanded = expandedDepartments[dept._id];
              const isDeptChecked = filters.department.includes(dept._id);
              
              return (
                <div key={dept._id} className="filter-tree-node">
                  {/* Department */}
                  <div className="filter-tree-branch">
                    <button
                      className="filter-tree-toggle"
                      onClick={() => toggleDepartment(dept._id)}
                      disabled={deptTechnicians.length === 0}
                    >
                      {deptTechnicians.length > 0 ? (
                        isExpanded ? '▼' : '▶'
                      ) : '○'}
                    </button>
                    <label className="filter-tree-item">
                      <input
                        type="checkbox"
                        checked={isDeptChecked}
                        onChange={(e) => handleDepartmentChange(dept._id, e.target.checked)}
                      />
                      <span className="filter-tree-label">{dept.name}</span>
                      {deptTechnicians.length > 0 && (
                        <span className="filter-tree-count">({deptTechnicians.length})</span>
                      )}
                    </label>
                  </div>

                  {/* Technicians */}
                  {isExpanded && deptTechnicians.length > 0 && (
                    <div className="filter-tree-children">
                      {deptTechnicians.map(tech => (
                        <div key={tech._id} className="filter-tree-node filter-tree-leaf">
                          <label className="filter-tree-item filter-tree-child">
                            <input
                              type="checkbox"
                              checked={filters.assignedTo.includes(tech._id)}
                              onChange={(e) => handleTechnicianChange(tech._id, e.target.checked)}
                            />
                            <span className="filter-tree-label">{tech.fullName}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {departments.length === 0 && (
              <div className="filter-sidebar-empty">
                No departments available
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default FilterSidebar;