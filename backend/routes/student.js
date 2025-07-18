const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { pool } = require('../utils/db');

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
router.put('/profile', auth, async (req, res) => {
  try {
    const { userFirstname, userLastname, userEmail, userTel, userAddress } = req.body;
    const studentId = req.user.id;

    // Check if email is already used by another user
    const [existingUsers] = await pool.query(
      'SELECT studentId FROM tb_user WHERE userEmail = ? AND studentId != ?',
      [userEmail, studentId]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    // Update profile
    await pool.query(
      'UPDATE tb_user SET userFirstname = ?, userLastname = ?, userEmail = ?, userTel = ?, userAddress = ? WHERE studentId = ?',
      [userFirstname, userLastname, userEmail, userTel, userAddress, studentId]
    );

    res.json({
      success: true,
      message: 'อัปเดตข้อมูลเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' });
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
    console.log('Creating trip with data:', {
      studentId,
      carType,
      placeIdPickUp,
      placeIdDestination,
      date,
      is_round_trip,
      is_round_trip_type: typeof is_round_trip,
      is_round_trip_value: is_round_trip
    });

    const [result] = await pool.query(
      'INSERT INTO trips (studentId, carType, placeIdPickUp, placeIdDestination, date, status, is_round_trip) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        studentId, 
        carType, 
        placeIdPickUp, 
        placeIdDestination, 
        date, 
        'pending', 
        is_round_trip ? 1 : 0 // แปลงเป็น 1 หรือ 0 สำหรับ MySQL
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

// In the GET /trips endpoint
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

module.exports = router; 