const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    key: { 
        type: String, 
        required: true,
        unique: true,
        trim: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Update timestamp on save
settingsSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Create or get existing model
let SettingsModel;
try {
    SettingsModel = mongoose.model('Settings');
} catch (error) {
    SettingsModel = mongoose.model('Settings', settingsSchema);
}

// Initialize default settings
async function initializeDefaultSettings() {
    try {
        console.log('Initializing default settings...');
        
        const defaultSettings = [
            {
                key: 'defaultUserRole',
                value: 'tekniker_mobil',
                description: 'Default role assigned to newly approved users'
            }
        ];
        
        for (const setting of defaultSettings) {
            const existing = await SettingsModel.findOne({ key: setting.key });
            if (!existing) {
                await SettingsModel.create(setting);
                console.log(`Created default setting: ${setting.key}`);
            } else {
                console.log(`Setting ${setting.key} already exists with value: ${existing.value}`);
            }
        }
        
        console.log('Default settings initialization complete');
    } catch (error) {
        console.error('Error initializing default settings:', error);
    }
}

// Helper function to get a setting value
async function getSetting(key, defaultValue = null) {
    try {
        const setting = await SettingsModel.findOne({ key });
        return setting ? setting.value : defaultValue;
    } catch (error) {
        console.error(`Error getting setting ${key}:`, error);
        return defaultValue;
    }
}

// Helper function to update a setting value
async function updateSetting(key, value, description = null) {
    try {
        const update = { value, updatedAt: Date.now() };
        if (description) {
            update.description = description;
        }
        
        const setting = await SettingsModel.findOneAndUpdate(
            { key },
            update,
            { new: true, upsert: true }
        );
        
        return setting;
    } catch (error) {
        console.error(`Error updating setting ${key}:`, error);
        throw error;
    }
}

module.exports = { 
    SettingsModel, 
    initializeDefaultSettings,
    getSetting,
    updateSetting
};
