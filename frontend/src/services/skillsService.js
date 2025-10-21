import api from './api';

const skillsService = {
  // ============ CATEGORIES ============
  
  getAllCategories: async () => {
    try {
      const response = await api.get('/skills/categories');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch categories');
    }
  },

  createCategory: async (categoryData) => {
    try {
      const response = await api.post('/skills/categories', categoryData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create category');
    }
  },

  updateCategory: async (id, categoryData) => {
    try {
      const response = await api.put(`/skills/categories/${id}`, categoryData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update category');
    }
  },

  deleteCategory: async (id) => {
    try {
      const response = await api.delete(`/skills/categories/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete category');
    }
  },

  // ============ PRODUCTS ============

  getAllProducts: async (categoryId = null) => {
    try {
      const url = categoryId ? `/skills/products?categoryId=${categoryId}` : '/skills/products';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch products');
    }
  },

  createProduct: async (productData) => {
    try {
      const response = await api.post('/skills/products', productData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create product');
    }
  },

  updateProduct: async (id, productData) => {
    try {
      const response = await api.put(`/skills/products/${id}`, productData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update product');
    }
  },

  deleteProduct: async (id) => {
    try {
      const response = await api.delete(`/skills/products/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete product');
    }
  },

  // ============ SKILL MATRIX ============

  getSkillMatrix: async (categoryId, departmentId) => {
    try {
      const response = await api.get(`/skills/matrix?categoryId=${categoryId}&departmentId=${departmentId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch skill matrix');
    }
  },

  updateSkillLevel: async (skillData) => {
    try {
      const response = await api.post('/skills/levels', skillData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update skill level');
    }
  },

  deleteSkillLevel: async (technicianId, productId) => {
    try {
      const response = await api.delete(`/skills/levels/${technicianId}/${productId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete skill level');
    }
  }
};

export default skillsService;
