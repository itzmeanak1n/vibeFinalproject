import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzY2NiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yMCAyMXYtMmE0IDQgMCAwIDAtNC00SDhhNCA0IDAgMCAwLTQgNHYyIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSI3IiByPSI0Ii8+PC9zdmc+';

function RiderRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    riderId: '',
    riderNationalId: '',
    riderFirstname: '',
    riderLastname: '',
    riderEmail: '',
    riderPass: '',
    riderTel: '',
    riderAddress: '',
  });
  const [files, setFiles] = useState({
    RiderProfilePic: null,
    RiderStudentCard: null,
    QRscan: null,
    riderLicense: null,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    setFiles({
      ...files,
      [e.target.name]: e.target.files[0],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (!files.RiderProfilePic || !files.RiderStudentCard || !files.QRscan || !files.riderLicense) {
        setError('กรุณาอัพโหลดไฟล์รูปภาพให้ครบทุกรายการ');
        return;
      }

      const formDataToSend = new FormData();

      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });

      Object.keys(files).forEach(key => {
        if (files[key]) {
          formDataToSend.append(key, files[key]);
          console.log(`Appending file ${key}:`, files[key].name);
        }
      });

      console.log('ข้อมูลที่จะส่ง:', {
        ...formData,
        files: Object.keys(files).reduce((acc, key) => ({
          ...acc,
          [key]: files[key]?.name
        }), {})
      });

      const response = await authService.registerRider(formDataToSend);

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      console.error('เกิดข้อผิดพลาดในการลงทะเบียน:', err);
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง');
    }
  };


  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>
            ลงทะเบียนสำหรับไรเดอร์
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>ลงทะเบียนสำเร็จ! กำลังนำคุณไปยังหน้าเข้าสู่ระบบ...</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="รหัสนักศึกษา"
              name="riderId"
              value={formData.riderId}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="เลขบัตรประชาชน"
              name="riderNationalId"
              value={formData.riderNationalId}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="ชื่อ"
              name="riderFirstname"
              value={formData.riderFirstname}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="นามสกุล"
              name="riderLastname"
              value={formData.riderLastname}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="อีเมล"
              name="riderEmail"
              type="email"
              value={formData.riderEmail}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="รหัสผ่าน"
              name="riderPass"
              type="password"
              value={formData.riderPass}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="เบอร์โทรศัพท์"
              name="riderTel"
              value={formData.riderTel}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="ที่อยู่"
              name="riderAddress"
              value={formData.riderAddress}
              onChange={handleChange}
              margin="normal"
              required
              multiline
              rows={3}
            />
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                ภาพโปรไฟล์
              </Typography>
              <input
                accept="image/*"
                type="file"
                name="RiderProfilePic"
                onChange={handleFileChange}
                required
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                บัตรนักศึกษา
              </Typography>
              <input
                accept="image/*"
                type="file"
                name="RiderStudentCard"
                onChange={handleFileChange}
                required
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                รูปสแกน
              </Typography>
              <input
                accept="image/*"
                type="file"
                name="QRscan"
                onChange={handleFileChange}
                required
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                รูปภาพใบขับขี่
              </Typography>
              <input
                accept="image/*"
                type="file"
                name="riderLicense"
                onChange={handleFileChange}
                required
              />
            </Box>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              sx={{ mt: 3 }}
            >
              ลงทะเบียน
            </Button>
          </form>
          <Button
            variant="text"
            onClick={() => navigate('/login')}
            sx={{ mt: 2 }}
            fullWidth
          >
            มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
          </Button>
        </Paper>
      </Box>
    </Container>
  );
}

export default RiderRegister; 