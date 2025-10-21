const mongoose = require('mongoose');
const UserModel = require('./models/UserModel');

mongoose.connect('mongodb://localhost:27017/calendar', {})
  .then(async () => {
    console.log('Connected to database\n');
    
    const allUsers = await UserModel.find({});
    console.log('=== ALL USERS ===');
    console.log('Total users:', allUsers.length);
    allUsers.forEach(u => {
      console.log(`- ${u.firstName || ''} ${u.lastName || ''} (${u.email || u.username})`);
      console.log(`  Role: ${u.role}, Approved: ${u.approved}`);
    });
    
    console.log('\n=== PENDING USERS ===');
    const pending = await UserModel.find({ approved: false });
    console.log('Pending users count:', pending.length);
    pending.forEach(u => {
      console.log(`- ${u.firstName} ${u.lastName} (${u.email})`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
