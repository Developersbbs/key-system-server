// MongoDB Initialization Script
// This script runs when MongoDB container starts for the first time

// Switch to the application database
db = db.getSiblingDB('keydb');

// Create a user for the application (optional - you can use root user)
db.createUser({
  user: 'appuser',
  pwd: 'apppassword',
  roles: [
    {
      role: 'readWrite',
      db: 'keydb'
    }
  ]
});

// Create some initial collections (optional)
db.createCollection('users');
db.createCollection('courses');
db.createCollection('batches');

print('Database initialized successfully!');
