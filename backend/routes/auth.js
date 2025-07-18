const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { pool } = require('../utils/db');
const { auth } = require('../middleware/auth');
const fs = require('fs');

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // สร้างโฟลเดอร์ uploads ถ้ายังไม่มี
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage, // เปลี่ยนไปใช้ diskStorage ที่กำหนดไว้ด้านบน
  limits: { fileSize: 5 * 1024 * 1024 }, // จำกัดขนาดไฟล์ไม่เกิน 5MB
});

// Student registration
router.post('/register/student', upload.single('userProfilePic'), async (req, res) => {
  const {
    studentId,
    nationalId,
    userFirstname,
    userLastname,
    userEmail,
    userPass,
    userTel,
    userAddress,
  } = req.body;
  
  const userProfilePic = req.file ? req.file.path : null;

  try {
    // Check if email already exists
    const [existingUser] = await pool.query(
      'SELECT * FROM tb_user WHERE userEmail = ?',
      [userEmail]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userPass, 10);

    // Insert user data
    const [result] = await pool.query(
      'INSERT INTO tb_user (studentId, nationalId, userFirstname, userLastname, userEmail, userPass, userTel, userAddress, userProfilePic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [studentId, nationalId, userFirstname, userLastname, userEmail, hashedPassword, userTel, userAddress, userProfilePic]
    );

    res.status(201).json({
      success: true,
      message: 'ลงทะเบียนสำเร็จ',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลงทะเบียน' });
  }
});

// Rider registration
router.post('/register/rider', upload.fields([
  { name: 'RiderProfilePic', maxCount: 1 },
  { name: 'RiderStudentCard', maxCount: 1 },
  { name: 'QRscan', maxCount: 1 },
  { name: 'riderLicense', maxCount: 1 }
]), async (req, res) => {
  console.log('Request body:', req.body);
  console.log('Content-Type:', req.get('Content-Type'));
  
  try {
    const {
      riderId,
      riderNationalId,
      riderFirstname,
      riderLastname,
      riderEmail,
      riderPass,
      riderTel,
      riderAddress
    } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!riderId || !riderNationalId || !riderFirstname || !riderLastname || !riderEmail || 
        !riderPass || !riderTel || !riderAddress) {
      return res.status(400).json({ 
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน' 
      });
    }

    // ตรวจสอบรูปแบบอีเมล
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(riderEmail)) {
      return res.status(400).json({ 
        success: false,
        message: 'รูปแบบอีเมลไม่ถูกต้อง' 
      });
    }

    // ตรวจสอบรหัสผ่าน
    if (riderPass.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' 
      });
    }

    // ตรวจสอบเบอร์โทรศัพท์
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(riderTel)) {
      return res.status(400).json({ 
        success: false,
        message: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง' 
      });
    }

    // ตรวจสอบว่ามีอีเมลซ้ำหรือไม่
    const [existingUser] = await pool.query(
      'SELECT * FROM riders WHERE riderEmail = ?',
      [riderEmail]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'อีเมลนี้ถูกใช้งานแล้ว' 
      });
    }

    // ตรวจสอบว่ามีไฟล์ที่จำเป็นถูกอัปโหลดหรือไม่
    if (!req.files || !req.files['RiderProfilePic'] || !req.files['RiderStudentCard'] || !req.files['riderLicense'] || !req.files['QRscan']) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาแนบไฟล์ที่จำเป็นทั้งหมด (รูปโปรไฟล์, บัตรนักศึกษา, ใบขับขี่, QR Code)'
      });
    }

    // เข้ารหัสรหัสผ่าน
    const hashedPassword = await bcrypt.hash(riderPass, 10);

    // เพิ่มข้อมูลไรเดอร์
    await pool.query(
      'INSERT INTO riders (riderId, riderNationalId, riderFirstname, riderLastname, riderEmail, riderPass, riderTel, riderAddress, RiderProfilePic, RiderStudentCard, riderLicense, QRscan, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "pending")',
      [riderId, riderNationalId, riderFirstname, riderLastname, riderEmail, hashedPassword, riderTel, riderAddress, req.files['RiderProfilePic'][0].path, req.files['RiderStudentCard'][0].path, req.files['riderLicense'][0].path, req.files['QRscan'][0].path]
    );

    res.status(201).json({
      success: true,
      message: 'ลงทะเบียนเรียบร้อยแล้ว กรุณารอการอนุมัติจากผู้ดูแลระบบ'
    });
  } catch (error) {
    console.error('Error registering rider:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาดในการลงทะเบียน' 
    });
  }
});

// Admin registration
router.post('/register/admin', async (req, res) => {
  const {
    studentId,
    nationalId,
    userFirstname,
    userLastname,
    userEmail,
    userPass,
    userTel,
    userAddress,
    adminKey,
  } = req.body;

  try {
    // ตรวจสอบ adminKey
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(400).json({ message: 'รหัสยืนยันแอดมินไม่ถูกต้อง' });
    }

    // Check if email already exists
    const [existingUser] = await pool.query(
      'SELECT * FROM tb_user WHERE userEmail = ?',
      [userEmail]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userPass, 10);

    // Insert admin data
    const [result] = await pool.query(
      'INSERT INTO tb_user (studentId, nationalId, userFirstname, userLastname, userEmail, userPass, userTel, userAddress, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "admin")',
      [studentId, nationalId, userFirstname, userLastname, userEmail, hashedPassword, userTel, userAddress]
    );

    res.status(201).json({
      success: true,
      message: 'ลงทะเบียนแอดมินสำเร็จ',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลงทะเบียน' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password, userType } = req.body;
  
  // เพิ่ม log ตรวจสอบข้อมูลที่ส่งมา
  console.log('=== Login Request ===');
  console.log('Email:', email);
  console.log('UserType:', userType);
  console.log('Request body:', req.body);

  try {
    let user;
    let table;
    let emailField;
    let passwordField;
    let idField;

    // Determine which table to query based on user type
    switch (userType) {
      case 'student':
        table = 'tb_user';
        emailField = 'userEmail';
        passwordField = 'userPass';
        idField = 'studentId';
        break;
      case 'rider':
        table = 'riders';
        emailField = 'riderEmail';
        passwordField = 'riderPass';
        idField = 'riderId';
        break;
      case 'admin':
        table = 'tb_user';
        emailField = 'userEmail';
        passwordField = 'userPass';
        idField = 'studentId';
        break;
      default:
        console.log('Invalid user type:', userType);
        return res.status(400).json({ message: 'ประเภทผู้ใช้ไม่ถูกต้อง' });
    }

    // Get user from database
    const [users] = await pool.query(
      `SELECT * FROM ${table} WHERE ${emailField} = ?`,
      [email]
    );

    console.log('Query result:', users);

    if (users.length === 0) {
      console.log('User not found');
      return res.status(401).json({ message: 'ข้อมูลไม่ถูกต้อง' });
    }

    user = users[0];
    console.log('Found user:', { ...user, [passwordField]: '***HIDDEN***' });

    // Check password
    const validPassword = await bcrypt.compare(password, user[passwordField]);
    console.log('Password validation result:', validPassword);

    if (!validPassword) {
      console.log('Invalid password');
      return res.status(401).json({ message: 'ข้อมูลไม่ถูกต้อง' });
    }

    // For riders, check if they're approved
    if (userType === 'rider') {
      console.log('Rider status:', user.status);
      if (user.status !== 'approved') {
        console.log('Rider not approved');
        return res.status(401).json({ message: 'บัญชีของคุณยังไม่ได้รับการอนุมัติ' });
      }
    }

    // For admin, check if user has admin role
    if (userType === 'admin' && user.role !== 'admin') {
      console.log('Not an admin user');
      return res.status(401).json({ message: 'คุณไม่มีสิทธิ์เข้าสู่ระบบในฐานะแอดมิน' });
    }

    // ถ้าผ่านการตรวจสอบทั้งหมด
    console.log('Login successful');
    
    // Create and sign token
    const token = jwt.sign(
      { 
        id: user[idField],
        userType,
        role: userType === 'student' ? user.role : userType
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user[idField],
        email: user[emailField],
        firstname: user[userType === 'student' || userType === 'admin' ? 'userFirstname' : 'riderFirstname'],
        lastname: user[userType === 'student' || userType === 'admin' ? 'userLastname' : 'riderLastname'],
        role: userType === 'student' ? user.role : userType
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
  }
});

// Get student profile
router.get('/student/profile', auth, async (req, res) => {
  try {
    const studentId = req.user.id;

    const [students] = await pool.query(
      'SELECT studentId, nationalId, userFirstname, userLastname, userEmail, userTel, userAddress FROM tb_user WHERE studentId = ?',
      [studentId]
    );

    if (students.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลนักศึกษา' });
    }

    res.json({
      success: true,
      profile: students[0]
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์' });
  }
});

// Get rider profile
router.get('/rider/profile', auth, async (req, res) => {
  try {
    const riderId = req.user.id;

    const [riders] = await pool.query(
      'SELECT riderId, riderNationalId, riderFirstname, riderLastname, riderEmail, riderTel, riderAddress, riderLicense, status, riderRate FROM riders WHERE riderId = ?',
      [riderId]
    );
    
    console.log('Rider profile data:', riders[0]); // Debug log

    if (riders.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ขับขี่' });
    }

    res.json({
      success: true,
      profile: riders[0]
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์' });
  }
});

// Get admin profile
router.get('/admin/profile', auth, async (req, res) => {
  try {
    const studentId = req.user.id;

    const [admins] = await pool.query(
      'SELECT studentId, nationalId, userFirstname, userLastname, userEmail, userTel, userAddress FROM tb_user WHERE studentId = ? AND role = "admin"',
      [studentId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลแอดมิน' });
    }

    res.json({
      success: true,
      profile: admins[0]
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์' });
  }
});

// ในส่วนของ getRiders
router.get('/riders', async (req, res) => {
  try {
    const [riders] = await pool.query(`
      SELECT r.*, 
             v.carId, v.carType, v.plate, v.brand, v.model, v.carPhoto, v.insurancePhoto
      FROM riders r
      LEFT JOIN vehicles v ON r.riderId = v.riderId
      ORDER BY r.riderId DESC
    `);

    // จัดกลุ่มข้อมูลรถตามไรเดอร์
    const groupedRiders = riders.reduce((acc, row) => {
      if (!acc[row.riderId]) {
        acc[row.riderId] = {
          ...row,
          vehicles: []
        };
        delete acc[row.riderId].carId;
        delete acc[row.riderId].carType;
        delete acc[row.riderId].plate;
        delete acc[row.riderId].brand;
        delete acc[row.riderId].model;
        delete acc[row.riderId].carPhoto;
        delete acc[row.riderId].insurancePhoto;
      }
      if (row.carId) {
        acc[row.riderId].vehicles.push({
          carId: row.carId,
          carType: row.carType,
          plate: row.plate,
          brand: row.brand,
          model: row.model,
          carPhoto: row.carPhoto,
          insurancePhoto: row.insurancePhoto
        });
      }
      return acc;
    }, {});

    res.json(Object.values(groupedRiders));
  } catch (error) {
    console.error('Error fetching riders:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลไรเดอร์' });
  }
});

// ในส่วนของ getRiderById
router.get('/riders/:id', async (req, res) => {
  try {
    const [riders] = await pool.query(`
      SELECT r.*, 
             v.carId, v.carType, v.plate, v.brand, v.model, v.carPhoto, v.insurancePhoto
      FROM riders r
      LEFT JOIN vehicles v ON r.riderId = v.riderId
      WHERE r.riderId = ?
    `, [req.params.id]);

    if (riders.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลไรเดอร์' });
    }

    // จัดกลุ่มข้อมูลรถ
    const rider = {
      ...riders[0],
      vehicles: []
    };

    delete rider.carId;
    delete rider.carType;
    delete rider.plate;
    delete rider.brand;
    delete rider.model;
    delete rider.carPhoto;
    delete rider.insurancePhoto;

    riders.forEach(row => {
      if (row.carId) {
        rider.vehicles.push({
          carId: row.carId,
          carType: row.carType,
          plate: row.plate,
          brand: row.brand,
          model: row.model,
          carPhoto: row.carPhoto,
          insurancePhoto: row.insurancePhoto
        });
      }
    });

    res.json(rider);
  } catch (error) {
    console.error('Error fetching rider:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลไรเดอร์' });
  }
});

module.exports = router; 