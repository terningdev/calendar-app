const express = require('express');
const router = express.Router();
const { SkillCategory, SkillProduct, SkillLevel } = require('../models/SkillModel');
const Technician = require('../models/Technician');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }
    next();
};

// ============ CATEGORIES ============

// GET /api/skills/categories - Get all categories
router.get('/categories', isAuthenticated, async (req, res) => {
    try {
        const categories = await SkillCategory.find().sort({ name: 1 });
        res.json({ success: true, categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
});

// POST /api/skills/categories - Create a new category
router.post('/categories', isAuthenticated, async (req, res) => {
    try {
        const { name, description } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        const category = new SkillCategory({ name: name.trim(), description });
        await category.save();
        
        res.json({ success: true, message: 'Category created successfully', category });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Category name already exists' });
        }
        console.error('Error creating category:', error);
        res.status(500).json({ success: false, message: 'Failed to create category' });
    }
});

// PUT /api/skills/categories/:id - Update a category
router.put('/categories/:id', isAuthenticated, async (req, res) => {
    try {
        const { name, description } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        const category = await SkillCategory.findByIdAndUpdate(
            req.params.id,
            { name: name.trim(), description },
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.json({ success: true, message: 'Category updated successfully', category });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Category name already exists' });
        }
        console.error('Error updating category:', error);
        res.status(500).json({ success: false, message: 'Failed to update category' });
    }
});

// DELETE /api/skills/categories/:id - Delete a category
router.delete('/categories/:id', isAuthenticated, async (req, res) => {
    try {
        // Check if category has products
        const productsCount = await SkillProduct.countDocuments({ categoryId: req.params.id });
        if (productsCount > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot delete category. It has ${productsCount} product(s). Delete products first.` 
            });
        }

        const category = await SkillCategory.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ success: false, message: 'Failed to delete category' });
    }
});

// ============ PRODUCTS ============

// GET /api/skills/products - Get all products (optionally filter by category)
router.get('/products', isAuthenticated, async (req, res) => {
    try {
        const { categoryId } = req.query;
        const query = categoryId ? { categoryId } : {};
        
        const products = await SkillProduct.find(query)
            .populate('categoryId', 'name')
            .sort({ name: 1 });
        
        res.json({ success: true, products });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch products' });
    }
});

// POST /api/skills/products - Create a new product
router.post('/products', isAuthenticated, async (req, res) => {
    try {
        const { name, categoryId, description } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Product name is required' });
        }
        if (!categoryId) {
            return res.status(400).json({ success: false, message: 'Category is required' });
        }

        const product = new SkillProduct({ 
            name: name.trim(), 
            categoryId, 
            description 
        });
        await product.save();
        await product.populate('categoryId', 'name');
        
        res.json({ success: true, message: 'Product created successfully', product });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Product name already exists in this category' });
        }
        console.error('Error creating product:', error);
        res.status(500).json({ success: false, message: 'Failed to create product' });
    }
});

// PUT /api/skills/products/:id - Update a product
router.put('/products/:id', isAuthenticated, async (req, res) => {
    try {
        const { name, categoryId, description } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Product name is required' });
        }

        const product = await SkillProduct.findByIdAndUpdate(
            req.params.id,
            { name: name.trim(), categoryId, description },
            { new: true, runValidators: true }
        ).populate('categoryId', 'name');

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.json({ success: true, message: 'Product updated successfully', product });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Product name already exists in this category' });
        }
        console.error('Error updating product:', error);
        res.status(500).json({ success: false, message: 'Failed to update product' });
    }
});

// DELETE /api/skills/products/:id - Delete a product
router.delete('/products/:id', isAuthenticated, async (req, res) => {
    try {
        // Delete all skill levels for this product
        await SkillLevel.deleteMany({ productId: req.params.id });

        const product = await SkillProduct.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ success: false, message: 'Failed to delete product' });
    }
});

// ============ SKILL LEVELS ============

// GET /api/skills/matrix - Get skill matrix for a category and department
router.get('/matrix', isAuthenticated, async (req, res) => {
    try {
        const { categoryId, departmentId } = req.query;
        
        if (!categoryId || !departmentId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Category and department are required' 
            });
        }

        // Get all products in the category
        const products = await SkillProduct.find({ categoryId }).sort({ name: 1 });

        // Get all technicians in the department
        const technicians = await Technician.find({ departmentId }).sort({ name: 1 });

        // Get all skill levels for these technicians and products
        const productIds = products.map(p => p._id);
        const technicianIds = technicians.map(t => t._id);
        
        const skillLevels = await SkillLevel.find({
            technicianId: { $in: technicianIds },
            productId: { $in: productIds }
        });

        // Create a map for quick lookup
        const skillMap = {};
        skillLevels.forEach(skill => {
            const key = `${skill.technicianId}_${skill.productId}`;
            skillMap[key] = skill;
        });

        res.json({ 
            success: true, 
            products,
            technicians,
            skillLevels: skillMap
        });
    } catch (error) {
        console.error('Error fetching skill matrix:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch skill matrix' });
    }
});

// POST /api/skills/levels - Set or update a skill level
router.post('/levels', isAuthenticated, async (req, res) => {
    try {
        const { technicianId, productId, level, notes } = req.body;
        
        if (!technicianId || !productId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Technician and product are required' 
            });
        }

        if (!['bad', 'ok', 'good'].includes(level)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid skill level. Must be bad, ok, or good' 
            });
        }

        const updatedBy = req.session.user.email || req.session.user.username;

        const skillLevel = await SkillLevel.findOneAndUpdate(
            { technicianId, productId },
            { level, notes, updatedBy },
            { new: true, upsert: true, runValidators: true }
        );

        res.json({ success: true, message: 'Skill level updated successfully', skillLevel });
    } catch (error) {
        console.error('Error updating skill level:', error);
        res.status(500).json({ success: false, message: 'Failed to update skill level' });
    }
});

// DELETE /api/skills/levels/:technicianId/:productId - Delete a skill level
router.delete('/levels/:technicianId/:productId', isAuthenticated, async (req, res) => {
    try {
        const { technicianId, productId } = req.params;
        
        const skillLevel = await SkillLevel.findOneAndDelete({ technicianId, productId });
        
        if (!skillLevel) {
            return res.status(404).json({ success: false, message: 'Skill level not found' });
        }

        res.json({ success: true, message: 'Skill level deleted successfully' });
    } catch (error) {
        console.error('Error deleting skill level:', error);
        res.status(500).json({ success: false, message: 'Failed to delete skill level' });
    }
});

module.exports = router;
