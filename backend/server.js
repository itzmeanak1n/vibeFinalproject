const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import database connection
const { pool, checkConnection } = require('./utils/db');

// Make db available in routes
app.locals.db = pool;

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const healthRoutes = require('./routes/health');
const studentRoutes = require('./routes/students');
const riderRoutes = require('./routes/rider');
// const placesRoutes = require('./routes/places'); // ยังไม่ใช้

// --- สลับลำดับ Mount Routes --- 
app.use('/health', healthRoutes);
app.use('/api/admin', adminRoutes); // Specific
app.use('/api/students', studentRoutes); // Specific
app.use('/api/riders', riderRoutes);     // Specific
// app.use('/api/places', placesRoutes); // Specific - ยังไม่ใช้
app.use('/api', authRoutes); // General (Login/Register) - ไว้ท้ายสุด

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
});

const PORT = process.env.PORT || 5000;

// ตรวจสอบการเชื่อมต่อฐานข้อมูลก่อนเริ่มเซิร์ฟเวอร์
const startServer = async () => {
  try {
    // ตรวจสอบการเชื่อมต่อฐานข้อมูล
    const dbStatus = await checkConnection();
    
    if (dbStatus.success) {
      console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');
      
      // เริ่มต้นเซิร์ฟเวอร์
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 เซิร์ฟเวอร์ทำงานที่พอร์ต ${PORT}`);
        console.log(`📝 API URL: http://localhost:${PORT}`);
        console.log(`🔍 Health Check: http://localhost:${PORT}/health/db`);
      });
    } else {
      console.error('❌ ไม่สามารถเชื่อมต่อฐานข้อมูลได้:', dbStatus.error);
      process.exit(1); // จบการทำงานของโปรแกรม
    }
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการเริ่มต้นเซิร์ฟเวอร์:', error);
    process.exit(1); // จบการทำงานของโปรแกรม
  }
};

// เริ่มต้นเซิร์ฟเวอร์
startServer(); 