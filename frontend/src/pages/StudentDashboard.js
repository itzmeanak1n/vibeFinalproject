import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { studentService } from '../services/api';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Avatar,
  Tooltip,
  IconButton,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Rating from '@mui/material/Rating';
import StarIcon from '@mui/icons-material/Star';
import PhotoCamera from '@mui/icons-material/PhotoCamera';

function StudentDashboard() {
  const { profile, logout, studentTrips, updateStudentTrips } = useAuth();
  const [openCreateTrip, setOpenCreateTrip] = useState(false);
  const [places, setPlaces] = useState([]);
  const [tripFormData, setTripFormData] = useState({
    carType: '',
    placeIdPickUp: '',
    placeIdDestination: '',
    date: dayjs(),
    isRoundTrip: false  // Default to false (one-way)
  });
  const [tripError, setTripError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    userFirstname: '',
    userLastname: '',
    userEmail: '',
    userTel: '',
    userAddress: '',
    userprofilePic: null,
  });
  const [previewImage, setPreviewImage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [riderDetails, setRiderDetails] = useState(null);
  const [riderDialogOpen, setRiderDialogOpen] = useState(false);
  const [loadingRider, setLoadingRider] = useState(false);
  const [riderError, setRiderError] = useState('');
  
  // Rating state
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [currentTripId, setCurrentTripId] = useState(null);
  const [rating, setRating] = useState(0);
  const [ratingError, setRatingError] = useState('');


  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch places
      console.log('Fetching places...');
      const placesRes = await studentService.getPlaces();
      console.log('Places response:', JSON.stringify(placesRes, null, 2));
      
      if (placesRes?.data) {
        const placesData = Array.isArray(placesRes.data) ? placesRes.data : [];
        console.log('Setting places:', placesData);
        setPlaces(placesData);
      } else {
        console.warn('No places data received or invalid format');
        setPlaces([]);
      }
      
      // Fetch trips
      console.log('Fetching trips...');
      const tripsRes = await studentService.getTrips();
      console.log('Trips response:', JSON.stringify(tripsRes, null, 2));
      
      if (tripsRes?.data) {
        // Handle both array and object responses
        let tripsData = [];
        if (Array.isArray(tripsRes.data)) {
          tripsData = tripsRes.data;
        } else if (typeof tripsRes.data === 'object' && tripsRes.data !== null) {
          // If data is an object, convert it to an array
          tripsData = Object.values(tripsRes.data);
        }
        
        console.log('Processed trips data:', tripsData);
        updateStudentTrips(tripsData);
      } else {
        console.warn('No trips data received or invalid format');
        updateStudentTrips([]);
      }
      
    } catch (err) {
      console.error('Error fetching student data:', err);
      setError(err.response?.data?.message || 'Failed to fetch student data');
      // Make sure we have empty arrays if there's an error
      setPlaces([]);
      updateStudentTrips([]);
    } finally {
      setLoading(false);
    }
  }, [updateStudentTrips]);
  
  // Initial data load
  useEffect(() => {
    console.log('Component mounted, fetching initial data...');
    
    // Create a flag to prevent multiple simultaneous fetches
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        await fetchInitialData();
      } catch (error) {
        console.error('Error in fetchData:', error);
      } finally {
        if (isMounted) {
          // Set up polling to refresh data every 30 seconds
          const intervalId = setInterval(() => {
            console.log('Refreshing data...');
            fetchInitialData().catch(console.error);
          }, 30000);
          
          // Clean up interval on component unmount
          return () => {
            clearInterval(intervalId);
            isMounted = false;
          };
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [fetchInitialData]);

  const renderTripStatus = (status) => {
    if (!status) return <Chip label="ไม่ทราบสถานะ" color="default" size="small" />;
    
    const statusMap = {
      'pending': { label: 'รอการยืนยัน', color: 'warning' },
      'accepted': { label: 'ยืนยันแล้ว', color: 'success' },
      'completed': { label: 'เดินทางแล้ว', color: 'info' },
      'cancelled': { label: 'ยกเลิก', color: 'error' },
      'success': { label: 'สำเร็จ', color: 'success' },
      'rejected': { label: 'ปฏิเสธ', color: 'error' }
    };
    
    const statusInfo = statusMap[status.toLowerCase()] || { label: status, color: 'default' };
    
    return (
      <Chip 
        label={statusInfo.label} 
        color={statusInfo.color} 
        size="small" 
      />
    );
  };

  const renderTripAction = (trip) => {
    if (trip.status === 'success' && !trip.rating) {
      return (
        <Button 
          variant="outlined" 
          size="small" 
          onClick={() => handleOpenRatingDialog(trip)}
          title={!trip.rider_id ? 'ยังไม่มีไรเดอร์รับงาน' : ''}
        >
          ให้คะแนน
        </Button>
      );
    } else if (trip.rating) {
      return (
        <Box display="flex" alignItems="center">
          <Rating 
            value={trip.rating} 
            readOnly 
            precision={0.5} 
            emptyIcon={<StarIcon style={{ opacity: 0.55 }} fontSize="inherit" />} 
          />
        </Box>
      );
    }
    return null;
  };

  // Debug: Log when studentTrips changes
  useEffect(() => {
    console.log('Student trips updated:', studentTrips);
  }, [studentTrips]);

  const handleCreateTripClick = () => {
    setTripFormData({
      carType: '',
      placeIdPickUp: '',
      placeIdDestination: '',
      date: dayjs(),
      isRoundTrip: false,
      is_round_trip: false,
    });
    setTripError('');
    setOpenCreateTrip(true);
  };

  const handleTripFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setTripFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Log เฉพาะในโหมด development
    if (process.env.NODE_ENV === 'development') {
      console.log('Trip form updated:', { name, value: newValue });
    }
  };

  const handleDateChange = (newValue) => {
    setTripFormData(prev => ({
      ...prev,
      date: newValue
    }));
  };

  const handleTripSubmit = useCallback(async (e) => {
    e.preventDefault();
    setTripError('');
    setSuccess('');
  
    // Validate form data
    if (!tripFormData.carType) {
      setTripError('กรุณาเลือกประเภทรถ');
      return;
    }
    if (!tripFormData.placeIdPickUp) {
      setTripError('กรุณาเลือกสถานที่ต้นทาง');
      return;
    }
    if (!tripFormData.placeIdDestination) {
      setTripError('กรุณาเลือกสถานที่ปลายทาง');
      return;
    }
    if (tripFormData.placeIdPickUp === tripFormData.placeIdDestination) {
      setTripError('สถานที่ต้นทางและปลายทางต้องไม่เหมือนกัน');
      return;
    }
    if (!tripFormData.date) {
      setTripError('กรุณาเลือกเวลาที่ต้องการเดินทาง');
      return;
    }
  
    try {
      const tripData = {
        carType: tripFormData.carType,
        placeIdPickUp: tripFormData.placeIdPickUp,
        placeIdDestination: tripFormData.placeIdDestination,
        date: tripFormData.date.toISOString(),
        is_round_trip: Boolean(tripFormData.is_round_trip)
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Submitting trip:', tripData);
      }
      
      await studentService.createTrip(tripData);
      
      // Close dialog and update trips
      setOpenCreateTrip(false);
      
      // Update trips from the server
      await updateStudentTrips();
      
      // Show success message
      setSuccess('สร้างรายการเดินทางสำเร็จ');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Error creating trip:', err);
      setTripError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการสร้างรายการเดินทาง');
    }
  }, [tripFormData, updateStudentTrips]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleOpenProfileEditDialog = () => {
    setProfileFormData({
      userFirstname: profile.userFirstname || '',
      userLastname: profile.userLastname || '',
      userEmail: profile.userEmail || '',
      userTel: profile.userTel || '',
      userAddress: profile.userAddress || '',
      userprofilePic: null,
    });
    setPreviewImage(profile.userprofilePic ? 
      `${process.env.REACT_APP_API_URL}${profile.userprofilePic}` : '');
    setOpenProfileDialog(true);
  };

  const handleCloseProfileDialog = () => {
    setOpenProfileDialog(false);
    setProfileError('');
  };

  const handleOpenRiderDialog = async (riderId) => {
    if (!riderId) {
      setRiderError('ไม่พบข้อมูลไรเดอร์');
      return;
    }
    
    setLoadingRider(true);
    setRiderError('');
    
    try {
      // Get rider's basic details
      const response = await studentService.getRiderDetails(riderId);
      console.log('Rider details response:', response);
      
      if (response && response.data) {
        if (response.data.message === 'ไม่พบข้อมูลไรเดอร์') {
          setRiderError('ไม่พบข้อมูลไรเดอร์ในระบบ');
          return;
        }
        
        // Handle both response formats: direct data object or nested in data property
        let riderData = response.data.data || response.data;
        console.log('Rider data:', riderData);
        
        // Get rating from the rider data
        const riderRate = parseFloat(riderData.riderRate) || 0;
        
        // Prepare the rider data with the rating
        const processedRiderData = {
          riderId: riderData.riderId || riderId,
          riderFirstname: riderData.riderFirstname || riderData.firstname || '',
          riderLastname: riderData.riderLastname || riderData.lastname || '',
          riderEmail: riderData.riderEmail || riderData.email || '',
          riderTel: riderData.riderTel || riderData.phone || riderData.tel || '',
          riderProfilePic: riderData.riderProfilePic || riderData.profilePic || null,
          vehicles: Array.isArray(riderData.vehicles) ? riderData.vehicles : [],
          riderRate: riderRate
        };
        
        console.log('Processed rider data with rating:', processedRiderData);
        setRiderDetails(processedRiderData);
        setRiderDialogOpen(true);
      }
    } catch (err) {
      console.error('Error fetching rider details:', err);
      setRiderError('เกิดข้อผิดพลาดในการโหลดข้อมูลไรเดอร์');
    } finally {
      setLoadingRider(false);
    }
  };

  const handleCloseRiderDialog = () => {
    setRiderDialogOpen(false);
    setRiderDetails(null);
    setRiderError('');
  };

  const handleOpenRatingDialog = (trip) => {
    console.log('Opening rating dialog for trip:', trip);
    
    // Verify the trip exists and has a valid ID
    if (!trip || !trip.tripId) {
      console.error('Invalid trip data:', trip);
      setError('ไม่พบข้อมูลการเดินทาง');
      return;
    }
    
    // Check if trip has a rider assigned
    if (!trip.rider_id) {
      console.log('No rider assigned to trip:', trip.tripId);
      setError('ยังไม่มีไรเดอร์รับงาน');
      return;
    }
    
    console.log('Trip ID to use:', trip.tripId);
    setCurrentTripId(trip.tripId);
    setRating(0);
    setRatingError('');
    setRatingDialogOpen(true);
  };

  const handleCloseRatingDialog = () => {
    setRatingDialogOpen(false);
    setCurrentTripId(null);
    setRating(0);
    setRatingError('');
  };

  const handleRatingSubmit = async () => {
    if (!rating) {
      setRatingError('กรุณาให้คะแนน');
      return;
    }

    if (!currentTripId) {
      console.error('No trip ID found for rating');
      setRatingError('ไม่พบรายการเดินทางที่จะให้คะแนน');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setRatingError('');
      
      console.log('Submitting rating for trip:', currentTripId, 'Rating:', rating);
      
      // First, verify the trip exists and is in the correct status
      const tripsResponse = await studentService.getTrips();
      const currentTrip = tripsResponse.data.find(t => t.tripId === currentTripId);
      
      if (!currentTrip) {
        throw new Error('ไม่พบรายการเดินทางนี้ในระบบ');
      }
      
      if (currentTrip.status !== 'success') {
        throw new Error('ไม่สามารถให้คะแนนการเดินทางที่ยังไม่สำเร็จ');
      }
      
      if (currentTrip.rating) {
        throw new Error('ได้ให้คะแนนการเดินทางนี้ไปแล้ว');
      }
      
      // Call the API to update the rider's rating
      const response = await studentService.rateRider(currentTripId, rating);
      console.log('Rating response:', response);
      
      if (response.data && response.data.success) {
        setSuccess('บันทึกคะแนนเรียบร้อยแล้ว');
        // Close the rating dialog
        handleCloseRatingDialog();
        // Refresh the trips data to show the updated rating
        await fetchInitialData();
        
        // Show success message for 3 seconds
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      } else {
        throw new Error('ไม่สามารถบันทึกคะแนนได้: ' + (response.data?.message || 'เกิดข้อผิดพลาด'));
      }
    } catch (err) {
      console.error('Error submitting rating:', err);
      setRatingError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกคะแนน');
      
      // Clear error after 3 seconds
      setTimeout(() => {
        setRatingError('');
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileFormChange = (e) => {
    setProfileFormData({
      ...profileFormData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileFormData({
        ...profileFormData,
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

  const handleProfileUpdate = async () => {
    try {
      setProfileError('');
      setLoading(true);
      
      // Validate required fields
      if (!profileFormData.userFirstname || !profileFormData.userLastname) {
        throw new Error('กรุณากรอกชื่อและนามสกุลให้ครบถ้วน');
      }
      
      // Create form data
      const formData = new FormData();
      
      // Create user data object
      const userData = {
        userFirstname: profileFormData.userFirstname || '',
        userLastname: profileFormData.userLastname || '',
        userEmail: profileFormData.userEmail || '',
        userTel: profileFormData.userTel || '',
        userAddress: profileFormData.userAddress || ''
      };
      
      // Append user data as JSON string
      formData.append('userData', JSON.stringify(userData));
      
      // Only append the file if it's a new one
      if (profileFormData.userprofilePic instanceof File) {
        // Validate file size (max 5MB)
        if (profileFormData.userprofilePic.size > 5 * 1024 * 1024) {
          throw new Error('ขนาดไฟล์รูปภาพต้องไม่เกิน 5MB');
        }
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!validTypes.includes(profileFormData.userprofilePic.type)) {
          throw new Error('รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, GIF)');
        }
        
        formData.append('userProfilePic', profileFormData.userprofilePic);
      }
      
      console.log('Sending form data with userData:', userData);
      console.log('File to upload:', profileFormData.userprofilePic instanceof File ? profileFormData.userprofilePic.name : 'No file');
      
      console.log('Sending request to update profile with data:', {
        ...userData,
        userprofilePic: profileFormData.userprofilePic ? 'File selected' : 'No file'
      });
      
      const response = await studentService.updateProfile(formData);
      console.log('Profile update response:', response);
      
      // Check if the response has data and if the update was successful
      if (response.status !== 200 || (response.data && !response.data.success)) {
        const errorMessage = response.data?.message || 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์';
        console.error('Profile update failed:', errorMessage);
        throw new Error(errorMessage);
      }
      
      setSuccess('อัปเดตโปรไฟล์เรียบร้อยแล้ว');
      setTimeout(() => setSuccess(''), 3000);
      setOpenProfileDialog(false);
      
      // Refresh profile data
      await fetchInitialData();
    } catch (err) {
      console.error('Error updating profile:', {
        message: err.message,
        response: err.response?.data,
        stack: err.stack
      });
      const errorMessage = err.response?.data?.message || 
                         err.message || 
                         'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์';
      setProfileError(errorMessage);
      
      // Show alert for upload errors
      if (err.message.includes('upload') || err.message.includes('file') || err.message.includes('รูปภาพ')) {
        alert(`ไม่สามารถอัปโหลดรูปภาพ: ${errorMessage}`);
      } else if (!err.message.includes('กรุณากรอก')) {
        // Only show alert for non-validation errors
        alert(`เกิดข้อผิดพลาด: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    return date.toLocaleString('th-TH', options);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar 
              src={profile?.userprofilePic ? `${process.env.REACT_APP_API_URL}${profile.userprofilePic}` : undefined}
              sx={{ 
                bgcolor: 'primary.main', 
                width: 56, 
                height: 56,
                fontSize: '1.5rem'
              }}
            >
              {!profile?.userprofilePic && `${profile?.userFirstname?.[0] || ''}${profile?.userLastname?.[0] || ''}`}
            </Avatar>
            <Box>
              <Typography variant="h4" gutterBottom>
                สวัสดี, {profile?.userFirstname} {profile?.userLastname}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                รหัสนักศึกษา: {profile?.studentId}
              </Typography>
            </Box>
          </Box>
          <Tooltip title="ออกจากระบบ">
            <IconButton 
              color="error" 
              onClick={handleLogout}
              sx={{ 
                bgcolor: 'error.light',
                '&:hover': { bgcolor: 'error.main' }
              }}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <Box flex={1}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6" gutterBottom>
                      ข้อมูลส่วนตัว
                    </Typography>
                    <Tooltip title="แก้ไขโปรไฟล์">
                      <IconButton 
                        color="primary" 
                        onClick={handleOpenProfileEditDialog}
                        sx={{ ml: 2 }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography color="text.secondary">
                    อีเมล: {profile?.userEmail}
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" color="text.secondary">
                    เบอร์โทรศัพท์
                  </Typography>
                  <Typography variant="body1">
                    {profile?.userTel || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" color="text.secondary">
                    ที่อยู่
                  </Typography>
                  <Typography variant="body1">
                    {profile?.userAddress || '-'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, mb: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h5">รายการเดินทาง</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreateTripClick}
                  >
                    สร้างรายการเดินทาง
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              รายการเดินทางของฉัน
            </Typography>
            <TableContainer>
              <Table sx={{
                minWidth: 650,
                '& .MuiTableCell-root': {
                  verticalAlign: 'middle',
                  py: 2,
                  fontSize: '0.875rem',
                  borderColor: '#e0e0e0',
                  '&:first-of-type': {
                    pl: 3
                  },
                  '&:last-child': {
                    pr: 3
                  }
                },
                '& .MuiTableRow-root': {
                  transition: 'background-color 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.04)'
                  },
                  '&:last-child td': {
                    borderBottom: 'none'
                  }
                },
                '& .MuiTableHead-root': {
                  '& .MuiTableRow-root:hover': {
                    backgroundColor: 'transparent'
                  }
                }
              }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{
                      fontWeight: 600,
                      backgroundColor: '#f8f9fa',
                      color: '#424242',
                      fontSize: '0.875rem',
                      py: 2,
                      borderBottom: '2px solid #e0e0e0',
                      '&:first-of-type': {
                        borderTopLeftRadius: '8px',
                        pl: 3
                      }
                    }}>วันที่เดินทาง</TableCell>
                    <TableCell sx={{
                      fontWeight: 600,
                      backgroundColor: '#f8f9fa',
                      color: '#424242',
                      fontSize: '0.875rem',
                      py: 2,
                      borderBottom: '2px solid #e0e0e0'
                    }}>ต้นทาง</TableCell>
                    <TableCell sx={{
                      fontWeight: 600,
                      backgroundColor: '#f8f9fa',
                      color: '#424242',
                      fontSize: '0.875rem',
                      py: 2,
                      borderBottom: '2px solid #e0e0e0'
                    }}>ปลายทาง</TableCell>
                    <TableCell sx={{
                      fontWeight: 600,
                      backgroundColor: '#f8f9fa',
                      color: '#424242',
                      fontSize: '0.875rem',
                      py: 2,
                      borderBottom: '2px solid #e0e0e0'
                    }}>ประเภทรถ</TableCell>
                    <TableCell sx={{
                      fontWeight: 600,
                      backgroundColor: '#f8f9fa',
                      color: '#424242',
                      fontSize: '0.875rem',
                      py: 2,
                      borderBottom: '2px solid #e0e0e0',
                      '&:last-child': {
                        borderTopRightRadius: '8px',
                        pr: 3
                      }
                    }}>สถานะ</TableCell>
                    <TableCell sx={{
                      fontWeight: 600,
                      backgroundColor: '#f8f9fa',
                      color: '#424242',
                      fontSize: '0.875rem',
                      py: 2,
                      borderBottom: '2px solid #e0e0e0',
                      '&:last-child': {
                        borderTopRightRadius: '8px',
                        pr: 3
                      }
                    }}>ให้คะแนน</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow sx={{ '&:hover': { backgroundColor: '#f5f5f5' } }}>
                      <TableCell colSpan={6} align="center">กำลังโหลด...</TableCell>
                    </TableRow>
                  ) : studentTrips.length > 0 ? (
                    studentTrips.map((trip) => (
                      <TableRow key={trip._id}>
                        <TableCell>{formatDate(trip.date)}</TableCell>
                        <TableCell>{trip.pickupLocation?.name || trip.pickUpName || 'N/A'}</TableCell>
                        <TableCell>{trip.destination?.name || trip.destinationName || 'N/A'}</TableCell>
                        <TableCell>{trip.carType === 'motorcycle' ? 'มอเตอร์ไซค์' : 'รถยนต์'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {renderTripStatus(trip.status)}
                            {(trip.status === 'accepted' || trip.status === 'completed' || trip.status === 'success') && trip.rider_id && (
                              <Tooltip title="ดูข้อมูลไรเดอร์">
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={() => handleOpenRiderDialog(trip.rider_id)}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{renderTripAction(trip)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow sx={{ '&:hover': { backgroundColor: '#f5f5f5' } }}>
                      <TableCell colSpan={6} align="center">
                        ไม่มีรายการเดินทาง
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Dialog open={openProfileDialog} onClose={handleCloseProfileDialog} maxWidth="sm" fullWidth>
          <DialogTitle>แก้ไขข้อมูลส่วนตัว</DialogTitle>
          <form onSubmit={handleProfileUpdate}>
            <DialogContent>
              {profileError && <Alert severity="error" sx={{ mb: 2 }}>{profileError}</Alert>}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 2 }}>
                <Avatar 
                  src={previewImage || (profile?.userprofilePic ? `${process.env.REACT_APP_API_URL}${profile.userprofilePic}` : undefined)} 
                  sx={{ 
                    width: 120, 
                    height: 120, 
                    mb: 2,
                    fontSize: '3rem',
                    '& img': {
                      objectFit: 'cover'
                    }
                  }}
                >
                  {!previewImage && !profile?.userprofilePic && (
                    <PhotoCamera sx={{ fontSize: '3rem' }} />
                  )}
                </Avatar>
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
                    sx={{ mt: 1 }}
                    size="small"
                  >
                    เปลี่ยนรูปโปรไฟล์
                  </Button>
                </label>
              </Box>
              <TextField
                fullWidth
                label="ชื่อ"
                name="userFirstname"
                value={profileFormData.userFirstname}
                onChange={(e) => setProfileFormData({...profileFormData, userFirstname: e.target.value})}
                margin="normal"
              />
              <TextField
                margin="dense"
                name="userLastname"
                label="นามสกุล"
                type="text"
                fullWidth
                variant="outlined"
                value={profileFormData.userLastname}
                onChange={handleProfileFormChange}
                required
              />
              
              <TextField
                margin="dense"
                name="userTel"
                label="เบอร์โทรศัพท์"
                type="text"
                fullWidth
                variant="outlined"
                value={profileFormData.userTel}
                onChange={handleProfileFormChange}
                required
              />
              <TextField
                margin="dense"
                name="userEmail"
                label="อีเมล"
                type="email"
                fullWidth
                variant="outlined"
                value={profileFormData.userEmail}
                onChange={handleProfileFormChange}
                required
              />
              <TextField
                margin="dense"
                name="userAddress"
                label="ที่อยู่"
                type="text"
                fullWidth
                variant="outlined"
                value={profileFormData.userAddress}
                onChange={handleProfileFormChange}
                required
                multiline
                rows={3}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseProfileDialog}>ยกเลิก</Button>
              <Button type="submit" variant="contained">บันทึก</Button>
            </DialogActions>
          </form>
        </Dialog>

        <Dialog open={openCreateTrip} onClose={() => setOpenCreateTrip(false)} maxWidth="sm" fullWidth>
          <DialogTitle>สร้างรายการเดินทาง</DialogTitle>
          <form onSubmit={handleTripSubmit}>
            <DialogContent>
              {tripError && <Alert severity="error" sx={{ mb: 2 }}>{tripError}</Alert>}
              
              <FormControl fullWidth margin="normal">
                <InputLabel>ประเภทรถ</InputLabel>
                <Select
                  name="carType"
                  value={tripFormData.carType}
                  onChange={handleTripFormChange}
                  label="ประเภทรถ"
                  required
                >
                  <MenuItem value="motorcycle">มอเตอร์ไซค์</MenuItem>
                  <MenuItem value="car">รถยนต์</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel>สถานที่ต้นทาง</InputLabel>
                <Select
                  name="placeIdPickUp"
                  value={tripFormData.placeIdPickUp}
                  onChange={handleTripFormChange}
                  label="สถานที่ต้นทาง"
                  required
                >
                  {places.map((place) => (
                    <MenuItem key={place.placeId} value={place.placeId}>
                      {place.placeName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel>สถานที่ปลายทาง</InputLabel>
                <Select
                  name="placeIdDestination"
                  value={tripFormData.placeIdDestination}
                  onChange={handleTripFormChange}
                  label="สถานที่ปลายทาง"
                  required
                >
                  {places.map((place) => (
                    <MenuItem key={place.placeId} value={place.placeId}>
                      {place.placeName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  label="เวลาที่ต้องการเดินทาง"
                  value={tripFormData.date}
                  onChange={handleDateChange}
                  sx={{ mt: 2, width: '100%' }}
                  minDateTime={dayjs()}
                  format="DD/MM/YYYY HH:mm"
                />
              </LocalizationProvider>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(tripFormData.is_round_trip)}
                    onChange={handleTripFormChange}
                    name="is_round_trip"
                  />
                }
                label="ไป-กลับ"
                sx={{ mt: 2 }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenCreateTrip(false)}>ยกเลิก</Button>
              <Button type="submit" variant="contained">ยืนยัน</Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Rider Details Dialog */}
        <Dialog 
          open={riderDialogOpen} 
          onClose={handleCloseRiderDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>ข้อมูลไรเดอร์</DialogTitle>
          <DialogContent>
            {loadingRider ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : riderError ? (
              <Alert severity="error" sx={{ mb: 2 }}>{riderError}</Alert>
            ) : riderDetails ? (
              <Box>
                <Box display="flex" alignItems="center" mb={2}>
                  {riderDetails.riderProfilePic ? (
                    <Avatar 
                      src={riderDetails.riderProfilePic ? 
                        (riderDetails.riderProfilePic.startsWith('http') ? 
                          riderDetails.riderProfilePic : 
                          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/${riderDetails.riderProfilePic}`
                        ) : 
                        null
                      }
                      sx={{ width: 80, height: 80, mr: 2 }}
                    >
                      {riderDetails.riderFirstname?.[0] || 'R'}
                    </Avatar>
                  ) : (
                    <Avatar sx={{ width: 80, height: 80, mr: 2 }}>
                      {riderDetails.riderFirstname?.[0] || 'R'}
                    </Avatar>
                  )}
                  <Box>
                    <Typography variant="h6">
                      {riderDetails.riderFirstname} {riderDetails.riderLastname}
                    </Typography>
                    <Box display="flex" alignItems="center" mt={0.5}>
                      <StarIcon color="warning" />
                      <Typography variant="body2" color="text.secondary" ml={0.5}>
                        {riderDetails.riderRate > 0
                          ? `${riderDetails.riderRate.toFixed(1)}`
                          : 'ยังไม่มีคะแนน'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">เบอร์โทรศัพท์</Typography>
                    <Typography>{riderDetails.riderTel || '-'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">อีเมล</Typography>
                    <Typography>{riderDetails.riderEmail || '-'}</Typography>
                  </Grid>
                  {riderDetails.vehicles && riderDetails.vehicles.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        ยานพาหนะ
                      </Typography>
                      {riderDetails.vehicles.map((vehicle, index) => (
                        <Box key={index} mb={1} p={1.5} bgcolor="#f5f5f5" borderRadius={1}>
                          <Typography>
                            <strong>ยี่ห้อ:</strong> {vehicle.brand || '-'} {vehicle.model || ''}
                          </Typography>
                          <Typography>
                            <strong>ทะเบียน:</strong> {vehicle.plate || '-'}
                          </Typography>
                          <Typography>
                            <strong>ประเภท:</strong> {vehicle.carType === 'motorcycle' ? 'มอเตอร์ไซค์' : 'รถยนต์'}
                          </Typography>
                        </Box>
                      ))}
                    </Grid>
                  )}
                </Grid>
              </Box>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseRiderDialog} color="primary">
              ปิด
            </Button>
          </DialogActions>
        </Dialog>

        {/* Rating Dialog */}
        <Dialog open={ratingDialogOpen} onClose={handleCloseRatingDialog}>
          <DialogTitle>ให้คะแนนไรเดอร์</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
              <Typography component="legend">ให้คะแนนความพึงพอใจ</Typography>
              <Rating
                name="rider-rating"
                value={rating}
                onChange={(event, newValue) => {
                  setRating(newValue);
                  if (newValue) setRatingError('');
                }}
                precision={0.5}
                size="large"
                emptyIcon={<StarIcon style={{ opacity: 0.55 }} fontSize="inherit" />}
              />
              {ratingError && (
                <Typography color="error" variant="caption" sx={{ mt: 1 }}>
                  {ratingError}
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseRatingDialog}>ยกเลิก</Button>
            <Button onClick={handleRatingSubmit} variant="contained" color="primary">
              ยืนยัน
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}

export default StudentDashboard;