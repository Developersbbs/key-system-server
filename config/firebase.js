const admin = require('firebase-admin');

let serviceAccount;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // ✅ Parse JSON string from environment variable
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // ✅ Fallback for local dev (if you still use the JSON file)
    serviceAccount = require('./key-systems-client-98765-firebase-adminsdk-fbsvc-718de2ab59.json');
  }
} catch (err) {
  console.error('Failed to load Firebase credentials:', err);
  throw err;
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
