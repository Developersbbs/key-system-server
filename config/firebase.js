const admin = require('firebase-admin');

let serviceAccount;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // ✅ Parse JSON string from environment variable
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('✅ Using Firebase credentials from environment variable');
  } else {
    // ✅ Fallback for local dev (if you still use the JSON file)
    try {
      serviceAccount = require('./key-systems-client-98765-firebase-adminsdk-fbsvc-718de2ab59.json');
      console.log('✅ Using Firebase credentials from local JSON file');
    } catch (fileErr) {
      console.error('❌ Firebase service account not found. Please set FIREBASE_SERVICE_ACCOUNT environment variable or add the JSON file to config directory.');
      throw new Error('Firebase credentials not configured');
    }
  }
} catch (err) {
  console.error('Failed to load Firebase credentials:', err);
  throw err;
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'key-systems-client-98765.appspot.com'
});

// Initialize Storage bucket
const bucket = admin.storage().bucket();

module.exports = admin;
module.exports.bucket = bucket;
