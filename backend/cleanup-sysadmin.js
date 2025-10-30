const mongoose = require('mongoose');
const UserModel = require('./models/UserModel');

// Check for hardcoded sysadmin users and optionally remove them
async function checkAndRemoveSysadminUsers() {
    try {
        // Find all users with sysadmin role
        const sysadminUsers = await UserModel.find({ role: 'sysadmin' });
        
        console.log(`Found ${sysadminUsers.length} sysadmin users:`);
        sysadminUsers.forEach(user => {
            console.log(`- ${user.firstName || 'Unknown'} ${user.lastName || ''} (${user.email || user.username})`);
            console.log(`  Username: ${user.username || 'None'}`);
            console.log(`  Email: ${user.email || 'None'}`);
            console.log(`  Approved: ${user.approved}`);
            console.log('  ---');
        });
        
        // Remove hardcoded sysadmin users (those with username but no email/firstName)
        const hardcodedUsers = sysadminUsers.filter(user => 
            user.username && (!user.email || (!user.firstName && !user.lastName))
        );
        
        if (hardcodedUsers.length > 0) {
            console.log(`\nRemoving ${hardcodedUsers.length} hardcoded sysadmin users...`);
            for (const user of hardcodedUsers) {
                console.log(`Removing: ${user.username}`);
                await UserModel.deleteOne({ _id: user._id });
            }
            console.log('✅ Hardcoded sysadmin users removed');
        } else {
            console.log('\n✅ No hardcoded sysadmin users found');
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Only run if called directly
if (require.main === module) {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/calendar';
    
    mongoose.connect(mongoUri)
        .then(async () => {
            console.log('Connected to MongoDB');
            await checkAndRemoveSysadminUsers();
            process.exit(0);
        })
        .catch(err => {
            console.error('MongoDB connection error:', err);
            process.exit(1);
        });
}

module.exports = { checkAndRemoveSysadminUsers };