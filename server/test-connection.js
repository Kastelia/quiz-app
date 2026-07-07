const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const uri = process.env.MONGODB_URI;
console.log('🔍 Testing connection...');

mongoose.connect(uri)
  .then(() => {
    console.log('✅ Connection successful!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  });
