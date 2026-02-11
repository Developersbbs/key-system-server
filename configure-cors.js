require('dotenv').config();
const { Storage } = require('@google-cloud/storage');

async function configureCors() {
    console.log('--- Configuring CORS for Firebase Storage ---');

    let serviceAccount;
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } else {
            console.error('❌ FIREBASE_SERVICE_ACCOUNT not found in .env');
            return;
        }
    } catch (e) {
        console.error('❌ Failed to parse credentials:', e.message);
        return;
    }

    const storage = new Storage({
        projectId: serviceAccount.project_id,
        credentials: {
            client_email: serviceAccount.client_email,
            private_key: serviceAccount.private_key,
        },
    });

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
        console.error('❌ FIREBASE_STORAGE_BUCKET not set in .env');
        return;
    }

    const bucket = storage.bucket(bucketName);

    try {
        console.log(`Setting CORS for bucket: ${bucketName}...`);

        await bucket.setCorsConfiguration([
            {
                maxAgeSeconds: 3600,
                method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
                origin: ['*'], // Allow all origins for simplicity, or restrict to specific domains
                responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'User-Agent', 'x-goog-resumable'],
            },
        ]);

        console.log('✅ CORS configuration updated successfully!');
        console.log('Origin: *');
        console.log('Methods: GET, POST, PUT, DELETE, OPTIONS, HEAD');
    } catch (e) {
        console.error('❌ Failed to set CORS configuration:', e.message);
    }
}

configureCors();
