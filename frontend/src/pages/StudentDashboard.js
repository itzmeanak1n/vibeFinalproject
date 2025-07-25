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
  Chip,
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
  Alert as MuiAlert,
  FormControl,
  InputLabel,
  Select,
  Badge,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Divider,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  Add as AddIcon, 
  Logout as LogoutIcon, 
  Visibility as VisibilityIcon,
  Notifications as NotificationsIcon,
  Close as CloseIcon,
  Star as StarIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import Rating from '@mui/material/Rating';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import Snackbar from '@mui/material/Snackbar';
// Removed duplicate imports

// Alert component for notifications
const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

function StudentDashboard() {
  const { profile, logout, studentTrips, updateStudentTrips } = useAuth();
  const [openCreateTrip, setOpenCreateTrip] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  // State for managing trip timers
  const [tripTimers, setTripTimers] = useState({});
  const [places, setPlaces] = useState([]);
  const [tripFormData, setTripFormData] = useState({
    carType: 'motorcycle',
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
  
  // Rider dialog state
  const [riderDetails, setRiderDetails] = useState(null);
  const [riderDialogOpen, setRiderDialogOpen] = useState(false);
  const [loadingRider, setLoadingRider] = useState(false);
  const [riderError, setRiderError] = useState('');

  // Rating state
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [currentTripId, setCurrentTripId] = useState(null);
  const [rating, setRating] = useState(0);
  const [ratingError, setRatingError] = useState('');

  // Notification functions
  const addNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50 notifications
  }, []);

  const clearNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Handler functions

  // Rider dialog functions
  const handleOpenRiderDialog = useCallback(async (riderId) => {
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
  }, []);

  const handleCloseRiderDialog = useCallback(() => {
    setRiderDialogOpen(false);
    setRiderDetails(null);
    setRiderError('');
  }, []);

  const handleViewRider = useCallback((riderId) => {
    handleOpenRiderDialog(riderId);
  }, [handleOpenRiderDialog]);

  const handleCancelTrip = useCallback(async (tripId, isAutoCancel = false) => {
    try {
      setLoading(true);
      
      // Call the API to cancel the trip
      const response = await studentService.cancelTrip(tripId);
      
      if (response.data?.success) {
        // Update the trips list with the updated trip from the response
        const updatedTrip = response.data.trip;
        
        // Update the trips list in the state
        updateStudentTrips(prevTrips => 
          prevTrips.map(trip => 
            trip.tripId === updatedTrip.tripId ? updatedTrip : trip
          )
        );
        
        // Show success message
        const message = isAutoCancel 
          ? 'ยกเลิกการจองอัตโนมัติ เนื่องจากไม่มีคนขับรับคำขอ' 
          : 'ยกเลิกการจองเรียบร้อยแล้ว';
          
        setSuccess(message);
        
        // Add notification
        addNotification({
          id: Date.now(),
          message: message,
          type: isAutoCancel ? 'warning' : 'success',
          tripId
        });
      } else {
        throw new Error(response.data?.message || 'ไม่สามารถยกเลิกการจองได้');
      }
    } catch (err) {
      console.error('Error cancelling trip:', err);
      const errorMessage = err.response?.data?.message || 'เกิดข้อผิดพลาดในการยกเลิกการจอง';
      setError(errorMessage);
      
      // Only show error notification if not an auto-cancel
      if (!isAutoCancel) {
        addNotification({
          id: Date.now(),
          message: errorMessage,
          type: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  }, [updateStudentTrips, addNotification]);

  const handleOpenRating = useCallback((tripId, riderId) => {
    setCurrentTripId({ tripId, riderId });
    setRating(0);
    setRatingError('');
    setRatingDialogOpen(true);
  }, []);

  // Handle notification click
  const handleNotificationClick = useCallback((notification) => {
    if (notification.tripId) {
      // Scroll to the trip in the list or show details
      const element = document.getElementById(`trip-${notification.tripId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight the row briefly
        element.style.backgroundColor = 'rgba(25, 118, 210, 0.1)';
        setTimeout(() => {
          if (element) element.style.backgroundColor = '';
        }, 2000);
      }
    }
  }, []);

  // Start countdown timer for a trip
  const startTripTimer = useCallback((tripId) => {
    if (tripTimers[tripId]) {
      clearTimeout(tripTimers[tripId]);
    }

    const timerId = setTimeout(async () => {
      try {
        // Check if the trip is still pending
        const tripsRes = await studentService.getTrips();
        const updatedTrips = Array.isArray(tripsRes?.data) ? tripsRes.data : [];
        const trip = updatedTrips.find(t => t.tripId === tripId);
        
        if (trip && trip.status === 'pending') {
          // Auto-cancel the trip after 2 minutes
          await handleCancelTrip(tripId, true);
          
          // Update the trips list
          const updatedTripsAfterCancel = await studentService.getTrips();
          if (updatedTripsAfterCancel?.data) {
            const tripsData = Array.isArray(updatedTripsAfterCancel.data) 
              ? updatedTripsAfterCancel.data 
              : Object.values(updatedTripsAfterCancel.data || {});
            updateStudentTrips(tripsData);
            
            // Add notification
            addNotification({
              id: Date.now(),
              message: 'Your trip request has timed out and was cancelled.',
              type: 'warning',
              tripId: tripId
            });
          }
        }
      } catch (error) {
        console.error('Error in trip timer:', error);
      } finally {
        // Clean up the timer
        setTripTimers(prev => {
          const newTimers = {...prev};
          delete newTimers[tripId];
          return newTimers;
        });
      }
    }, 2 * 60 * 1000); // 2 minutes

    setTripTimers(prev => ({
      ...prev,
      [tripId]: timerId
    }));
  }, [tripTimers, updateStudentTrips]);

  // Check for trip status changes and add notifications
  const checkTripStatusChanges = useCallback((newTrips) => {
    if (!studentTrips || studentTrips.length === 0) return;

    newTrips.forEach(newTrip => {
      const oldTrip = studentTrips.find(t => t.tripId === newTrip.tripId);
      
      // If trip status changed to 'accepted' and was previously 'pending'
      if (oldTrip && oldTrip.status === 'pending' && newTrip.status === 'accepted') {
        const riderName = newTrip.riderDetails?.riderFirstname || 'a rider';
        addNotification({
          id: Date.now(),
          message: `Your trip has been accepted by ${riderName}!`,
          type: 'success',
          tripId: newTrip.tripId
        });
      }
      
      // If trip status changed to 'cancelled' and was previously 'pending'
      if (oldTrip && oldTrip.status === 'pending' && newTrip.status === 'cancelled') {
        addNotification({
          id: Date.now(),
          message: 'Your trip request has been cancelled.',
          type: 'error',
          tripId: newTrip.tripId
        });
      }
    });
  }, [studentTrips, addNotification]);
  
  // Fetch initial data
  const fetchInitialData = useCallback(async (isBackgroundRefresh = false) => {
    // Store scroll position before refresh if this is a background refresh
    const scrollPosition = isBackgroundRefresh ? window.scrollY : 0;
    
    try {
      if (!isBackgroundRefresh) {
        setLoading(true);
      }
      setError(null);
      
      // Fetch places
      console.log('Fetching places...');
      const placesRes = await studentService.getPlaces();
      
      if (placesRes?.data) {
        const placesData = Array.isArray(placesRes.data) ? placesRes.data : [];
        setPlaces(placesData);
      } else {
        console.warn('No places data received or invalid format');
        setPlaces([]);
      }
      
      // Fetch trips
      console.log('Fetching trips...');
      const tripsRes = await studentService.getTrips();
      
      if (tripsRes?.data) {
        let tripsData = [];
        if (Array.isArray(tripsRes.data)) {
          tripsData = tripsRes.data;
        } else if (typeof tripsRes.data === 'object' && tripsRes.data !== null) {
          tripsData = Object.values(tripsRes.data);
        }
        
        // Check for status changes and add notifications
        if (studentTrips && studentTrips.length > 0) {
          checkTripStatusChanges(tripsData);
        }
        
        updateStudentTrips(tripsData);
      } else {
        console.warn('No trips data received or invalid format');
        updateStudentTrips([]);
      }
      
    } catch (err) {
      console.error('Error fetching student data:', err);
      setError(err.response?.data?.message || 'Failed to fetch student data');
      setPlaces([]);
      updateStudentTrips([]);
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
      // Restore scroll position after state updates
      if (isBackgroundRefresh) {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPosition);
        });
      }
    }
  }, [updateStudentTrips]); // Removed studentTrips from dependencies
  
  // Initial data load
  useEffect(() => {
    console.log('Component mounted, fetching initial data...');
    
    // Create a flag to prevent multiple simultaneous fetches
    let isMounted = true;
    let intervalId = null;
    
    const fetchData = async () => {
      try {
        await fetchInitialData();
      } catch (error) {
        console.error('Error in fetchData:', error);
      } finally {
        if (isMounted) {
          // Set up polling to refresh data every 30 seconds
          intervalId = setInterval(() => {
            // Only refresh if the tab is visible
            if (document.visibilityState === 'visible') {
              console.log('Refreshing data in background...');
              fetchInitialData(true).catch(console.error);
            }
          }, 30000); // Refresh every 30 seconds when tab is active
        }
      }
    };
    
    fetchData();
    
    // Clean up interval on component unmount
    return () => {
      if (intervalId) clearInterval(intervalId);
      isMounted = false;
    };
  }, [fetchInitialData]);

  const renderTripStatus = (status, trip) => {
    if (!status) return <Chip label="ไม่ทราบสถานะ" color="default" size="small" variant="outlined" />;
    
    // Check if this is an auto-cancelled trip
    const isAutoCancelled = status.toLowerCase() === 'cancelled' && 
      trip?.createdAt && 
      (new Date() - new Date(trip.createdAt)) >= 120000; // 2 minutes in ms
    
    const statusMap = {
      'pending': { 
        label: 'รอคนขับรับคำขอ', 
        color: 'warning',
        variant: 'outlined',
        description: 'กำลังหาคนขับให้คุณ กรุณารอสักครู่...'
      },
      'accepted': { 
        label: 'มีคนขับรับคำขอแล้ว', 
        color: 'info',
        variant: 'filled',
        description: 'คนขับกำลังเดินทางมารับคุณ'
      },
      'completed': { 
        label: 'เสร็จสิ้น', 
        color: 'success',
        variant: 'filled',
        description: 'การเดินทางเสร็จสมบูรณ์'
      },
      'cancelled': { 
        label: isAutoCancelled ? 'ยกเลิกอัตโนมัติ' : 'ยกเลิก', 
        color: 'error',
        variant: 'filled',
        description: isAutoCancelled 
          ? 'ยกเลิกอัตโนมัติ เนื่องจากไม่มีคนขับรับคำขอ' 
          : 'การจองถูกยกเลิก'
      },
      'success': { 
        label: 'สำเร็จ', 
        color: 'success',
        variant: 'filled',
        description: 'การเดินทางเสร็จสมบูรณ์'
      },
      'rejected': { 
        label: 'ถูกปฏิเสธ', 
        color: 'error',
        variant: 'filled',
        description: 'คำขอของคุณถูกปฏิเสธ'
      }
    };
    
    const statusInfo = statusMap[status.toLowerCase()] || { 
      label: status, 
      color: 'default',
      variant: 'outlined',
      description: `สถานะ: ${status}`
    };
    
    return (
      <Tooltip title={statusInfo.description} arrow>
        <Chip 
          label={statusInfo.label} 
          color={statusInfo.color} 
          size="small"
          variant={statusInfo.variant}
          sx={{
            fontWeight: 'bold',
            minWidth: '120px',
            justifyContent: 'center'
          }}
        />
      </Tooltip>
    );
  };

  // Add a state to force re-renders for the countdown
  const [countdownTick, setCountdownTick] = useState(0);

  // Effect to update the countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdownTick(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Render trip action buttons based on trip status
  const renderTripAction = useCallback((trip) => {
    // Force re-render by using the countdownTick
    const forceUpdate = countdownTick;
    
    // Handle completed trips with ratings
    if (trip.status === 'completed' && trip.userRate) {
      return (
        <Box display="flex" alignItems="center">
          <Rating
            value={parseFloat(trip.userRate)}
            precision={0.5}
            readOnly
            size="small"
            emptyIcon={<StarIcon style={{ opacity: 0.55 }} fontSize="inherit" />}
          />
          <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
            Rated
          </Typography>
        </Box>
      );
    }
    
    // Handle cancelled trips
    if (trip.status === 'cancelled') {
      return (
        <Typography variant="body2" color="error">
          Cancelled
        </Typography>
      );
    }
    
    // Handle pending trips with countdown
    if (trip.status === 'pending') {
      const tripCreateTime = new Date(trip.createdAt || new Date()).getTime();
      const now = new Date().getTime();
      const timeElapsed = now - tripCreateTime;
      const timeRemaining = Math.max(0, 120000 - timeElapsed); // 2 minutes in ms
      
      // Format the remaining time
      const minutes = Math.floor(timeRemaining / 60000);
      const seconds = Math.floor((timeRemaining % 60000) / 1000);
      
      // Start the auto-cancellation timer if not already started
      if (timeRemaining > 0) {
        if (!tripTimers[trip.tripId]) {
          const timerId = setTimeout(() => {
            handleCancelTrip(trip.tripId, true);
            setTripTimers(prev => {
              const newTimers = { ...prev };
              delete newTimers[trip.tripId];
              return newTimers;
            });
          }, timeRemaining);
          
          setTripTimers(prev => ({
            ...prev,
            [trip.tripId]: timerId
          }));
        }
        
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              ยกเลิกอัตโนมัติใน
            </Typography>
            <Typography variant="body2" color="error" fontWeight="bold">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </Typography>
          </Box>
        );
      } else {
        return (
          <Typography variant="body2" color="error" fontWeight="bold">
            กำลังยกเลิก...
          </Typography>
        );
      }
    }
    
    // Default return for any other status
    return null;
  }, [tripTimers, handleCancelTrip, countdownTick]);

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
    if (newValue) {
      // Convert to ISO string in local timezone without timezone offset
      const localDate = dayjs(newValue).format('YYYY-MM-DDTHH:mm');
      setTripFormData(prev => ({
        ...prev,
        date: localDate
      }));
    }
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
      // Convert date to ISO string if it's a Day.js object
      const dateValue = dayjs.isDayjs(tripFormData.date) 
        ? tripFormData.date.format('YYYY-MM-DDTHH:mm')
        : tripFormData.date;
      
      // Ensure the date string has seconds
      const formattedDate = dateValue.includes('T') 
        ? (dateValue.split(':').length === 2 ? `${dateValue}:00` : dateValue)
        : dateValue;
      
      const tripData = {
        carType: tripFormData.carType,
        placeIdPickUp: tripFormData.placeIdPickUp,
        placeIdDestination: tripFormData.placeIdDestination,
        date: formattedDate,
        is_round_trip: Boolean(tripFormData.is_round_trip)
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Submitting trip with date:', {
          original: tripFormData.date,
          formatted: formattedDate,
          fullData: tripData
        });
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

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      Object.values(tripTimers).forEach(timerId => {
        if (timerId) clearTimeout(timerId);
      });
    };
  }, [tripTimers]);

  return (
    <Container maxWidth="lg" sx={{ position: 'relative' }}>
      {/* Notification Snackbar */}
      <Snackbar 
        open={notifications.length > 0 && !showNotifications} 
        autoHideDuration={6000} 
        onClose={clearAllNotifications}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 6 }}
      >
        <Alert 
          onClose={clearAllNotifications} 
          severity={notifications[0]?.type || 'info'}
          sx={{ width: '100%' }}
        >
          {notifications[0]?.message || 'New notification'}
        </Alert>
      </Snackbar>
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
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="การแจ้งเตือน">
              <IconButton 
                color="primary"
                onClick={() => setShowNotifications(!showNotifications)}
                sx={{ 
                  bgcolor: 'primary.light',
                  '&:hover': { bgcolor: 'primary.main' }
                }}
              >
                <Badge badgeContent={notifications.length} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
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
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3, position: 'relative' }}>
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

          {/* Notifications Panel */}
          {showNotifications && (
            <Grid item xs={12} md={4} sx={{ position: 'fixed', right: 20, top: 80, zIndex: 1200 }}>
              <Paper sx={{ p: 2, maxHeight: '60vh', overflow: 'auto' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Notifications</Typography>
                  <Button 
                    size="small" 
                    onClick={clearAllNotifications}
                    disabled={notifications.length === 0}
                  >
                    Clear All
                  </Button>
                </Box>
                {notifications.length === 0 ? (
                  <Typography variant="body2" color="textSecondary" sx={{ p: 2, textAlign: 'center' }}>
                    No new notifications
                  </Typography>
                ) : (
                  <List>
                    {notifications.map((notification) => (
                      <ListItem 
                        key={notification.id}
                        button 
                        onClick={() => handleNotificationClick(notification)}
                        sx={{ 
                          mb: 1, 
                          borderRadius: 1,
                          '&:hover': { bgcolor: 'action.hover' } 
                        }}
                      >
                        <ListItemText 
                          primary={notification.message} 
                          secondary={new Date(notification.id).toLocaleString()}
                        />
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            clearNotification(notification.id);
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
          )}

          <Grid item xs={12}>
            <Box sx={{ mt: 4, mb: 4, position: 'relative' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h5" component="h2">
                  Your Trips
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenCreateTrip(true)}
                >
                  New Trip Request
                </Button>
              </Box>
              
              <Paper sx={{ width: '100%', overflow: 'hidden', mb: 4 }}>
                <TableContainer>
                  <Table>
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
                            {renderTripStatus(trip.status, trip)}
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
            </Box>
          </Grid>
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

              <LocalizationProvider 
                dateAdapter={AdapterDayjs}
                adapterLocale="th"
              >
                <DateTimePicker
                  label="เวลาที่ต้องการเดินทาง"
                  value={tripFormData.date ? dayjs(tripFormData.date) : null}
                  onChange={handleDateChange}
                  sx={{ mt: 2, width: '100%' }}
                  minDateTime={dayjs()}
                  format="DD/MM/YYYY HH:mm"
                  ampm={false}
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
