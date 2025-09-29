// app.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { v4: uuidv4 } = require('uuid');

// Import Routes
const authRouter = require("./routes/authRouter");
const adminRouter = require("./routes/adminRouter");
const memberRouter = require("./routes/memberRouter");
const courseRouter = require('./routes/courseRouter');
const levelRouter = require('./routes/levelRouter');
const batchRouter = require('./routes/batchRouter');
const mcqRoutes = require('./routes/mcqsRouter');
const eventRouter = require('./routes/eventRouter');
const meetingRouter = require('./routes/meetingRouter');
const listingRouter = require('./routes/listingRouter');
const googleAuthRouter = require('./routes/googleAuthRouter');
const transactionRouter = require('./routes/transactionRouter');
// const uploadRouter = require('./routes/uploadRouter'); 
const userRouter = require('./routes/userRouter');
const announcementRouter = require('./routes/announcementRouter');

// Import Middleware
const auth = require('./middlewares/auth');
const allowRoles = require('./middlewares/allowRoles');

const app = express();
console.log("🔧 Server starting...");

// ===== Middleware =====
app.use(express.json({ limit: '10mb' })); // Increase limit if needed for JSON
app.use(cookieParser());

app.use(
  cors({
    origin:"https://keysystem.in || http://localhost:5173 || http://www.keysystem.in || * ",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Add logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

console.log("📦 Loading AWS dependencies...");

// ===== AWS S3 Setup =====
// console.log("✅ AWS SDK loaded successfully");
// console.log("📋 Environment check:", {
//   hasS3Region: !!process.env.AWS_S3_REGION,
//   hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
//   hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
//   hasBucketName: !!process.env.AWS_S3_BUCKET_NAME
// });

// // Reusable S3 client
// const { S3Client } = require('@aws-sdk/client-s3');
// const s3Client = new S3Client({
//   region: process.env.AWS_S3_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

// Make s3Client available globally (or better: pass via DI)
// global.s3Client = s3Client;
// console.log("🗄️  S3 Client created successfully");

// ===== MongoDB Connection =====
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// ===== Routes =====
console.log("🛤️  Registering routes...");
app.use("/api/auth", authRouter);   
app.use("/api/admin", adminRouter); 
app.use("/api/member", memberRouter); 
app.use('/api/courses', courseRouter);
app.use('/api/levels', levelRouter); 
app.use('/api/batches', batchRouter);
app.use('/api/events', eventRouter);
app.use('/api/listings', listingRouter);
app.use('/api/meetings', meetingRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/chapters/:chapterId/mcqs', mcqRoutes);
// app.use('/api/uploads', uploadRouter); // ✅ Only this line for uploads
app.use('/api/users', userRouter);
app.use('/api/announcements', announcementRouter); // ✅ Add this line
app.use('/api/auth/google', googleAuthRouter);

// ===== Default Route =====
app.get("/", (req, res) => {
  res.send("🚀 API is running");
});

// List all routes for debugging
app.get("/api/debug/routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    }
  });
  res.json({ routes });
});

// ===== 404 Handler =====
app.use((req, res, next) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    message: `Route ${req.method} ${req.path} not found`,
    suggestion: "Check if the route is properly registered"
  });
});


// ===== Error Handler =====
app.use((err, req, res, next) => {
  console.error("❌ Unhandled Error:", err);
  res.status(500).json({ message: "Internal server error", error: err.message });
});

// ===== Start Server =====
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 Test your upload route: http://localhost:${PORT}/api/uploads/test`);
  console.log(`🔗 Debug routes: http://localhost:${PORT}/api/debug/routes`);
});