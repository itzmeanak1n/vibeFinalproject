const express = require('express');
const router = express.Router();
const multer = require('multer');

// Debug: Log all registered routes
console.log('Registering student routes...');

// Debug route to list all registered routes
router.get('/_routes', (req, res) => {
  const routes = [];
  
  // Iterate through all registered routes
  router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Routes registered directly on the router
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods).map(m => m.toUpperCase())
      });
    } else if (middleware.name === 'router') {
      // Nested routers
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods).map(m => m.toUpperCase())
          });
        }
      });
    }
  });
  
  res.json({ routes });
});

// Test route to verify router is working
router.get('/test', (req, res) => {
  console.log('Test route hit!');
  res.json({ success: true, message: 'Test route is working!' });
});
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const { pool } = require('../utils/db');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/profile_pics';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Images only! (jpeg|jpg|png|gif)');
    }
  }
});

// Get all places
router.get('/places', auth, async (req, res) => {
  try {
    const [places] = await pool.query('SELECT * FROM places ORDER BY placeName');
    res.json(places);
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถานที่' });
  }
});

// Get student profile
router.get('/profile', auth, async (req, res) => {
  try {
    const [students] = await pool.query(
      'SELECT * FROM tb_user WHERE studentId = ?',
      [req.user.id]
    );

    if (students.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลนักศึกษา' });
    }

    const student = students[0];
    delete student.userPass; // ไม่ส่งรหัสผ่านกลับไป

    res.json(student);
  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์' });
  }
});

// Update student profile
router.put('/profile', auth, upload.single('userProfilePic'), async (req, res) => {
  // Log the incoming request for debugging
  console.log('=== PROFILE UPDATE REQUEST RECEIVED ===');
  console.log('Content-Type:', req.get('Content-Type'));
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));
  console.log('Request body:', req.body);
  console.log('Uploaded file:', req.file ? {
    fieldname: req.file.fieldname,
    originalname: req.file.originalname,
    encoding: req.file.encoding,
    mimetype: req.file.mimetype,
    destination: req.file.destination,
    filename: req.file.filename,
    path: req.file.path,
    size: req.file.size
  } : 'No file uploaded');
  
  try {
    // Get data from request body or form-data
    let userData;
    if (req.body.userData) {
      try {
        userData = typeof req.body.userData === 'string' 
          ? JSON.parse(req.body.userData) 
          : req.body.userData;
      } catch (e) {
        console.error('Error parsing userData:', e);
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid user data format' 
        });
      }
    } else {
      userData = req.body;
    }
    
    const { userFirstname, userLastname, userEmail, userTel, userAddress } = userData || {};
    const studentId = req.user.id;
    
    // Validate required fields
    if (!userFirstname || !userLastname || !userEmail) {
      // If we uploaded a file but validation fails, delete it
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน' 
      });
    }
    
    console.log('Updating profile for student ID:', studentId);
    console.log('Form data:', { userFirstname, userLastname, userEmail, userTel, userAddress });
    
    // Get current profile data to check for existing profile picture
    const [currentProfile] = await pool.query(
      'SELECT userProfilePic FROM tb_user WHERE studentId = ?',
      [studentId]
    );
    
    console.log('Current profile from DB:', currentProfile[0]);
    
    let userProfilePic = currentProfile[0]?.userProfilePic || null;
    
    // If new file is uploaded
    if (req.file) {
      console.log('Processing new file upload...');
      // Delete old profile picture if it exists and is not the default
      if (userProfilePic && 
          !userProfilePic.includes('default-avatar')) {
            
        const oldFilePath = path.join(__dirname, '..', userProfilePic);
        console.log('Checking old file at path:', oldFilePath);
        
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
            console.log('Successfully deleted old profile picture:', userProfilePic);
          } catch (err) {
            console.error('Error deleting old profile picture:', err);
          }
        } else {
          console.log('Old profile picture not found at path, skipping deletion');
        }
      }
      
      // Store the relative path in the database
      userProfilePic = '/uploads/profile_pics/' + req.file.filename;
      console.log('Setting new profile picture path in DB:', userProfilePic);
    } else {
      console.log('No new file uploaded, keeping existing profile picture');
    }

    // Check if email is already used by another user
    const [existingUsers] = await pool.query(
      'SELECT studentId FROM tb_user WHERE userEmail = ? AND studentId != ?',
      [userEmail, studentId]
    );

    if (existingUsers.length > 0) {
      // If we uploaded a new file but email is duplicate, delete the uploaded file
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    // Log the values before executing the update query
    console.log('Executing UPDATE query with values:', {
      userFirstname,
      userLastname,
      userEmail,
      userTel,
      userAddress,
      userProfilePic,
      studentId
    });

    try {
      const [result] = await pool.query(
        'UPDATE tb_user SET userFirstname = ?, userLastname = ?, userEmail = ?, userTel = ?, userAddress = ?, userprofilePic = ? WHERE studentId = ?',
        [userFirstname, userLastname, userEmail, userTel, userAddress, userProfilePic, studentId]
      );
      
      console.log('Update result:', {
        affectedRows: result.affectedRows,
        changedRows: result.changedRows,
        message: result.message
      });

      if (result.affectedRows === 0) {
        console.error('No rows were updated. Student ID might not exist:', studentId);
        return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลนักศึกษา' });
      }

      // Get updated profile to return
      const [updatedProfile] = await pool.query(
        'SELECT studentId, userFirstname, userLastname, userEmail, userTel, userAddress, userprofilePic, role FROM tb_user WHERE studentId = ?',
        [studentId]
      );

      const profile = updatedProfile[0];
      if (!profile) {
        console.error('Failed to fetch updated profile for student ID:', studentId);
        return res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลโปรไฟล์ที่อัปเดตแล้วได้' });
      }
      
      console.log('Updated profile from DB:', profile);
      
      // Prepare response data
      const responseData = {
        success: true, 
        message: 'อัปเดตข้อมูลเรียบร้อยแล้ว',
        user: {
          studentId: profile.studentId,
          userFirstname: profile.userFirstname,
          userLastname: profile.userLastname,
          userEmail: profile.userEmail,
          userTel: profile.userTel,
          userAddress: profile.userAddress,
          userProfilePic: profile.userprofilePic, // Note: using the correct case from DB
          role: profile.role
        }
      };
      
      // Log the response data
      console.log('Sending response with profile:', responseData);
      
      // Send the response
      return res.json(responseData);
      
    } catch (dbError) {
      console.error('=== DATABASE ERROR DETAILS ===');
      console.error('Error message:', dbError.message);
      console.error('SQL Query:', dbError.sql);
      console.error('Error code:', dbError.code);
      console.error('SQL State:', dbError.sqlState);
      console.error('Error number:', dbError.errno);
      console.error('Stack trace:', dbError.stack);
      console.error('Database error during profile update:', dbError);
      
      // Delete the uploaded file if there was a database error
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
          console.log('Deleted uploaded file due to database error');
        } catch (fileError) {
          console.error('Error cleaning up uploaded file:', fileError);
        }
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลโปรไฟล์',
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }
  } catch (error) {
    console.error('=== ERROR UPDATING STUDENT PROFILE ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    console.error('Request file:', req.file);
    console.error('User ID:', req.user?.id);
    
    // Clean up uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      console.log('Cleaning up uploaded file:', req.file.path);
      try {
        fs.unlinkSync(req.file.path);
        console.log('Successfully cleaned up file');
      } catch (fileError) {
        console.error('Error cleaning up file:', fileError);
      }
    }
    
    // Send detailed error in development, generic in production
    const errorResponse = {
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack,
        code: error.code
      } : undefined
    };
    
    console.error('Sending error response:', errorResponse);
    res.status(500).json(errorResponse);
  }
});

// Create new trip
// In backend/routes/student.js, find the trip creation endpoint (around line 70)

router.post('/trips', auth, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { carType, placeIdPickUp, placeIdDestination, date, is_round_trip } = req.body;

    // ตรวจสอบข้อมูล
    if (!carType || !placeIdPickUp || !placeIdDestination || !date) {
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    // ตรวจสอบว่าสถานที่มีอยู่จริง
    const [places] = await pool.query(
      'SELECT placeId FROM places WHERE placeId IN (?, ?)',
      [placeIdPickUp, placeIdDestination]
    );

    if (places.length !== 2) {
      return res.status(400).json({ message: 'สถานที่ไม่ถูกต้อง' });
    }

    // สร้างรายการเดินทาง
    const now = new Date();
    console.log('Creating trip with data:', {
      studentId,
      carType,
      placeIdPickUp,
      placeIdDestination,
      date,
      is_round_trip,
      is_round_trip_type: typeof is_round_trip,
      is_round_trip_value: is_round_trip,
      createdAt: now.toISOString()
    });

    const [result] = await pool.query(
      'INSERT INTO trips (studentId, carType, placeIdPickUp, placeIdDestination, date, status, is_round_trip, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        studentId, 
        carType, 
        placeIdPickUp, 
        placeIdDestination, 
        date, 
        'pending', 
        is_round_trip ? 1 : 0, // แปลงเป็น 1 หรือ 0 สำหรับ MySQL
        now
      ]
    );
    
    console.log('Trip created with ID:', result.insertId);

    // ดึงข้อมูล trip ที่สร้างใหม่
    const [newTrip] = await pool.query(
      'SELECT * FROM trips WHERE tripId = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'สร้างรายการเดินทางเรียบร้อยแล้ว',
      trip: newTrip[0]
    });
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างรายการเดินทาง'
    });
  }
});

// Cancel a trip
router.put('/trips/:tripId/cancel', auth, async (req, res) => {
  try {
    const { tripId } = req.params;
    const studentId = req.user.id;
    
    console.log(`Canceling trip ${tripId} for student ${studentId}`);
    
    // Check if the trip exists and belongs to the student
    const [trips] = await pool.query(
      'SELECT * FROM trips WHERE tripId = ? AND studentId = ?',
      [tripId, studentId]
    );
    
    if (trips.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'ไม่พบรายการเดินทางหรือคุณไม่มีสิทธิ์ยกเลิก' 
      });
    }
    
    const trip = trips[0];
    
    // Check if the trip can be canceled (only pending or accepted trips can be canceled)
    if (trip.status === 'completed' || trip.status === 'cancelled' || trip.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถยกเลิกการเดินทางนี้ได้ เนื่องจากสถานะปัจจุบันไม่รองรับการยกเลิก'
      });
    }
    
    // Update the trip status to 'cancelled'
    const [result] = await pool.query(
      'UPDATE trips SET status = ? WHERE tripId = ?',
      ['cancelled', tripId]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('Failed to update trip status');
    }
    
    console.log(`Trip ${tripId} cancelled successfully`);
    
    // Get the updated trip
    const [updatedTrips] = await pool.query(
      'SELECT * FROM trips WHERE tripId = ?',
      [tripId]
    );
    
    res.json({
      success: true,
      message: 'ยกเลิกการจองเรียบร้อยแล้ว',
      trip: updatedTrips[0]
    });
    
  } catch (error) {
    console.error('Error canceling trip:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการยกเลิกการจอง',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get trips endpoint
router.get('/trips', auth, async (req, res) => {
  try {
    const studentId = req.user.id;
    
    const [trips] = await pool.query(`
      SELECT t.*, 
        p1.placeName as pickUpName, 
        p2.placeName as destinationName,
        t.is_round_trip as is_round_trip_db,
        CASE 
          WHEN t.is_round_trip = 1 THEN 'ไป-กลับ'
          ELSE 'เที่ยวเดียว'
        END as tripType
      FROM trips t
      LEFT JOIN places p1 ON t.placeIdPickUp = p1.placeId
      LEFT JOIN places p2 ON t.placeIdDestination = p2.placeId
      WHERE t.studentId = ?
      ORDER BY t.date DESC
    `, [studentId]);

    console.log('Trips from DB:', JSON.stringify(trips, null, 2));
    res.json(trips);
  } catch (error) {
    console.error('Get trips error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายการเดินทาง' });
  }
});

// Get rider details
router.get('/rider/:riderId', auth, async (req, res) => {
  try {
    const { riderId } = req.params;
    
    // ตรวจสอบรูปแบบของ riderId
    if (!riderId || typeof riderId !== 'string') {
      return res.status(400).json({ message: 'รหัสไรเดอร์ไม่ถูกต้อง' });
    }

    // ตรวจสอบก่อนว่ามีตาราง riders หรือไม่
    const [tables] = await pool.query(
      "SHOW TABLES LIKE 'riders'"
    );

    if (tables.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลไรเดอร์' });
    }

    // Get rider basic info including rating
    const [riders] = await pool.query(
      `SELECT 
        riderId, 
        riderFirstname, 
        riderLastname, 
        riderEmail, 
        riderTel,
        riderProfilePic,
        COALESCE(riderRate, 0) as riderRate
      FROM riders 
      WHERE riderId = ?`,
      [riderId]
    );

    if (riders.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลไรเดอร์' });
    }

    const rider = riders[0];

    // ตรวจสอบว่ามีตาราง ridervehical หรือไม่
    const [vehicleTables] = await pool.query(
      "SHOW TABLES LIKE 'ridervehical'"
    );

    let vehicles = [];
    if (vehicleTables.length > 0) {
      // Get rider's vehicles
      try {
        const [vehiclesData] = await pool.query(
          `SELECT 
            brand,
            model,
            plate
          FROM ridervehical 
          WHERE riderId = ?`,
          [riderId]
        );
        vehicles = vehiclesData;
      } catch (error) {
        console.error('Error fetching rider vehicles:', error);
        // ยังคงส่งข้อมูลไรเดอร์กลับไป แม้จะดึงข้อมูลรถไม่สำเร็จ
      }
    }

    // Add vehicles to rider object
    rider.vehicles = vehicles;

    res.json(rider);
  } catch (error) {
    console.error('Error fetching rider details:', error);
    
    // ตรวจสอบประเภทของ error
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('Table does not exist:', error.sqlMessage);
      return res.status(404).json({ 
        message: 'ไม่พบข้อมูลไรเดอร์',
        error: 'ตารางข้อมูลไม่พบ'
      });
    }
    
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลไรเดอร์',
      error: error.message
    });
  }
});

// Rate a trip
router.put('/trips/:tripId/rate', auth, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { rating } = req.body;
    const studentId = req.user.id;

    // Validate rating
    if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false,
        message: 'คะแนนต้องอยู่ระหว่าง 1-5'
      });
    }

    // Check if trip exists and belongs to the student
    const [trips] = await pool.query(
      'SELECT * FROM trips WHERE tripId = ? AND studentId = ?',
      [tripId, studentId]
    );

    if (trips.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายการเดินทางนี้หรือคุณไม่มีสิทธิ์ให้คะแนน'
      });
    }

    const trip = trips[0];

    // Check if trip already has a rating
    if (trip.userRate) {
      return res.status(400).json({
        success: false,
        message: 'คุณได้ให้คะแนนการเดินทางนี้ไปแล้ว'
      });
    }

    // Check if trip is completed and has a rider assigned
    const [completedTrips] = await pool.query(
      'SELECT * FROM trips WHERE tripId = ? AND status = ? AND rider_id IS NOT NULL',
      [tripId, 'success']
    );

    if (completedTrips.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถให้คะแนนการเดินทางที่ยังไม่เสร็จสิ้นหรือไม่มีไรเดอร์'
      });
    }

    const completedTrip = completedTrips[0];

    // Update the trip with the rating
    await pool.query(
      'UPDATE trips SET userRate = ? WHERE tripId = ?',
      [rating, tripId]
    );

    // Update rider's average rating
    const riderId = completedTrip.rider_id;
    const [riderRatings] = await pool.query(
      'SELECT AVG(userRate) as avgRating FROM trips WHERE rider_id = ? AND userRate IS NOT NULL',
      [riderId]
    );

    const avgRating = parseFloat(riderRatings[0].avgRating).toFixed(2);
    
    await pool.query(
      'UPDATE riders SET riderRate = ? WHERE riderId = ?',
      [avgRating, riderId]
    );

    res.json({
      success: true,
      message: 'ให้คะแนนเรียบร้อยแล้ว',
      rating: parseFloat(rating)
    });
  } catch (error) {
    console.error('Rating error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการให้คะแนน',
      error: error.message
    });
  }
});

// Cancel a trip
router.put('/trips/:tripId/cancel', auth, async (req, res) => {
  const tripId = parseInt(req.params.tripId, 10);
  const studentId = req.user.id;

  if (isNaN(tripId)) {
    return res.status(400).json({ 
      success: false, 
      message: 'รหัสการจองไม่ถูกต้อง' 
    });
  }

  try {
    // Check if trip exists and belongs to the student
    const [trip] = await pool.query(
      'SELECT * FROM trips WHERE tripId = ? AND studentId = ?',
      [tripId, studentId]
    );

    if (!trip || trip.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'ไม่พบการจองทริปนี้หรือคุณไม่มีสิทธิ์ยกเลิก' 
      });
    }

    const tripData = trip[0];

    // Check if trip is already completed or cancelled
    if (tripData.status === 'completed' || tripData.status === 'cancelled') {
      return res.status(400).json({ 
        success: false, 
        message: 'ไม่สามารถยกเลิกทริปที่เสร็จสิ้นหรือถูกยกเลิกไปแล้ว' 
      });
    }

    // Update trip status to cancelled
    const [result] = await pool.query(
      'UPDATE trips SET status = ? WHERE tripId = ? AND studentId = ?',
      ['cancelled', tripId, studentId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Failed to update trip status');
    }

    res.json({ 
      success: true, 
      message: 'ยกเลิกการจองเรียบร้อยแล้ว',
      trip: {
        ...tripData,
        status: 'cancelled'
      }
    });
  } catch (error) {
    console.error('Error cancelling trip:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการยกเลิกการจอง' 
    });
  }
});

module.exports = router;