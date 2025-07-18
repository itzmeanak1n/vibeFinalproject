import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Avatar,
} from '@mui/material';
import { PhotoCamera } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

function StudentRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    studentId: '',
    nationalId: '',
    userFirstname: '',
    userLastname: '',
    userEmail: '',
    userPass: '',
    userTel: '',
    userAddress: '',
    userprofilePic: null,
  });
  
  const [previewImage, setPreviewImage] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        userprofilePic: file
      });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const formDataToSend = new FormData();
      
      // Append all form data to FormData
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null) {
          if (key === 'userprofilePic') {
            formDataToSend.append('userProfilePic', formData[key]);
          } else {
            formDataToSend.append(key, formData[key]);
          }
        }
      });
      
      const response = await authService.registerStudent(formDataToSend);
      
      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>
            ลงทะเบียนสำหรับนักศึกษา
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>ลงทะเบียนสำเร็จ! กำลังนำคุณไปยังหน้าเข้าสู่ระบบ...</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="รหัสนักศึกษา"
              name="studentId"
              value={formData.studentId}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="เลขบัตรประชาชน"
              name="nationalId"
              value={formData.nationalId}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="ชื่อ"
              name="userFirstname"
              value={formData.userFirstname}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="นามสกุล"
              name="userLastname"
              value={formData.userLastname}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="อีเมล"
              name="userEmail"
              type="email"
              value={formData.userEmail}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="รหัสผ่าน"
              name="userPass"
              type="password"
              value={formData.userPass}
              onChange={handleChange}
              margin="normal"
              required
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 2 }}>
              <Avatar 
                src={previewImage} 
                sx={{ width: 100, height: 100, mb: 2 }}
              />
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="profile-pic-upload"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="profile-pic-upload">
                <Button 
                  variant="outlined" 
                  component="span"
                  startIcon={<PhotoCamera />}
                >
                  อัพโหลดรูปโปรไฟล์
                </Button>
              </label>
            </Box>
            <TextField
              fullWidth
              label="เบอร์โทรศัพท์"
              name="userTel"
              value={formData.userTel}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="ที่อยู่"
              name="userAddress"
              value={formData.userAddress}
              onChange={handleChange}
              margin="normal"
              required
              multiline
              rows={3}
            />
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

export default StudentRegister; 