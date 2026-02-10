const admin = require('../config/firebase');
const { bucket } = require('../config/firebase');

console.log("Upload Controller - Firebase Storage initialized");
console.log("Bucket:", bucket.name);

// Meeting Uploads (MOM, Proof, Attendance Photos)
exports.generateMeetingUploadUrl = async (req, res) => {
    try {
        console.log("📤 Meeting upload request received");
        console.log("Request body:", req.body);
        console.log("User:", req.user ? req.user._id : "No user");

        const { fileName, fileType, fileSize, type } = req.body; // type: 'mom', 'proof', or 'attendance'

        if (!fileName || !fileType || !type) {
            console.log("❌ Missing required fields:", { fileName, fileType, type });
            return res.status(400).json({ message: "File name, type, and upload type are required" });
        }

        // Validate type
        if (!['mom', 'proof', 'attendance'].includes(type)) {
            console.log("❌ Invalid type:", type);
            return res.status(400).json({ message: "Invalid upload type. Must be 'mom', 'proof', or 'attendance'" });
        }

        // File size validation (10MB limit)
        if (fileSize && fileSize > 10 * 1024 * 1024) {
            console.log("❌ File too large:", fileSize);
            return res.status(400).json({ message: "File size exceeds 10MB limit" });
        }

        // Validate file type for attendance photos
        if (type === 'attendance' && !fileType.startsWith('image/')) {
            console.log("❌ Invalid file type for attendance:", fileType);
            return res.status(400).json({ message: "Attendance photos must be image files" });
        }

        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

        // Folder structure based on type
        const folderMap = {
            'mom': 'meeting-moms',
            'proof': 'meeting-proofs',
            'attendance': 'attendance-photos'
        };
        const folder = folderMap[type];
        const filePath = `${folder}/${timestamp}-${randomString}-${sanitizedFileName}`;

        console.log("Generated Firebase Storage path:", filePath);

        // Create a file reference in Firebase Storage
        const file = bucket.file(filePath);
        console.log("📝 File reference created, generating write URL...");

        // Generate a signed URL for uploading (v4 signing)
        const [uploadUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 5 * 60 * 1000, // 5 minutes
            contentType: fileType,
        });
        console.log("✅ Write URL generated, generating read URL...");

        // Generate a signed URL for reading (7 days - Firebase maximum)
        const [finalUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days (Firebase maximum)
        });
        console.log("✅ Read URL generated");


        console.log("✅ Firebase Storage URLs generated successfully");
        res.json({
            uploadUrl,
            finalUrl,
            success: true,
            message: 'Presigned URL generated successfully'
        });
    } catch (err) {
        console.error("❌ Meeting upload presign error:", err);
        console.error("Error stack:", err.stack);
        res.status(500).json({
            message: "Failed to generate upload URL",
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
};

console.log("✅ Upload controller loaded successfully");