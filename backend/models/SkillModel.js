const mongoose = require('mongoose');

// Category Schema
const categorySchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        unique: true,
        trim: true
    },
    description: String,
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Product Schema
const productSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SkillCategory',
        required: true
    },
    description: String,
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Compound index to ensure product names are unique within a category
productSchema.index({ name: 1, categoryId: 1 }, { unique: true });

// Skill Level Schema - tracks technician proficiency in specific products
const skillLevelSchema = new mongoose.Schema({
    technicianId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Technician',
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SkillProduct',
        required: true
    },
    level: {
        type: String,
        enum: ['bad', 'ok', 'good'],
        default: 'ok'
    },
    notes: String,
    lastUpdated: { 
        type: Date, 
        default: Date.now 
    },
    updatedBy: String // Username or email of who updated this
});

// Compound index to ensure one skill level per technician per product
skillLevelSchema.index({ technicianId: 1, productId: 1 }, { unique: true });

// Update lastUpdated on save
skillLevelSchema.pre('save', function(next) {
    this.lastUpdated = Date.now();
    next();
});

const SkillCategory = mongoose.model('SkillCategory', categorySchema);
const SkillProduct = mongoose.model('SkillProduct', productSchema);
const SkillLevel = mongoose.model('SkillLevel', skillLevelSchema);

module.exports = {
    SkillCategory,
    SkillProduct,
    SkillLevel
};
