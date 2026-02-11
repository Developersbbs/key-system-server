require('dotenv').config();
const { Storage } = require('@google-cloud/storage');

async function testFirebase() {
    console.log('--- Firebase Storage Bucket List Test ---');

    let serviceAccount;
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            console.log('✅ Credential parsing successful');
            console.log('Project ID:', serviceAccount.project_id);
            console.log('Client Email:', serviceAccount.client_email);
        } else {
            console.error('❌ FIREBASE_SERVICE_ACCOUNT not found in .env');
            return;
        }
    } catch (e) {
        console.error('❌ Failed to parse credentials:', e.message);
        return;
    }

    // Initialize Storage client directly
    const storage = new Storage({
        projectId: serviceAccount.project_id,
        credentials: {
            client_email: serviceAccount.client_email,
            private_key: serviceAccount.private_key,
        },
    });

    try {
        console.log('🔍 Listing buckets using @google-cloud/storage...');
        const [buckets] = await storage.getBuckets();

        if (buckets.length === 0) {
            console.log('❌ No buckets found for this project.');
            console.log('Please create a Storage bucket in the Firebase Console.');
        } else {
            console.log(`✅ Found ${buckets.length} buckets:`);
            buckets.forEach(b => console.log(` - ${b.name}`));

            console.log('\n💡 Recommended Action:');
            console.log(`Add this to your .env file:\nFIREBASE_STORAGE_BUCKET=${buckets[0].name}`);
        }

    } catch (e) {
        console.error('❌ Error listing buckets:', e.message);
        if (e.code === 403) {
            console.log('❌ Permission denied. The service account likely needs "Storage Admin" or "Storage Viewer" role.');
        }
    }
}

testFirebase();
