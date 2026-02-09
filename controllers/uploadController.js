const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Get environment variables with fallbacks
const getEnvVar = (primaryKey, fallbackKey, defaultValue = null) => {
    return process.env[primaryKey] || process.env[fallbackKey] || defaultValue;
};

// Get environment variables
const AWS_REGION = getEnvVar('AWS_S3_REGION', 'AWS_REGION', 'us-east-1');
const AWS_BUCKET_NAME = getEnvVar('AWS_S3_BUCKET_NAME', 'AWS_BUCKET_NAME', 'keysystems123');
const AWS_ACCESS_KEY_ID = getEnvVar('AWS_ACCESS_KEY_ID', null);
const AWS_SECRET_ACCESS_KEY = getEnvVar('AWS_SECRET_ACCESS_KEY', null);

console.log("Upload Controller - Resolved environment variables:");
console.log("Region:", AWS_REGION);
console.log("Bucket:", AWS_BUCKET_NAME);
console.log("Access Key:", AWS_ACCESS_KEY_ID ? "Present" : "Missing");
console.log("Secret Key:", AWS_SECRET_ACCESS_KEY ? "Present" : "Missing");

// Initialize S3 client
let s3;
if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
    try {
        s3 = new S3Client({
            region: AWS_REGION,
            credentials: {
                accessKeyId: AWS_ACCESS_KEY_ID,
                secretAccessKey: AWS_SECRET_ACCESS_KEY,
            },
        });
        console.log("✅ S3 Client initialized successfully");
    } catch (error) {
        console.error("❌ Failed to initialize S3 client:", error);
    }
} else {
    console.warn("⚠️ AWS credentials not configured. Upload functionality will be limited.");
}

// Meeting Uploads (MOM, Proof, Attendance Photos)
exports.generateMeetingUploadUrl = async (req, res) => {
    try {
        const { fileName, fileType, fileSize, type } = req.body; // type: 'mom', 'proof', or 'attendance'

        if (!fileName || !fileType || !type) {
            return res.status(400).json({ message: "File name, type, and upload type are required" });
        }

        // Validate type
        if (!['mom', 'proof', 'attendance'].includes(type)) {
            return res.status(400).json({ message: "Invalid upload type. Must be 'mom', 'proof', or 'attendance'" });
        }

        // File size validation (10MB limit)
        if (fileSize && fileSize > 10 * 1024 * 1024) {
            return res.status(400).json({ message: "File size exceeds 10MB limit" });
        }

        // Validate file type for attendance photos
        if (type === 'attendance' && !fileType.startsWith('image/')) {
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
        const key = `${folder}/${timestamp}-${randomString}-${sanitizedFileName}`;

        if (!s3) {
            return res.status(500).json({ message: "S3 client not initialized. Please configure AWS credentials." });
        }

        const command = new PutObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key: key,
            ContentType: fileType,
            ...(req.user && {
                Metadata: {
                    'uploaded-by': req.user._id.toString(),
                    'upload-type': `meeting-${type}`
                }
            })
        });

        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes
        const finalUrl = `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;

        res.json({
            uploadUrl,
            finalUrl,
            success: true,
            message: 'Presigned URL generated successfully'
        });
    } catch (err) {
        console.error("❌ Meeting upload presign error:", err);
        res.status(500).json({
            message: "Failed to generate upload URL",
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
};

console.log("✅ Upload controller loaded successfully");

// console.log("🔧 Loading uploadController...");

// // Debug environment variables at load time
// console.log("Environment variables at controller load:");
// console.log("AWS_S3_REGION:", process.env.AWS_S3_REGION);
// console.log("AWS_S3_BUCKET_NAME:", process.env.AWS_S3_BUCKET_NAME);
// console.log("AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID ? "Present" : "Missing");
// console.log("AWS_SECRET_ACCESS_KEY:", process.env.AWS_SECRET_ACCESS_KEY ? "Present" : "Missing");

// const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
// const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// // Function to get environment variables with fallbacks
// const getEnvVar = (primaryKey, fallbackKey, defaultValue = null) => {
//   return process.env[primaryKey] || process.env[fallbackKey] || defaultValue;
// };

// // Get environment variables with fallbacks
// const AWS_REGION = getEnvVar('AWS_S3_REGION', 'AWS_REGION', 'us-east-1');
// const AWS_BUCKET_NAME = getEnvVar('AWS_S3_BUCKET_NAME', 'AWS_BUCKET_NAME', 'keysystems123');
// const AWS_ACCESS_KEY_ID = getEnvVar('AWS_ACCESS_KEY_ID', null);
// const AWS_SECRET_ACCESS_KEY = getEnvVar('AWS_SECRET_ACCESS_KEY', null);

// console.log("Resolved environment variables:");
// console.log("Region:", AWS_REGION);
// console.log("Bucket:", AWS_BUCKET_NAME);
// console.log("Access Key:", AWS_ACCESS_KEY_ID ? "Present" : "Missing");
// console.log("Secret Key:", AWS_SECRET_ACCESS_KEY ? "Present" : "Missing");

// // Only check for absolutely required variables
// if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
//   const missing = [];
//   if (!AWS_ACCESS_KEY_ID) missing.push('AWS_ACCESS_KEY_ID');
//   if (!AWS_SECRET_ACCESS_KEY) missing.push('AWS_SECRET_ACCESS_KEY');

//   console.error('❌ Missing critical AWS credentials:', missing);
//   throw new Error(`Missing critical AWS credentials: ${missing.join(', ')}`);
// }

// // Initialize S3 client
// let s3;
// try {
//   s3 = new S3Client({
//     region: AWS_REGION,
//     credentials: {
//       accessKeyId: AWS_ACCESS_KEY_ID,
//       secretAccessKey: AWS_SECRET_ACCESS_KEY,
//     },
//   });
//   console.log("✅ S3 Client initialized successfully");
// } catch (error) {
//   console.error("❌ Failed to initialize S3 client:", error);
//   throw error;
// }

// // ✅ QR Code upload
// exports.generateQRCodeUrl = async (req, res) => {
//   try {
//     console.log('📤 QR Code upload request:', req.body);

//     const { fileName, fileType, fileSize } = req.body;

//     // Validation
//     if (!fileName || !fileType) {
//       return res.status(400).json({ 
//         message: "File name and type are required",
//         received: { fileName, fileType }
//       });
//     }

//     // File size validation (5MB limit)
//     if (fileSize && fileSize > 5 * 1024 * 1024) {
//       return res.status(400).json({ message: "File size exceeds 5MB limit" });
//     }

//     // Validate file type
//     if (!fileType.startsWith('image/')) {
//       return res.status(400).json({ message: "Only image files are allowed" });
//     }

//     // Generate unique key
//     const timestamp = Date.now();
//     const randomString = Math.random().toString(36).substring(2, 15);
//     const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
//     const key = `qr-codes/${timestamp}-${randomString}-${sanitizedFileName}`;

//     console.log('🔑 Generated S3 key:', key);
//     console.log('🪣 Using bucket:', AWS_BUCKET_NAME);
//     console.log('🌍 Using region:', AWS_REGION);

//     const command = new PutObjectCommand({
//       Bucket: AWS_BUCKET_NAME,
//       Key: key,
//       ContentType: fileType,
//       // Add metadata if user is available
//       ...(req.user && {
//         Metadata: {
//           'uploaded-by': req.user._id.toString(),
//           'upload-type': 'qr-code'
//         }
//       })
//     });

//     // Generate presigned URL (1 minute expiry)
//     const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
//     const finalUrl = `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;

//     console.log('✅ Generated URLs successfully');

//     res.json({ 
//       uploadUrl, 
//       finalUrl,
//       success: true,
//       message: 'Presigned URL generated successfully'
//     });

//   } catch (err) {
//     console.error("❌ QR Code presign error:", err);
//     res.status(500).json({ 
//       message: "Failed to generate upload URL",
//       error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
//     });
//   }
// };

// // ✅ Payment Proof upload
// exports.generatePaymentProofUrl = async (req, res) => {
//   try {
//     const { fileName, fileType, fileSize } = req.body;

//     if (!fileName || !fileType) {
//       return res.status(400).json({ message: "File name and type are required" });
//     }

//     // File size validation (10MB limit for payment proofs)
//     if (fileSize && fileSize > 10 * 1024 * 1024) {
//       return res.status(400).json({ message: "File size exceeds 10MB limit" });
//     }

//     const timestamp = Date.now();
//     const randomString = Math.random().toString(36).substring(2, 15);
//     const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
//     const key = `payment-proofs/${timestamp}-${randomString}-${sanitizedFileName}`;

//     const command = new PutObjectCommand({
//       Bucket: AWS_BUCKET_NAME,
//       Key: key,
//       ContentType: fileType,
//       ...(req.user && {
//         Metadata: {
//           'uploaded-by': req.user._id.toString(),
//           'upload-type': 'payment-proof'
//         }
//       })
//     });

//     const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
//     const finalUrl = `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;

//     res.json({ uploadUrl, finalUrl });
//   } catch (err) {
//     console.error("❌ Payment proof presign error:", err);
//     res.status(500).json({ message: "Failed to generate upload URL" });
//   }
// };

// // ✅ Video Upload (admin only)
// exports.generateVideoUploadUrl = async (req, res) => {
//   try {
//     const { fileName, fileType, fileSize } = req.body;

//     if (!fileName || !fileType) {
//       return res.status(400).json({ message: "File name and type are required" });
//     }

//     // File size validation (100MB limit for videos)
//     if (fileSize && fileSize > 100 * 1024 * 1024) {
//       return res.status(400).json({ message: "File size exceeds 100MB limit" });
//     }

//     const timestamp = Date.now();
//     const randomString = Math.random().toString(36).substring(2, 15);
//     const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
//     const key = `videos/${timestamp}-${randomString}-${sanitizedFileName}`;

//     const command = new PutObjectCommand({
//       Bucket: AWS_BUCKET_NAME,
//       Key: key,
//       ContentType: fileType,
//       ...(req.user && {
//         Metadata: {
//           'uploaded-by': req.user._id.toString(),
//           'upload-type': 'video'
//         }
//       })
//     });

//     const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 mins for larger files
//     const finalUrl = `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;

//     res.json({ uploadUrl, finalUrl });
//   } catch (err) {
//     console.error("❌ Video presign error:", err);
//     res.status(500).json({ message: "Failed to generate upload URL" });
//   }
// };

// // ✅ Test route
// exports.testUploadRoute = (req, res) => {
//   res.json({
//     message: "Upload routes are working!",
//     timestamp: new Date().toISOString(),
//     environment: {
//       region: AWS_REGION,
//       bucket: AWS_BUCKET_NAME,
//       hasAccessKey: !!AWS_ACCESS_KEY_ID,
//       hasSecretKey: !!AWS_SECRET_ACCESS_KEY
//     },
//     debug: {
//       allAwsEnvVars: Object.keys(process.env).filter(key => key.includes('AWS')),
//       nodeEnv: process.env.NODE_ENV,
//       cwd: process.cwd()
//     },
//     availableMethods: [
//       "generatePaymentProofUrl",
//       "generateQRCodeUrl", 
//       "generateVideoUploadUrl",
//     ],
//   });
// };

// // ✅ Meeting Uploads (MOM & Proof)
exports.generateMeetingUploadUrl = async (req, res) => {
    try {
        const { fileName, fileType, fileSize, type } = req.body; // type: 'mom' or 'proof'

        if (!fileName || !fileType || !type) {
            return res.status(400).json({ message: "File name, type, and upload type are required" });
        }

        // validate type
        if (!['mom', 'proof'].includes(type)) {
            return res.status(400).json({ message: "Invalid upload type" });
        }

        // File size validation (10MB limit)
        if (fileSize && fileSize > 10 * 1024 * 1024) {
            return res.status(400).json({ message: "File size exceeds 10MB limit" });
        }

        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

        // Folder structure: meeting-moms/ or meeting-proofs/
        const folder = type === 'mom' ? 'meeting-moms' : 'meeting-proofs';
        const key = `${folder}/${timestamp}-${randomString}-${sanitizedFileName}`;

        const command = new PutObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key: key,
            ContentType: fileType,
            ...(req.user && {
                Metadata: {
                    'uploaded-by': req.user._id.toString(),
                    'upload-type': `meeting-${type}`
                }
            })
        });

        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
        const finalUrl = `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;

        res.json({ uploadUrl, finalUrl });
    } catch (err) {
        console.error("❌ Meeting upload presign error:", err);
        res.status(500).json({ message: "Failed to generate upload URL" });
    }
};


console.log("✅ Upload controller loaded successfully");