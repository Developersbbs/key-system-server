const admin = require('firebase-admin');

// IMPORTANT: Download the service account key from Firebase console and place it in this directory
// with the exact name: 'key-systems-client-98765-firebase-adminsdk-fbsvc-718de2ab59.json'
const serviceAccount = require('./key-systems-client-98765-firebase-adminsdk-fbsvc-4418c96c99.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
