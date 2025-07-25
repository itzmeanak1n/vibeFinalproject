const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer middleware
const upload = multer();
app.use(upload.none());

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug middleware to log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Routes
const studentsRouter = require('./routes/students');
app.use('/api/students', studentsRouter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/riders', require('./routes/rider'));
app.use('/api/admin', require('./routes/admin'));

// Debug: Log all registered routes
console.log('Registered routes:');
studentsRouter.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log(`[${Object.keys(middleware.route.methods).join(', ').toUpperCase()}] /api/students${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    middleware.handle.stack.forEach((handler) => {
      if (handler.route) {
        console.log(`[${Object.keys(handler.route.methods).join(', ').toUpperCase()}] /api/students${handler.route.path}`);
      }
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 