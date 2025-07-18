const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db');
const { auth } = require('../middleware/auth'); // Middleware ตรวจสอบการล็อกอิน
const multer = require('multer');
const fs = require('fs');
const path = require('path');



// การตั้งค่า Multer สำหรับบันทึกไฟล์ยานพาหนะ (คล้ายกับใน auth.js)
const vehicleStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/vehicles'; // โฟลเดอร์สำหรับรูปรถโดยเฉพาะ
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads');
    }
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user.id + '-' + file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)); // เพิ่ม riderId ในชื่อไฟล์
  }
});

const vehicleUpload = multer({
  storage: vehicleStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น'), false);
    }
    cb(null, true);
  }
});

// กำหนดการจัดเก็บไฟล์
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// --- API Endpoints --- //

// GET /api/riders/vehicles - ดึงข้อมูลยานพาหนะทั้งหมดของ rider ที่ล็อกอิน
router.get('/vehicles', auth, async (req, res) => {
  const riderId = req.user.id; // riderId จาก token ที่ผ่าน middleware auth
  console.log(`Fetching vehicles for riderId: ${riderId}`); // เพิ่ม log
  try {
    // --- ยืนยันการใช้ตาราง ridervehical --- 
    const [vehicles] = await pool.query(
      'SELECT carId, riderId, carType, plate, brand, model, insurancePhoto, carPhoto FROM ridervehical WHERE riderId = ?',
      [riderId]
    );
    console.log('Vehicles found:', vehicles); // เพิ่ม log
    res.json(vehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', error); // แสดง error ที่เกิดขึ้นจริง
    // ตรวจสอบ error code เฉพาะ table not found
    if (error.code === 'ER_NO_SUCH_TABLE') {
         console.error(`*** ตาราง ridervehical อาจจะยังไม่มีอยู่จริงในฐานข้อมูล ***`);
         return res.status(500).json({ message: 'ข้อผิดพลาด: ไม่พบตารางข้อมูลยานพาหนะ' });
    }
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลยานพาหนะ' });
  }
});

// POST /api/riders/vehicles - เพิ่มยานพาหนะใหม่
router.post('/vehicles', auth, vehicleUpload.fields([
  { name: 'insurancePhoto', maxCount: 1 },
  { name: 'carPhoto', maxCount: 1 }
]), async (req, res) => {
  const riderId = req.user.id;
  const { carType, plate, brand, model } = req.body;
  const insurancePhotoPath = req.files?.insurancePhoto?.[0]?.path;
  const carPhotoPath = req.files?.carPhoto?.[0]?.path;

  if (!carType || !plate || !brand || !model) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลยานพาหนะให้ครบถ้วน (Type, Plate, Brand, Model)' });
  }

  try {
    // --- ยืนยันการใช้ตาราง ridervehical --- 
    const [result] = await pool.query(
      'INSERT INTO ridervehical (riderId, carType, plate, brand, model, insurancePhoto, carPhoto) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [riderId, carType, plate, brand, model, insurancePhotoPath ? path.basename(insurancePhotoPath) : null, carPhotoPath ? path.basename(carPhotoPath) : null] // เก็บเฉพาะชื่อไฟล์
    );
    res.status(201).json({
      success: true,
      message: 'เพิ่มข้อมูลยานพาหนะสำเร็จ',
      carId: result.insertId
    });
  } catch (error) {
    console.error('Error adding vehicle:', error);
    if (insurancePhotoPath) fs.unlink(insurancePhotoPath, (err) => { if (err) console.error("Error deleting insurance photo:", err); });
    if (carPhotoPath) fs.unlink(carPhotoPath, (err) => { if (err) console.error("Error deleting car photo:", err); });
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเพิ่มข้อมูลยานพาหนะ' });
  }
});

// PUT /api/riders/vehicles/:carId - อัปเดตข้อมูลยานพาหนะ
router.put('/vehicles/:carId', auth, vehicleUpload.fields([
    { name: 'insurancePhoto', maxCount: 1 },
    { name: 'carPhoto', maxCount: 1 }
]), async (req, res) => {
    const riderId = req.user.id;
    const carId = req.params.carId;
    const { carType, plate, brand, model } = req.body;
    const insurancePhoto = req.files?.insurancePhoto?.[0];
    const carPhoto = req.files?.carPhoto?.[0];

    try {
        // ดึงข้อมูลเก่าเพื่อลบไฟล์เก่า (ถ้ามีการอัปโหลดไฟล์ใหม่)
        const [oldVehicle] = await pool.query('SELECT insurancePhoto, carPhoto FROM ridervehical WHERE carId = ? AND riderId = ?', [carId, riderId]);

        if (oldVehicle.length === 0) {
            // ลบไฟล์ที่อัปโหลดมาใหม่ ถ้าหา record เก่าไม่เจอ
            if (insurancePhoto) fs.unlink(insurancePhoto.path, (err) => console.error("Error deleting new insurance photo:", err));
            if (carPhoto) fs.unlink(carPhoto.path, (err) => console.error("Error deleting new car photo:", err));
            return res.status(404).json({ message: 'ไม่พบยานพาหนะ หรือคุณไม่มีสิทธิ์แก้ไข' });
        }

        let sql = 'UPDATE ridervehical SET carType = ?, plate = ?, brand = ?, model = ?';
        const params = [carType, plate, brand, model];
        let oldInsurancePath = oldVehicle[0].insurancePhoto;
        let oldCarPath = oldVehicle[0].carPhoto;

        if (insurancePhoto) {
            sql += ', insurancePhoto = ?';
            params.push(path.basename(insurancePhoto.path)); // เก็บเฉพาะชื่อไฟล์
        } else {
            // ถ้าไม่ได้ส่งไฟล์ใหม่มา ก็ใช้ค่าเดิม (ไม่ต้องเพิ่มใน query)
        }

        if (carPhoto) {
            sql += ', carPhoto = ?';
            params.push(path.basename(carPhoto.path)); // เก็บเฉพาะชื่อไฟล์
        } else {
            // ถ้าไม่ได้ส่งไฟล์ใหม่มา ก็ใช้ค่าเดิม
        }

        sql += ' WHERE carId = ? AND riderId = ?';
        params.push(carId, riderId);

        const [result] = await pool.query(sql, params);

        // ลบไฟล์เก่า ถ้ามีการอัปโหลดไฟล์ใหม่สำเร็จ
        if (result.affectedRows > 0) {
            const uploadDir = path.join(__dirname, '..', 'uploads', 'vehicles'); // หา path เต็มของ uploads/vehicles
            if (insurancePhoto && oldInsurancePath) {
                const fullOldPath = path.join(uploadDir, oldInsurancePath);
                fs.unlink(fullOldPath, (err) => { if (err) console.error(`Error deleting old insurance photo ${fullOldPath}:`, err); });
            }
            if (carPhoto && oldCarPath) {
                const fullOldPath = path.join(uploadDir, oldCarPath);
                fs.unlink(fullOldPath, (err) => { if (err) console.error(`Error deleting old car photo ${fullOldPath}:`, err); });
            }
        } else {
             // ถ้า update ไม่สำเร็จ อาจจะต้องลบไฟล์ใหม่ที่อัปโหลดมา
             if (insurancePhoto) fs.unlink(insurancePhoto.path, (err) => console.error("Error deleting new insurance photo after failed update:", err));
             if (carPhoto) fs.unlink(carPhoto.path, (err) => console.error("Error deleting new car photo after failed update:", err));
             return res.status(404).json({ message: 'ไม่พบยานพาหนะ หรือคุณไม่มีสิทธิ์แก้ไข' });
        }

        res.json({ success: true, message: 'อัปเดตข้อมูลยานพาหนะสำเร็จ' });
    } catch (error) {
        console.error('Error updating vehicle:', error);
        // ลบไฟล์ใหม่ที่อัปโหลดมาถ้าเกิด error อื่นๆ
        if (insurancePhoto) fs.unlink(insurancePhoto.path, (err) => console.error("Error deleting new insurance photo after error:", err));
        if (carPhoto) fs.unlink(carPhoto.path, (err) => console.error("Error deleting new car photo after error:", err));
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลยานพาหนะ' });
    }
});


// DELETE /api/riders/vehicles/:carId - ลบยานพาหนะ
router.delete('/vehicles/:carId', auth, async (req, res) => {
  const riderId = req.user.id;
  const carId = req.params.carId;

  try {
    // --- ยืนยันการใช้ตาราง ridervehical --- 
    const [vehicleToDelete] = await pool.query(
      'SELECT insurancePhoto, carPhoto FROM ridervehical WHERE carId = ? AND riderId = ?',
      [carId, riderId]
    );

    if (vehicleToDelete.length === 0) {
        return res.status(404).json({ message: 'ไม่พบยานพาหนะ หรือคุณไม่มีสิทธิ์ลบ' });
    }

    const { insurancePhoto, carPhoto } = vehicleToDelete[0];

    // --- ยืนยันการใช้ตาราง ridervehical --- 
    const [result] = await pool.query(
      'DELETE FROM ridervehical WHERE carId = ? AND riderId = ?',
      [carId, riderId]
    );

    if (result.affectedRows === 0) {
      // This case should ideally not happen if the previous SELECT found the record
      return res.status(404).json({ message: 'ไม่สามารถลบยานพาหนะได้' });
    }

    // ลบไฟล์รูปภาพออกจาก server
    const uploadDir = path.join(__dirname, '..', 'uploads', 'vehicles');
    if (insurancePhoto) {
        const fullPath = path.join(uploadDir, insurancePhoto);
        fs.unlink(fullPath, (err) => { if (err) console.error(`Error deleting file ${fullPath}:`, err); else console.log(`Deleted ${fullPath}`); });
    }
    if (carPhoto) {
        const fullPath = path.join(uploadDir, carPhoto);
        fs.unlink(fullPath, (err) => { if (err) console.error(`Error deleting file ${fullPath}:`, err); else console.log(`Deleted ${fullPath}`); });
    }

    res.json({ success: true, message: 'ลบข้อมูลยานพาหนะสำเร็จ' });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบข้อมูลยานพาหนะ' });
  }
});

// --- Rider Profile --- //

// GET /api/riders/profile - ดึงข้อมูลโปรไฟล์ของ rider ที่ล็อกอิน
router.get('/profile', auth, async (req, res) => {
    const riderId = req.user.id; // riderId จาก token
    console.log(`Fetching profile for riderId: ${riderId}`);
    try {
        const [riderProfile] = await pool.query(
            // เลือกคอลัมน์ที่ต้องการแสดงในโปรไฟล์ (ยกเว้น password)
            'SELECT riderId, riderNationalId, riderFirstname, riderLastname, riderEmail, riderTel, riderAddress, RiderProfilePic, RiderStudentCard, riderLicense, QRscan, status, riderRate FROM riders WHERE riderId = ?',
            [riderId]
        );

        if (riderProfile.length === 0) {
            console.log(`Rider profile not found for riderId: ${riderId}`);
            return res.status(404).json({ message: 'ไม่พบข้อมูลโปรไฟล์ไรเดอร์' });
        }

        console.log('Rider profile found:', riderProfile[0]);
        res.json(riderProfile[0]); // ส่งข้อมูลโปรไฟล์กลับไป
    } catch (error) {
        console.error('Error fetching rider profile:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์' });
    }
});

// PUT /api/riders/profile - อัปเดตข้อมูลโปรไฟล์ของ rider ที่ล็อกอิน
router.put('/profile', auth, upload.fields([
  { name: 'RiderProfilePic', maxCount: 1 },
  { name: 'RiderStudentCard', maxCount: 1 },
  { name: 'QRscan', maxCount: 1 },
  { name: 'riderLicense', maxCount: 1 }
]), async (req, res) => {
  const riderId = req.user.id;
  const {
    riderFirstname,
    riderLastname,
    riderTel,
    riderAddress,
    riderNationalId,
    riderEmail
  } = req.body;

  if (!riderFirstname || !riderLastname || !riderTel || !riderAddress) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลโปรไฟล์ให้ครบถ้วน (ชื่อ, นามสกุล, เบอร์โทร, ที่อยู่)' });
  }

  try {
    // เตรียมข้อมูลสำหรับอัพเดท
    const updateData = {
      riderFirstname,
      riderLastname,
      riderTel,
      riderAddress,
      riderNationalId,
      riderEmail
    };

    // เพิ่มชื่อไฟล์รูปภาพถ้ามีการอัพโหลด
    if (req.files) {
      if (req.files.RiderProfilePic) {
        updateData.RiderProfilePic = req.files.RiderProfilePic[0].filename;
      }
      if (req.files.RiderStudentCard) {
        updateData.RiderStudentCard = req.files.RiderStudentCard[0].filename;
      }
      if (req.files.QRscan) {
        updateData.QRscan = req.files.QRscan[0].filename;
      }
      if (req.files.riderLicense) {
        updateData.riderLicense = req.files.riderLicense[0].filename;
      }
    }

    // อัพเดทข้อมูลในฐานข้อมูล
    const [result] = await pool.query(
      'UPDATE riders SET ? WHERE riderId = ?',
      [updateData, riderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลไรเดอร์' });
    }

    // ดึงข้อมูลที่อัพเดทแล้ว
    const [updatedRider] = await pool.query(
      'SELECT riderId, riderNationalId, riderFirstname, riderLastname, riderEmail, riderTel, riderAddress, RiderProfilePic, RiderStudentCard, riderLicense, QRscan, status FROM riders WHERE riderId = ?',
      [riderId]
    );

    res.json({
      success: true,
      message: 'อัปเดตโปรไฟล์สำเร็จ',
      rider: updatedRider[0]
    });
  } catch (error) {
    console.error('Error updating rider profile:', error);
    res.status(500).json({ message: error.message });
  }
});

// --- Rider Status --- // ลบส่วนนี้ทั้งหมด
/*
// GET /api/rider/status - ดึงสถานะการทำงาน (Online/Offline)
router.get('/status', auth, async (req, res) => { ... });

// PUT /api/rider/status - อัปเดตสถานะการทำงาน (Online/Offline)
router.put('/status', auth, async (req, res) => { ... });
*/

// Get pending trips
router.get('/pending-trips', auth, async (req, res) => {
  try {
    console.log('Fetching pending trips...');
    const [trips] = await pool.query(`
      SELECT 
        t.*,
        p1.placeName as pickUpName,
        p2.placeName as destinationName,
        u.userFirstname as studentFirstname,
        u.userLastname as studentLastname,
        u.userTel as studentTel,
        (SELECT carType FROM ridervehical WHERE riderId = ? LIMIT 1) as vehicleType,
        t.is_round_trip as isRoundTrip
      FROM trips t
      LEFT JOIN places p1 ON t.placeIdPickUp = p1.placeId
      LEFT JOIN places p2 ON t.placeIdDestination = p2.placeId
      LEFT JOIN tb_user u ON t.studentId = u.studentId
      WHERE t.status = 'pending'
      ORDER BY t.date ASC
    `, [req.user.id]);
    
    // Format the response
    const formattedTrips = trips.map(trip => ({
      ...trip,
      studentName: `${trip.studentFirstname || ''} ${trip.studentLastname || ''}`.trim() || 'ไม่ระบุ',
      pickUpName: trip.pickUpName || 'ไม่ระบุ',
      destinationName: trip.destinationName || 'ไม่ระบุ',
      vehicleType: trip.vehicleType || 'ไม่ระบุ',
      isRoundTrip: trip.isRoundTrip === 1 || trip.isRoundTrip === '1'
    }));
    
    console.log(`Found ${formattedTrips.length} pending trips`);
    res.json(formattedTrips);
  } catch (error) {
    console.error('Error fetching pending trips:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลงานที่รอการตอบรับ',
      error: error.message,
      sql: error.sql
    });
  }
});

// Accept trip
router.put('/trips/:tripId/accept', auth, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { id } = req.user; // เปลี่ยนจาก riderId เป็น id

    console.log('Accepting trip:', {
      tripId,
      riderId: id
    });

    // ตรวจสอบว่ามีการเดินทางนี้หรือไม่
    const [trip] = await pool.query(
      "SELECT * FROM trips WHERE tripId = ?",
      [tripId]
    );

    if (trip.length === 0) {
      return res.status(404).json({ message: "ไม่พบการเดินทาง" });
    }

    console.log('Found trip:', trip[0]);

    // อัพเดทสถานะการเดินทาง
    const [updateResult] = await pool.query(
      "UPDATE trips SET status = ?, rider_id = ? WHERE tripId = ?",
      ["accepted", id, tripId]
    );

    console.log('Update result:', updateResult);

    res.json({ success: true, message: "รับงานสำเร็จ" });
  } catch (error) {
    console.error("Error accepting trip:", error);
    res.status(500).json({ message: error.message });
  }
});

// Reject trip
router.put('/trips/:tripId/reject', auth, async (req, res) => {
  try {
    const { tripId } = req.params;

    // ตรวจสอบว่างานยังรอการตอบรับอยู่
    const [trip] = await pool.query(
      'SELECT * FROM trips WHERE tripId = ? AND status = "pending"',
      [tripId]
    );

    if (trip.length === 0) {
      return res.status(400).json({ message: 'งานนี้ไม่สามารถปฏิเสธได้' });
    }

    // อัปเดตสถานะงาน
    await pool.query(
      'UPDATE trips SET status = "cancelled" WHERE tripId = ?',
      [tripId]
    );

    res.json({ message: 'ปฏิเสธงานสำเร็จ' });
  } catch (error) {
    console.error('Error rejecting trip:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการปฏิเสธงาน' });
  }
});

// Complete trip
router.put('/trips/:tripId/complete', auth, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { id } = req.user;

    console.log('Completing trip:', {
      tripId,
      riderId: id
    });

    // ตรวจสอบว่ามีการเดินทางนี้หรือไม่
    const [trip] = await pool.query(
      "SELECT * FROM trips WHERE tripId = ? AND rider_id = ? AND status = 'accepted'",
      [tripId, id]
    );

    if (trip.length === 0) {
      return res.status(404).json({ message: "ไม่พบการเดินทางที่รอดำเนินการ" });
    }

    // อัพเดทสถานะการเดินทางเป็น success
    const [updateResult] = await pool.query(
      "UPDATE trips SET status = ? WHERE tripId = ?",
      ["success", tripId]
    );

    console.log('Update result:', updateResult);

    res.json({ success: true, message: "จบงานสำเร็จ" });
  } catch (error) {
    console.error("Error completing trip:", error);
    res.status(500).json({ message: error.message });
  }
});

// ดึงประวัติการทำงานทั้งหมดของไรเดอร์
router.get('/trips/history', auth, async (req, res) => {
  try {
    const { id } = req.user;
    
    console.log('Fetching trip history for rider ID:', id);

    console.log('Fetching trip history for rider ID:', id);
    
    // ใช้ตาราง trips อย่างเดียว
    const sqlQuery = `
      SELECT 
        t.*,
        p1.placeName as pickUpName,
        p2.placeName as destinationName,
        u.userFirstname as studentFirstname,
        u.userLastname as studentLastname,
        u.userTel as studentTel,
        (SELECT carType FROM ridervehical WHERE riderId = ? LIMIT 1) as carType
      FROM trips t
      LEFT JOIN places p1 ON t.placeIdPickUp = p1.placeId
      LEFT JOIN places p2 ON t.placeIdDestination = p2.placeId
      LEFT JOIN tb_user u ON t.studentId = u.studentId
      WHERE t.rider_id = ?
      ORDER BY t.date DESC
    `;
    
    console.log('Executing SQL query:', sqlQuery.replace(/\s+/g, ' ').trim());
    console.log('With parameters:', [id, id]);
    
    const [trips] = await pool.query(sqlQuery, [id, id]);
    
    console.log('Raw database results:', JSON.stringify(trips, null, 2));

    
    console.log('Raw trips from database:', JSON.stringify(trips, null, 2));
    
    // จัดรูปแบบคำตอบ
    const formattedTrips = trips.map(trip => {
      const formattedTrip = {
        tripId: trip.tripId,
        studentId: trip.studentId,
        studentName: `${trip.studentFirstname || ''} ${trip.studentLastname || ''}`.trim() || 'ไม่ระบุ',
        studentTel: trip.studentTel || 'ไม่ระบุ',
        pickUpName: trip.pickUpName || 'ไม่ระบุ',
        destinationName: trip.destinationName || 'ไม่ระบุ',
        date: trip.date,
        carType: trip.carType || 'ไม่ระบุ',
        status: trip.status || 'ไม่ระบุ',
        isRoundTrip: trip.is_round_trip === 1 || trip.is_round_trip === '1',
        // Include place information
        placeIdPickUp: trip.placeIdPickUp,
        placeIdDestination: trip.placeIdDestination,
        // Include place names
        pickUpPlaceName: trip.pickUpName,
        destinationPlaceName: trip.destinationName
      };
      
      console.log(`Formatted trip ${trip.tripId}:`, JSON.stringify(formattedTrip, null, 2));
      return formattedTrip;
    });

    console.log(`Found ${formattedTrips.length} trips`);
    res.json(formattedTrips);
  } catch (error) {
    console.error('Error fetching trip history:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงประวัติการทำงาน',
      error: error.message 
    });
  }
});

// ดึงรายละเอียดการเดินทาง
router.get('/trips/:tripId', auth, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { id } = req.user;
    console.log('Fetching trip details for tripId:', tripId, 'riderId:', id);

    // ดึงข้อมูลการเดินทาง
    const [trips] = await pool.query(
      `SELECT t.*, 
              p1.placeName as pickUpName, 
              p1.link as pickUpLink,
              p2.placeName as destinationName,
              p2.link as destinationLink,
              u.userFirstname as studentFirstname,
              u.userLastname as studentLastname,
              u.userTel as studentTel,
              r.QRscan as riderQRscan,
              (SELECT carType FROM ridervehical WHERE riderId = ? LIMIT 1) as carType
       FROM trips t
       LEFT JOIN places p1 ON t.placeIdPickUp = p1.placeId
       LEFT JOIN places p2 ON t.placeIdDestination = p2.placeId
       LEFT JOIN tb_user u ON t.studentId = u.studentId
       LEFT JOIN riders r ON t.rider_id = r.riderId
       WHERE t.tripId = ? AND t.rider_id = ?`,
      [id, tripId, id]
    );

    console.log('Trip details query result:', trips);

    if (!trips || trips.length === 0) {
      console.log('Trip not found');
      return res.status(404).json({ message: "ไม่พบการเดินทาง" });
    }

    const trip = trips[0];
    const response = {
      tripId: trip.tripId,
      studentId: trip.studentId,
      studentName: `${trip.studentFirstname || ''} ${trip.studentLastname || ''}`.trim() || 'ไม่ระบุ',
      studentTel: trip.studentTel || 'ไม่ระบุ',
      pickUpName: trip.pickUpName || 'ไม่ระบุ',
      pickUpLink: trip.pickUpLink || '',
      destinationName: trip.destinationName || 'ไม่ระบุ',
      destinationLink: trip.destinationLink || '',
      date: trip.date,
      carType: trip.carType || 'ไม่ระบุ',
      isRoundTrip: trip.is_round_trip === 1 || trip.is_round_trip === '1',
      status: trip.status,
      riderQRscan: trip.riderQRscan ? `http://localhost:5000/uploads/${path.basename(trip.riderQRscan)}` : null,
      created_at: trip.created_at,
      updated_at: trip.updated_at
    };
    
    console.log('Sending trip details:', response);
    res.json(response);
  } catch (error) {
    console.error("Error fetching trip details:", error);
    res.status(500).json({ message: error.message });
  }
});


// ดึงรายการงานที่กำลังดำเนินการของไรเดอร์
router.get('/active-trips', auth, async (req, res) => {
  try {
    const { id } = req.user;
    console.log('Fetching active trips for rider ID:', id);

    const [trips] = await pool.query(`
      SELECT 
        t.*,
        p1.placeName as pickUpName,
        p2.placeName as destinationName,
        (SELECT carType FROM ridervehical WHERE riderId = ? LIMIT 1) as carType,
        t.is_round_trip as is_round_trip,
        u.userFirstname as studentFirstname,
        u.userLastname as studentLastname,
        u.userTel as studentTel,
        CONCAT(u.userFirstname, ' ', u.userLastname) as studentName
      FROM trips t
      LEFT JOIN tb_user u ON t.studentId = u.studentId
      LEFT JOIN places p1 ON t.placeIdPickUp = p1.placeId
      LEFT JOIN places p2 ON t.placeIdDestination = p2.placeId
      WHERE t.rider_id = ? 
        AND t.status = 'accepted'
      ORDER BY t.date ASC
    `, [id, id]);

    // Map the results to match frontend expectations
    const formattedTrips = trips.map(trip => ({
      ...trip,
      isRoundTrip: trip.is_round_trip === 1 || trip.is_round_trip === '1',
      destinationName: trip.destinationName || 'ไม่ระบุ',
      pickUpName: trip.pickUpName || 'ไม่ระบุ',
      vehicleType: trip.carType || 'ไม่ระบุ'
    }));

    console.log('Active trips found:', formattedTrips);
    res.json(formattedTrips);
  } catch (error) {
    console.error('Error fetching active trips:', error);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลงานที่กำลังดำเนินการ',
      error: error.message,
      sql: error.sql
    });
  }
});
// ตรวจสอบข้อมูลสถานที่
router.get('/debug/places', auth, async (req, res) => {
  let connection;
  try {
    console.log('Fetching all places...');
    
    // Get a connection from the pool
    connection = await pool.getConnection();
    console.log('Database connection established');
    
    // Get all tables in the database
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Available tables:', tables);
    
    // Check if places table exists
    const placesTableExists = tables.some(table => 
      table[`Tables_in_${process.env.DB_NAME || 'believe'}`] === 'places'
    );
    
    if (!placesTableExists) {
      throw new Error('Places table does not exist in the database');
    }
    
    // Get table structure
    const [tableInfo] = await connection.query('DESCRIBE places');
    console.log('Places table structure:', tableInfo);
    
    // Get places data
    const [places] = await connection.query('SELECT * FROM places');
    console.log('Places data:', JSON.stringify(places, null, 2));
    
    res.json({ 
      success: true,
      places: places.map(p => ({
        placeId: p.placeId,
        placeName: p.placeName,
        link: p.link,
        pics: p.pics
      }))
    });
  } catch (error) {
    console.error('Error in /debug/places:', error);
    console.error('Error stack:', error.stack);
    
    // Send detailed error response
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch places',
      message: error.message,
      code: error.code,
      sql: error.sql,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState
    });
  } finally {
    // Always release the connection back to the pool
    if (connection) {
      await connection.release();
      console.log('Database connection released');
    }
  }
});

module.exports = router; 







