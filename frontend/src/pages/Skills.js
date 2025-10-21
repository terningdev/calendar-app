import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import skillsService from '../services/skillsService';
import { departmentService } from '../services/departmentService';

const Skills = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  
  // Skill matrix data
  const [matrixTechnicians, setMatrixTechnicians] = useState([]);
  const [matrixProducts, setMatrixProducts] = useState([]);
  const [skillLevels, setSkillLevels] = useState({});
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Form data
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [productForm, setProductForm] = useState({ name: '', categoryId: '', description: '' });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCategoryId && selectedDepartmentId) {
      loadSkillMatrix();
    } else {
      setMatrixTechnicians([]);
      setMatrixProducts([]);
      setSkillLevels({});
    }
  }, [selectedCategoryId, selectedDepartmentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, productsRes, departmentsRes] = await Promise.all([
        skillsService.getAllCategories(),
        skillsService.getAllProducts(),
        departmentService.getAll()
      ]);
      
      setCategories(categoriesRes.categories || []);
      setProducts(productsRes.products || []);
      setDepartments(departmentsRes || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadSkillMatrix = async () => {
    try {
      const response = await skillsService.getSkillMatrix(selectedCategoryId, selectedDepartmentId);
      setMatrixTechnicians(response.technicians || []);
      setMatrixProducts(response.products || []);
      setSkillLevels(response.skillLevels || {});
    } catch (error) {
      toast.error(error.message || 'Failed to load skill matrix');
    }
  };

  // ============ CATEGORY MANAGEMENT ============

  const openCategoryModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name, description: category.description || '' });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '' });
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await skillsService.updateCategory(editingCategory._id, categoryForm);
        toast.success('Category updated successfully');
      } else {
        await skillsService.createCategory(categoryForm);
        toast.success('Category created successfully');
      }
      setShowCategoryModal(false);
      loadData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this category? All associated products will need to be deleted first.')) {
      return;
    }
    try {
      await skillsService.deleteCategory(id);
      toast.success('Category deleted successfully');
      loadData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ============ PRODUCT MANAGEMENT ============

  const openProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({ 
        name: product.name, 
        categoryId: product.categoryId._id || product.categoryId,
        description: product.description || '' 
      });
    } else {
      setEditingProduct(null);
      setProductForm({ name: '', categoryId: '', description: '' });
    }
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await skillsService.updateProduct(editingProduct._id, productForm);
        toast.success('Product updated successfully');
      } else {
        await skillsService.createProduct(productForm);
        toast.success('Product created successfully');
      }
      setShowProductModal(false);
      loadData();
      if (selectedCategoryId && selectedDepartmentId) {
        loadSkillMatrix();
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product? All associated skill levels will be deleted.')) {
      return;
    }
    try {
      await skillsService.deleteProduct(id);
      toast.success('Product deleted successfully');
      loadData();
      if (selectedCategoryId && selectedDepartmentId) {
        loadSkillMatrix();
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ============ SKILL LEVEL MANAGEMENT ============

  const handleSkillLevelChange = async (technicianId, productId, currentLevel) => {
    const levels = ['bad', 'ok', 'good', null];
    const currentIndex = levels.indexOf(currentLevel);
    const nextLevel = levels[(currentIndex + 1) % levels.length];

    try {
      if (nextLevel === null) {
        // Delete the skill level
        await skillsService.deleteSkillLevel(technicianId, productId);
      } else {
        // Update the skill level
        await skillsService.updateSkillLevel({
          technicianId,
          productId,
          level: nextLevel
        });
      }
      
      // Reload matrix
      loadSkillMatrix();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getSkillLevelColor = (level) => {
    switch (level) {
      case 'bad': return '#e74c3c'; // Red
      case 'ok': return '#f39c12'; // Yellow/Orange
      case 'good': return '#27ae60'; // Green
      default: return '#ecf0f1'; // Light gray
    }
  };

  const getSkillLevelText = (level) => {
    switch (level) {
      case 'bad': return 'Bad';
      case 'ok': return 'Ok';
      case 'good': return 'Good';
      default: return '-';
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="skills-page">
      <h1 className="page-title">🎓 Skills Management</h1>

      {/* Category & Product Management Section */}
      <div className="skills-management-section" style={{ 
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <h2 style={{ marginBottom: '20px' }}>📚 Categories & Products</h2>
        
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <button onClick={() => openCategoryModal()} className="btn btn-primary">
            ➕ Add Category
          </button>
          <button onClick={() => openProductModal()} className="btn btn-primary">
            ➕ Add Product
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {categories.map(category => {
            const categoryProducts = products.filter(p => 
              (p.categoryId._id || p.categoryId) === category._id
            );
            
            return (
              <div key={category._id} style={{
                padding: '15px',
                backgroundColor: 'white',
                borderRadius: '6px',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{category.name}</h3>
                  <div>
                    <button 
                      onClick={() => openCategoryModal(category)}
                      className="btn btn-sm"
                      style={{ marginRight: '5px', padding: '2px 8px' }}
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDeleteCategory(category._id)}
                      className="btn btn-sm btn-danger"
                      style={{ padding: '2px 8px' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                {category.description && (
                  <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>
                    {category.description}
                  </p>
                )}
                
                <div style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
                  <strong style={{ fontSize: '0.9rem' }}>Products ({categoryProducts.length}):</strong>
                  {categoryProducts.length > 0 ? (
                    <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                      {categoryProducts.map(product => (
                        <li key={product._id} style={{ fontSize: '0.9rem', marginBottom: '5px' }}>
                          {product.name}
                          <button 
                            onClick={() => openProductModal(product)}
                            style={{ marginLeft: '10px', border: 'none', background: 'none', cursor: 'pointer' }}
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(product._id)}
                            style={{ marginLeft: '5px', border: 'none', background: 'none', cursor: 'pointer', color: '#e74c3c' }}
                          >
                            🗑️
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '5px' }}>No products yet</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {categories.length === 0 && (
          <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
            No categories yet. Click "Add Category" to get started.
          </p>
        )}
      </div>

      {/* Skill Matrix Section */}
      <div className="skills-matrix-section">
        <h2 style={{ marginBottom: '20px' }}>📊 Skill Matrix</h2>
        
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Select Category:
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="form-control"
            >
              <option value="">-- Select Category --</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Select Department:
            </label>
            <select
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              className="form-control"
            >
              <option value="">-- Select Department --</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedCategoryId && selectedDepartmentId && (
          <>
            {matrixTechnicians.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
                No technicians found in this department.
              </p>
            ) : matrixProducts.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
                No products found in this category.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#3498db', color: 'white' }}>
                      <th style={{ 
                        padding: '15px',
                        textAlign: 'left',
                        position: 'sticky',
                        left: 0,
                        backgroundColor: '#3498db',
                        zIndex: 2
                      }}>
                        Technician
                      </th>
                      {matrixProducts.map(product => (
                        <th key={product._id} style={{ 
                          padding: '15px',
                          textAlign: 'center',
                          minWidth: '120px'
                        }}>
                          {product.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixTechnicians.map(tech => (
                      <tr key={tech._id} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ 
                          padding: '15px',
                          fontWeight: 'bold',
                          position: 'sticky',
                          left: 0,
                          backgroundColor: 'white',
                          zIndex: 1,
                          borderRight: '2px solid #dee2e6'
                        }}>
                          {tech.name}
                        </td>
                        {matrixProducts.map(product => {
                          const key = `${tech._id}_${product._id}`;
                          const skillLevel = skillLevels[key];
                          const level = skillLevel?.level || null;
                          
                          return (
                            <td key={product._id} style={{ 
                              padding: '8px',
                              textAlign: 'center'
                            }}>
                              <button
                                onClick={() => handleSkillLevelChange(tech._id, product._id, level)}
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  border: '2px solid #dee2e6',
                                  borderRadius: '6px',
                                  backgroundColor: getSkillLevelColor(level),
                                  color: level ? 'white' : '#666',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  fontSize: '0.9rem'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.transform = 'scale(1.05)';
                                  e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = 'scale(1)';
                                  e.target.style.boxShadow = 'none';
                                }}
                              >
                                {getSkillLevelText(level)}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div style={{ 
                  marginTop: '20px', 
                  padding: '15px', 
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px'
                }}>
                  <strong>Instructions:</strong> Click on a skill cell to cycle through levels: 
                  <span style={{ 
                    marginLeft: '10px',
                    padding: '4px 12px',
                    backgroundColor: '#ecf0f1',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                  }}>
                    - (None)
                  </span>
                  <span style={{ 
                    marginLeft: '5px',
                    padding: '4px 12px',
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                  }}>
                    Bad
                  </span>
                  <span style={{ 
                    marginLeft: '5px',
                    padding: '4px 12px',
                    backgroundColor: '#f39c12',
                    color: 'white',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                  }}>
                    Ok
                  </span>
                  <span style={{ 
                    marginLeft: '5px',
                    padding: '4px 12px',
                    backgroundColor: '#27ae60',
                    color: 'white',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                  }}>
                    Good
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {(!selectedCategoryId || !selectedDepartmentId) && (
          <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
            Please select both a category and department to view the skill matrix.
          </p>
        )}
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
              <button className="modal-close" onClick={() => setShowCategoryModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveCategory}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Category Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    rows="3"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <button className="modal-close" onClick={() => setShowProductModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-control"
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                    required
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    rows="3"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowProductModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Skills;
