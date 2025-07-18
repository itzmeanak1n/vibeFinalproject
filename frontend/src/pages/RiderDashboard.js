import React, {
  useState,
  useEffect,
  memo,
  useCallback,
  useMemo
} from "react";
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
  Chip,
  CircularProgress,
  Snackbar,
  Rating,
  Stack,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { riderService } from "../services/api";
import { useNavigate } from "react-router-dom";
import LogoutIcon from "@mui/icons-material/Logout";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import VisibilityIcon from "@mui/icons-material/Visibility";
import StarIcon from '@mui/icons-material/Star';
import axios from "axios";

const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzY2NiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yMCAyMXYtMmE0IDQgMCAwIDAtNC00SDhhNCA0IDAgMCAwLTQgNHYyIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSI3IiByPSI0Ii8+PC9zdmc+';

// ฟังก์ชันช่วยสร้าง URL รูปภาพ
const getImageUrl = (filename) => {
  if (!filename) return '';
  
  // ถ้าชื่อไฟล์ขึ้นต้นด้วย 'http' ให้คืนค่าเป็นชื่อไฟล์นั้นเลย (URL ภายนอก)
  if (filename.startsWith('http')) {
    return filename;
  }
  
  // รับ URL ฐานจากตัวแปรสภาพแวดล้อมหรือใช้ URL ปัจจุบัน
  const baseUrl = process.env.REACT_APP_API_URL || window.location.origin;
  
  // ลบเครื่องหมาย / หรือคำว่า uploads/ ที่อยู่หน้าชื่อไฟล์เพื่อป้องกันการซ้ำ
  const cleanFilename = filename.replace(/^(\/|\\|uploads[\\/])*/, '');
  
  // สร้าง URL เต็มรูปแบบ
  return `${baseUrl}/uploads/${cleanFilename}`;
};

function RiderDashboard(
  {
    /* props หากมีจาก parent */
  }
) {
  const {
    user,
    profile,
    updateRiderPendingTrips,
    logout,
    updateProfileInContext,
    riderPendingTrips: contextPendingTrips = []
  } = useAuth();

  // Debug: Log profile data when it changes
  useEffect(() => {
    console.log('=== RiderDashboard Profile Data ===');
    console.log('Profile object:', profile);
    if (profile) {
      console.log('Profile keys:', Object.keys(profile));
      console.log('riderRate in profile:', profile.riderRate);
      console.log('Type of riderRate:', typeof profile.riderRate);
    }
  }, [profile]);

  // Debug: Log profile data when it changes
  useEffect(() => {
    console.log('Profile data in RiderDashboard:', profile);
    if (profile) {
      console.log('riderRate in profile:', profile.riderRate);
      console.log('All profile keys:', Object.keys(profile));
      
      // Check if riderRate exists in profile
      if (profile.riderRate === undefined || profile.riderRate === null) {
        console.warn('riderRate is not defined in profile data');
      } else {
        console.log('riderRate value:', profile.riderRate, 'type:', typeof profile.riderRate);
      }
    }
  }, [profile]);
  
  const [success, setSuccess] = useState('');
  
  // State management
  const [vehicles, setVehicles] = useState([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [openVehicleDialog, setOpenVehicleDialog] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState(null);
  const [vehicleFormData, setVehicleFormData] = useState({
    carType: "",
    plate: "",
    brand: "",
    model: "",
  });
  const [vehicleFiles, setVehicleFiles] = useState({
    insurancePhoto: null,
    carPhoto: null,
  });
  const [vehicleError, setVehicleError] = useState("");
  const navigate = useNavigate();
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    riderFirstname: "",
    riderLastname: "",
    riderTel: "",
    riderAddress: "",
    riderEmail: "",
    riderNationalId: "",
  });
  const [profileError, setProfileError] = useState("");
  const [error, setError] = useState(null);
  const [activeTrips, setActiveTrips] = useState([]);
  const [pendingTrips, setPendingTrips] = useState([]);
  const [activeTab, setActiveTab] = useState('active');
  const [tripHistory, setTripHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileFiles, setProfileFiles] = useState({
    RiderProfilePic: null,
    RiderStudentCard: null,
    QRscan: null,
    riderLicense: null
  });
  const [cachedData, setCachedData] = useState({
    vehicles: null,
    activeTrips: null,
    pendingTrips: null
  });
  const [debounceTimer, setDebounceTimer] = useState(null);

  // Enhanced date formatter with better error handling and timezone support
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'ไม่ระบุ';
    
    try {
      const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Bangkok' // Ensure consistent timezone
      };
      
      // Handle both string timestamps and Date objects
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'วันที่ไม่ถูกต้อง';
      }
      
      // Format the date in Thai locale
      return new Intl.DateTimeFormat('th-TH', options).format(date);
    } catch (error) {
      console.error('Error formatting date:', error, 'Input:', dateString);
      return 'วันที่ไม่ถูกต้อง';
    }
  }, []);

  const fetchActiveTrips = useCallback(async () => {
    try {
      console.log('Fetching active trips...');
      const response = await riderService.getActiveTrips();
      console.log('Active trips raw response:', response);
      
      let tripsData = [];
      if (Array.isArray(response)) {
        tripsData = response;
      } else if (response?.data && Array.isArray(response.data)) {
        tripsData = response.data;
      }

      setActiveTrips(tripsData);
      
      if (tripsData.length > 0) {
        setActiveTab('active');
      }
      
      return tripsData;
    } catch (error) {
      console.error('Error fetching active trips:', error);
      setError('ไม่สามารถโหลดข้อมูลการเดินทางที่กำลังดำเนินการได้');
      setActiveTrips([]);
      throw error;
    }
  }, []);

  const handleAcceptTrip = useCallback(async (tripId) => {
    console.log('=== Start handleAcceptTrip ===');
    console.log('tripId:', tripId);
    console.log('user:', user);
    console.log('profile:', profile);

    if (!tripId) {
      console.error('No trip ID provided');
      setError('ไม่พบรหัสการเดินทาง');
      return;
    }

    if (!user || !profile) {
      console.error('No user or profile data');
      setError('ไม่พบข้อมูลผู้ใช้');
      return;
    }

    try {
      console.log('Sending request to acceptTrip with:', { tripId, riderId: user.id });
      const response = await riderService.acceptTrip(tripId, user.id);
      console.log('Accept trip response:', response);

      if (response.success) {
        // อัพเดทรายการงานที่รอการตอบรับ
        await updateRiderPendingTrips();
        // อัพเดทรายการงานที่กำลังดำเนินการ
        await fetchActiveTrips();
        // เปลี่ยนแท็บไปที่งานที่กำลังดำเนินการ
        setActiveTab('active');
        setError(null);
      } else {
        setError(response.message || 'ไม่สามารถรับงานได้');
      }
    } catch (error) {
      console.error('Error in handleAcceptTrip:', error);
      setError(error.message || 'ไม่สามารถรับงานได้');
    }
    console.log('=== End handleAcceptTrip ===');
  }, [user, profile, updateRiderPendingTrips, fetchActiveTrips]);

  const fetchTripHistory = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoadingHistory(true);
      console.log('Fetching trip history...');
      const response = await riderService.getTripHistory();
      console.log('Raw trip history response:', response);
      
      // Log the first trip to inspect its structure
      if (Array.isArray(response) && response.length > 0) {
        console.log('First trip data:', response[0]);
        console.log('All available trip fields:', Object.keys(response[0]));
        
        // Log all place-related fields
        console.log('Place-related fields:');
        console.log('pickUpName:', response[0].pickUpName);
        console.log('destinationName:', response[0].destinationName);
        console.log('pickUpPlaceName:', response[0].pickUpPlaceName);
        console.log('destinationPlaceName:', response[0].destinationPlaceName);
        console.log('placeIdPickUp:', response[0].placeIdPickUp);
        console.log('placeIdDestination:', response[0].placeIdDestination);
        
        // Log SQL query structure for debugging
        console.log('Check if place names are being joined correctly in SQL');
      }
      
      if (Array.isArray(response)) {
        console.log('Setting trip history with array of length:', response.length);
        setTripHistory(response);
      } else if (response?.data && Array.isArray(response.data)) {
        console.log('Setting trip history from response.data, length:', response.data.length);
        setTripHistory(response.data);
      } else {
        console.log('No valid trip data found, setting empty array');
        setTripHistory([]);
      }
    } catch (error) {
      console.error('Error fetching trip history:', error);
      setTripHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user?.id]);

  const fetchVehicles = useCallback(async () => {
    if (!user?.id) return;
    
    if (cachedData.vehicles) {
      setVehicles(cachedData.vehicles);
      return;
    }

    setIsLoadingVehicles(true);
    setVehicleError("");
    try {
      const response = await riderService.getVehicles();
      const vehiclesData = response.data || [];
      setVehicles(vehiclesData);
      setCachedData(prev => ({ ...prev, vehicles: vehiclesData }));
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      setVehicleError("ไม่สามารถโหลดข้อมูลยานพาหนะได้");
    } finally {
      setIsLoadingVehicles(false);
    }
  }, [user?.id, cachedData.vehicles]);

  const handleVehicleSubmit = useCallback(async () => {
    try {
      const formData = new FormData();
      Object.keys(vehicleFormData).forEach((key) => {
        if (vehicleFormData[key]) {
          formData.append(key, vehicleFormData[key]);
        }
      });
      if (vehicleFiles.insurancePhoto) {
        formData.append("insurancePhoto", vehicleFiles.insurancePhoto);
      }
      if (vehicleFiles.carPhoto) {
        formData.append("carPhoto", vehicleFiles.carPhoto);
      }

      if (currentVehicle) {
        console.log(
          "Attempting to update vehicle with carId:",
          currentVehicle.carId
        );
        await riderService.updateVehicle(currentVehicle.carId, formData);
      } else {
        console.log("Attempting to add new vehicle");
        await riderService.addVehicle(formData);
      }
      setOpenVehicleDialog(false);
      fetchVehicles();
    } catch (err) {
      console.error("Error submitting vehicle:", err);
      setVehicleError(
        err.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
      );
    }
  }, [
    currentVehicle,
    fetchVehicles,
    riderService,
    vehicleFormData,
    vehicleFiles,
  ]);

  const handleDeleteVehicle = useCallback(
    async (carId) => {
      if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบยานพาหนะนี้?")) {
        setVehicleError("");
        try {
          await riderService.deleteVehicle(carId);
          fetchVehicles();
        } catch (err) {
          console.error("Error deleting vehicle:", err);
          setVehicleError(
            err.response?.data?.message || "เกิดข้อผิดพลาดในการลบข้อมูล"
          );
        }
      }
    },
    [fetchVehicles, riderService]
  );

  const handleFileChange = useCallback(
    (e, field) => {
      setVehicleFiles({
        ...vehicleFiles,
        [field]: e.target.files[0],
      });
    },
    [vehicleFiles]
  );

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

  // โหลดประวัติการทำงานเมื่อเปลี่ยนแท็บ
  useEffect(() => {
    if (activeTab === 'history') {
      fetchTripHistory();
    }
  }, [activeTab, fetchTripHistory]);

  const handleOpenVehicleDialog = useCallback(
    (vehicle) => {
      setCurrentVehicle(vehicle);
      setOpenVehicleDialog(true);
      if (vehicle) {
        setVehicleFormData({
          carType: vehicle.carType,
          plate: vehicle.plate,
          brand: vehicle.brand,
          model: vehicle.model,
        });
        setVehicleFiles({
          insurancePhoto: vehicle.insurancePhoto,
          carPhoto: vehicle.carPhoto,
        });
      } else {
        setVehicleFormData({
          carType: "",
          plate: "",
          brand: "",
          model: "",
        });
        setVehicleFiles({
          insurancePhoto: null,
          carPhoto: null,
        });
      }
      setVehicleError(""); // Clear any previous errors when opening the dialog
    },
    [
      setOpenVehicleDialog,
      setCurrentVehicle,
      setVehicleFormData,
      setVehicleFiles,
    ]
  );

  const handleOpenProfileEditDialog = useCallback(() => {
    setProfileError("");
    setProfileFormData({
      riderFirstname: profile?.riderFirstname || "",
      riderLastname: profile?.riderLastname || "",
      riderTel: profile?.riderTel || "",
      riderAddress: profile?.riderAddress || "",
      riderEmail: profile?.riderEmail || "",
      riderNationalId: profile?.riderNationalId || "",
    });
    setOpenProfileDialog(true);
  }, [profile, setOpenProfileDialog, setProfileFormData]);

  const handleCloseProfileDialog = useCallback(() => {
    setOpenProfileDialog(false);
    setProfileError("");
  }, [setOpenProfileDialog]);

  const handleProfileFormChange = (e) => {
    const { name, value } = e.target;
    setProfileFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setProfileError('');
    
    try {
      const formDataToSend = new FormData();
      
      // Add non-empty form fields
      Object.entries(profileFormData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          formDataToSend.append(key, value);
        }
      });

      // Add files if they exist
      Object.entries(profileFiles).forEach(([key, file]) => {
        if (file instanceof File) {
          formDataToSend.append(key, file);
        }
      });

      // Add riderId if available
      if (profile?.riderId) {
        formDataToSend.append('riderId', profile.riderId);
      }

      console.log('Sending profile update with data:', {
        ...Object.fromEntries(formDataToSend.entries()),
        files: Object.keys(profileFiles).filter(key => profileFiles[key] instanceof File)
      });

      // Make the API call
      const response = await riderService.updateProfile(formDataToSend);
      
      console.log('Profile update response:', response);

      if (response && response.data) {
        setSuccess('อัปเดตโปรไฟล์สำเร็จ');
        
        // Update context with new profile data
        updateProfileInContext(response.data);
        
        // Reset file inputs
        setProfileFiles({
          RiderProfilePic: null,
          RiderStudentCard: null,
          QRscan: null,
          riderLicense: null
        });
        
        // Refresh the profile data
        try {
          const profileResponse = await riderService.getProfile();
          if (profileResponse.data) {
            updateProfileInContext(profileResponse.data);
          }
        } catch (refreshError) {
          console.error('Error refreshing profile:', refreshError);
        }
        
        // Close the dialog after a short delay
        setTimeout(() => {
          handleCloseProfileDialog();
        }, 1500);
      } else {
        throw new Error(response?.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', {
        error: err,
        response: err.response?.data,
        status: err.response?.status
      });
      
      // Handle 401 specifically
      if (err.response?.status === 401) {
        setProfileError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
      } else {
        const errorMessage = err.response?.data?.message || 
                           err.message || 
                           'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์';
        setProfileError(errorMessage);
      }
    }
  };

  // เพิ่มฟังก์ชันสำหรับจัดการการเปลี่ยนไฟล์
  const handleProfileFileChange = useCallback((e, field) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log(`เลือกไฟล์ ${field}:`, {
        name: file.name,
        size: file.size,
        type: file.type
      });
      setProfileFiles(prev => ({
        ...prev,
        [field]: file
      }));
    }
  }, []);

  // อัพเดท state เริ่มต้นของ profileFormData
  useEffect(() => {
    if (profile) {
      setProfileFormData({
        riderFirstname: profile.riderFirstname || "",
        riderLastname: profile.riderLastname || "",
        riderTel: profile.riderTel || "",
        riderAddress: profile.riderAddress || "",
        riderEmail: profile.riderEmail || "",
        riderNationalId: profile.riderNationalId || ""
      });
    }
  }, [profile]);

  const handleRejectTrip = useCallback(
    async (tripId) => {
      try {
        setError(null);
        await riderService.rejectTrip(tripId);
        await updateRiderPendingTrips();
      } catch (err) {
        setError(err.toString());
      }
    },
    [updateRiderPendingTrips]
  );

  const renderVehicleTable = useCallback(
    () => (
      <Paper sx={{ p: 2, mt: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6">ยานพาหนะของฉัน</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenVehicleDialog(null)} // Pass null for adding new vehicle
          >
            เพิ่มยานพาหนะ
          </Button>
        </Box>
        {vehicleError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {vehicleError}
          </Alert>
        )}
        {isLoadingVehicles ? (
          <Typography>กำลังโหลดยานพาหนะ...</Typography>
        ) : vehicles.length === 0 ? (
          <Typography>คุณยังไม่มียานพาหนะ</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ประเภท</TableCell>
                  <TableCell>ป้ายทะเบียน</TableCell>
                  <TableCell>ยี่ห้อ</TableCell>
                  <TableCell>รุ่น</TableCell>
                  <TableCell>รูปภาพ</TableCell>
                  <TableCell align="right">การจัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.carId}>
                    <TableCell>{vehicle.carType}</TableCell>
                    <TableCell>{vehicle.plate}</TableCell>
                    <TableCell>{vehicle.brand}</TableCell>
                    <TableCell>{vehicle.model}</TableCell>
                    <TableCell>
                      <img
                        src={getVehicleImageUrl(vehicle.carPhoto)}
                        alt="รูปรถ"
                        style={{
                          height: 40,
                          width: "auto",
                          objectFit: "contain"
                        }}
                        onError={(e) => handleImageError(e, 'car photo')}
                      />
                      {vehicle.insurancePhoto && (
                        <img
                          src={getVehicleImageUrl(vehicle.insurancePhoto)}
                          alt="รูปประกัน"
                          style={{
                            height: 40,
                            width: "auto",
                            marginLeft: 5,
                            objectFit: "contain"
                          }}
                          onError={(e) => handleImageError(e, 'insurance photo')}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="แก้ไข">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenVehicleDialog(vehicle)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="ลบ">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteVehicle(vehicle.carId)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    ),
    [
      vehicles,
      isLoadingVehicles,
      vehicleError,
      handleOpenVehicleDialog,
      handleDeleteVehicle,
    ]
  );

  // Remove unused fetchPlaces function

  // Remove unused updateRiderPendingTripsEffect function

  // Sync context pending trips to local state
  useEffect(() => {
    if (contextPendingTrips && contextPendingTrips.length > 0) {
      setPendingTrips(prev => {
        const newTrips = Array.isArray(contextPendingTrips) ? contextPendingTrips : [];
        return JSON.stringify(prev) === JSON.stringify(newTrips) ? prev : newTrips;
      });
    } else {
      setPendingTrips([]);
    }
  }, [JSON.stringify(contextPendingTrips)]); // Use stringified version for comparison

  // Main data fetching effect with optimized dependencies
  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const fetchData = async () => {
      if (!user?.id) {
        console.log('No user ID, skipping data fetch');
        return;
      }

      try {
        console.log(`Fetching data for tab: ${activeTab}`);
        
        // Clear any pending debounce
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        
        // Use debounce to prevent rapid successive calls
        timeoutId = setTimeout(async () => {
          try {
            // Only fetch vehicles if we don't have them yet
            if (!cachedData.vehicles) {
              const vehiclesRes = await riderService.getVehicles();
              const vehiclesData = Array.isArray(vehiclesRes?.data) ? vehiclesRes.data : [];
              if (isMounted) {
                setVehicles(vehiclesData);
                // Update cache without triggering effect re-run
                setCachedData(prev => ({
                  ...prev,
                  vehicles: vehiclesData
                }));
              }
            }

            // Fetch data based on active tab
            if (activeTab === 'pending') {
              // Don't await here to prevent blocking
              updateRiderPendingTrips().catch(console.error);
            } else if (activeTab === 'active') {
              const activeRes = await riderService.getActiveTrips();
              const activeTripsData = Array.isArray(activeRes) ? activeRes : (activeRes?.data || []);
              if (isMounted) {
                setActiveTrips(activeTripsData);
              }
            }
          } catch (error) {
            console.error('Error fetching data:', error);
            setError(error.message);
          } finally {
            if (isMounted) {
              setIsLoading(false);
            }
          }
        }, 300);

        setDebounceTimer(prevTimer => {
          if (prevTimer) clearTimeout(prevTimer);
          return timeoutId;
        });
      } catch (error) {
        console.error('Error in fetchData:', error);
        if (isMounted) {
          setError(error.message);
          setIsLoading(false);
        }
      }
    };

    // Only run fetchData when activeTab or user.id changes
    if (activeTab && user?.id) {
      setIsLoading(true);
      fetchData();
    }

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [activeTab, user?.id]); // Simplified dependencies

  useEffect(() => {
    console.log('Active trips updated:', activeTrips);
  }, [activeTrips]);

  useEffect(() => {
    console.log('Component state updated:', {
      activeTab,
      isLoading,
      activeTripsLength: activeTrips.length,
      pendingTripsLength: pendingTrips.length,
      activeTrips,
      pendingTrips,
      error
    });
  }, [activeTab, isLoading, activeTrips, pendingTrips, error]);

  // Remove unused getPlaceName function

  const renderActiveTrips = useCallback((trip) => (
    <TableRow key={trip.tripId}>
      <TableCell>{formatDate(trip.date)}</TableCell>
      <TableCell>{trip.studentName || `${trip.studentFirstname} ${trip.studentLastname}`}</TableCell>
      <TableCell>{trip.studentTel}</TableCell>
      <TableCell>{trip.pickUpName}</TableCell>
      <TableCell>{trip.destinationName}</TableCell>
      <TableCell>{trip.is_round_trip === '1' ? 'ไป-กลับ' : 'เที่ยวเดียว'}</TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="ดูรายละเอียด">
            <IconButton
              color="primary"
              onClick={() => {
                console.log('Viewing trip details:', trip);
                navigate(`/rider/trips/${trip.tripId}`);
              }}
            >
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  ), [formatDate, navigate]);
  const handleImageError = useCallback((e, imageType) => {
    console.log(`Error loading ${imageType}:`, {
      src: e.target.src,
      error: e,
      profile: profile,
      vehicle: imageType.includes('car') || imageType.includes('insurance') ? vehicles.find(v => v.carPhoto === e.target.src.split('/').pop() || v.insurancePhoto === e.target.src.split('/').pop()) : null
    });

    if (imageType === 'profile picture') {
      e.target.src = defaultAvatar;
    } else if (imageType === 'QR code') {
      const currentSrc = e.target.src;
      setTimeout(() => {
        if (e.target) {
          const retryUrl = currentSrc.includes('/uploads/') 
            ? currentSrc 
            : `http://localhost:5000/${profile.QRscan}`;
          e.target.src = retryUrl;
        }
      }, 1000);
    } else {
      e.target.style.display = 'none';
    }
  }, [profile, vehicles]);

  const getImageUrl = useCallback((filename) => {
    if (!filename) return defaultAvatar;
    
    if (filename.startsWith('http')) {
      return filename;
    }
    // ถ้าไม่มี uploads/ นำหน้า ให้เพิ่มเข้าไป
    if (!filename.startsWith('uploads/')) {
      return `http://localhost:5000/${filename}`;
    }
    return `http://localhost:5000/${filename}`;
  }, []);

  const getVehicleImageUrl = useCallback((filename) => {
    if (!filename) return defaultAvatar;
    
    if (filename.startsWith('http')) {
      return filename;
    }
    
    // Remove any leading slashes or uploads/ from filename
    const cleanFilename = filename.replace(/^(\/|\\|uploads[\\/])*/, '');
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    
    // For vehicle images, they're stored in the vehicles/ subdirectory
    // Check if this is a vehicle image (carPhoto or insurancePhoto)
    if (cleanFilename.includes('carPhoto') || cleanFilename.includes('insurancePhoto')) {
      return `${baseUrl}/uploads/vehicles/${cleanFilename}`;
    }
    
    // For other images, use the standard path
    return `${baseUrl}/uploads/${cleanFilename}`;
  }, []);

  // แสดงข้อมูล profile เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    if (profile) {
      console.log('Raw profile image data:', {
        RiderProfilePic: profile.RiderProfilePic,
        RiderStudentCard: profile.RiderStudentCard,
        QRscan: profile.QRscan,
        riderLicense: profile.riderLicense
      });
    }
  }, [profile]);

  // แสดงข้อมูล vehicles เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    if (vehicles.length > 0) {
      console.log('Raw vehicle image data:', vehicles.map(v => ({
        carId: v.carId,
        carPhoto: v.carPhoto,
        insurancePhoto: v.insurancePhoto
      })));
    }
  }, [vehicles]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar 
    sx={{ bgcolor: "secondary.main", width: 56, height: 56 }}
    src={getImageUrl(profile?.RiderProfilePic)}
  >
    {!profile?.RiderProfilePic && (
      <>{profile?.riderFirstname?.[0]}{profile?.riderLastname?.[0]}</>
    )}
  </Avatar>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="h4" component="div">
                  สวัสดี, {profile?.riderFirstname} {profile?.riderLastname}
                </Typography>
                <Box sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  bgcolor: profile?.riderRate != null ? 'primary.light' : 'grey.300',
                  color: profile?.riderRate != null ? 'primary.contrastText' : 'text.secondary',
                  borderRadius: 1,
                  px: 1,
                  py: 0.5,
                  ml: 1
                }}>
                  {profile?.riderRate != null ? (
                    <>
                      <StarIcon fontSize="small" sx={{ mr: 0.5 }} />
                      <Typography variant="subtitle2" sx={{ lineHeight: 1 }}>
                        {parseFloat(profile.riderRate).toFixed(1)}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="subtitle2" sx={{ lineHeight: 1, fontSize: '0.75rem' }}>
                      ยังไม่มีคะแนน
                    </Typography>
                  )}
                </Box>
                <Tooltip title="แก้ไขโปรไฟล์">
                  <IconButton
                    onClick={handleOpenProfileEditDialog}
                    size="small"
                    sx={{ ml: 1 }}
                  >
                    <EditIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>
          <Tooltip title="ออกจากระบบ">
            <IconButton
              color="error"
              onClick={handleLogout}
              sx={{
                bgcolor: "error.light",
                "&:hover": { bgcolor: "error.main" },
              }}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {renderVehicleTable()}

      <Box sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  {activeTab === 'pending' ? 'งานที่รอการตอบรับ' : 
                   activeTab === 'active' ? 'งานที่กำลังดำเนินการ' : 
                   'ประวัติการทำงาน'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant={activeTab === 'pending' ? 'contained' : 'outlined'}
                    onClick={() => setActiveTab('pending')}
                  >
                    งานที่รอการตอบรับ
                  </Button>
                  <Button
                    variant={activeTab === 'active' ? 'contained' : 'outlined'}
                    onClick={() => setActiveTab('active')}
                  >
                    งานที่กำลังดำเนินการ
                  </Button>
                  <Button
                    variant={activeTab === 'history' ? 'contained' : 'outlined'}
                    onClick={() => setActiveTab('history')}
                  >
                    ประวัติการทำงาน
                  </Button>
                </Box>
              </Box>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              {activeTab === 'pending' && (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>วันที่</TableCell>
                        <TableCell>ประเภทรถ</TableCell>
                        <TableCell>ต้นทาง</TableCell>
                        <TableCell>ปลายทาง</TableCell>
                        <TableCell>ประเภท</TableCell>
                        <TableCell>สถานะ</TableCell>
                        <TableCell>การจัดการ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                              <CircularProgress />
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : pendingTrips.length > 0 ? (
                        pendingTrips.map((trip) => (
                          <TableRow key={trip.tripId}>
                            <TableCell>{formatDate(trip.date)}</TableCell>
                            <TableCell>{trip.vehicleType}</TableCell>
                            <TableCell>{trip.pickUpName || 'ไม่ระบุ'}</TableCell>
                            <TableCell>{trip.destinationName || 'ไม่ระบุ'}</TableCell>
                            <TableCell>{trip.is_round_trip === '1' ? 'ไป-กลับ' : 'เที่ยวเดียว'}</TableCell>
                            <TableCell>
                              <Chip 
                                label={trip.status === 'pending' ? 'รอดำเนินการ' : trip.status}
                                color={trip.status === 'pending' ? 'warning' : 'default'}
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Tooltip title="รับงาน">
                                  <IconButton
                                    color="success"
                                    onClick={() => {
                                      console.log("Trip data:", trip);
                                      if (trip && trip.tripId) {
                                        handleAcceptTrip(trip.tripId);
                                      } else {
                                        console.error("Invalid trip data:", trip);
                                        setError("ไม่พบข้อมูลการเดินทาง");
                                      }
                                    }}
                                  >
                                    <CheckCircleIcon />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            ไม่มีงานที่รอการตอบรับ
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {activeTab === 'history' && (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>รหัสการเดินทาง</TableCell>
                        <TableCell>รหัสนักศึกษา</TableCell>
                        <TableCell>จุดนัดรับ</TableCell>
                        <TableCell>จุดหมายปลายทาง</TableCell>
                        <TableCell>วันที่/เวลา</TableCell>
                        <TableCell>ประเภทรถ</TableCell>
                        <TableCell>สถานะ</TableCell>
                        <TableCell>ไป-กลับ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {isLoadingHistory ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                              <CircularProgress />
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : tripHistory.length > 0 ? (
                        tripHistory.map((trip) => (
                          <TableRow key={trip.tripId}>
                            <TableCell>{trip.tripId}</TableCell>
                            <TableCell>{trip.studentId}</TableCell>
                            <TableCell>{trip.pickUpName || trip.pickUpPlaceName || 'ไม่ระบุ'}</TableCell>
                            <TableCell>{trip.destinationName || trip.destinationPlaceName || 'ไม่ระบุ'}</TableCell>
                            <TableCell>{formatDate(trip.date)}</TableCell>
                            <TableCell>{trip.carType || 'ไม่ระบุ'}</TableCell>
                            <TableCell>
                              <Chip 
                                label={
                                  trip.status === 'completed' ? 'สำเร็จ' :
                                  trip.status === 'cancelled' ? 'ยกเลิก' : trip.status
                                } 
                                color={
                                  trip.status === 'completed' ? 'success' : 
                                  trip.status === 'cancelled' ? 'error' : 'default'
                                }
                                size="small"
                                sx={{
                                  fontWeight: 'medium',
                                  minWidth: 80,
                                  '&.MuiChip-colorSuccess': {
                                    bgcolor: 'success.light',
                                    color: 'success.contrastText',
                                    '&:hover': {
                                      bgcolor: 'success.main',
                                    }
                                  },
                                  '&.MuiChip-colorError': {
                                    bgcolor: 'error.light',
                                    color: 'error.contrastText',
                                    '&:hover': {
                                      bgcolor: 'error.main',
                                    }
                                  },
                                  '&.MuiChip-colorDefault': {
                                    bgcolor: 'grey.200',
                                    color: 'text.primary',
                                    '&:hover': {
                                      bgcolor: 'grey.300',
                                    }
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              {trip.is_round_trip ? '✓' : '✗'}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            ไม่พบประวัติการทำงาน
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {activeTab === 'active' && (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>วันที่</TableCell>
                        <TableCell>ชื่อ-นามสกุล</TableCell>
                        <TableCell>เบอร์โทรศัพท์</TableCell>
                        <TableCell>ต้นทาง</TableCell>
                        <TableCell>ปลายทาง</TableCell>
                        <TableCell>ประเภท</TableCell>
                        <TableCell>การจัดการ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                              <CircularProgress />
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : activeTrips.length > 0 ? (
                        activeTrips.map((trip) => renderActiveTrips(trip))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            ไม่มีงานที่กำลังดำเนินการ
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              {activeTab === 'profile' && (
                <Paper sx={{ p: 3, mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    โปรไฟล์
                  </Typography>
                  <Paper sx={{ p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        alt={profile?.riderFirstname}
                        src={getImageUrl(profile?.RiderProfilePic)}
                        sx={{ width: 120, height: 120, mb: 2 }}
                      />
                      <Typography variant="h6" sx={{ mt: 1, mb: 2 }}>
                        {profile?.riderFirstname} {profile?.riderLastname}
                      </Typography>
                      
                      {/* New Rating Display Box */}
                      <Box sx={{
                        width: '100%',
                        bgcolor: 'primary.light',
                        color: 'primary.contrastText',
                        borderRadius: 2,
                        p: 2,
                        mb: 2,
                        textAlign: 'center',
                        boxShadow: 2
                      }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          คะแนนการให้บริการ
                        </Typography>
                        {profile?.riderRate != null ? (
                          <>
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              justifyContent: 'center',
                              mb: 1
                            }}>
                              <Rating 
                                value={parseFloat(profile.riderRate)}
                                precision={0.1}
                                readOnly
                                size="large"
                                sx={{ 
                                  color: 'warning.main',
                                  '& .MuiRating-iconFilled': {
                                    color: 'warning.main',
                                  },
                                  '& .MuiRating-iconHover': {
                                    color: 'warning.dark',
                                  },
                                }}
                              />
                            </Box>
                            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                              {parseFloat(profile.riderRate).toFixed(1)}
                              <Typography component="span" variant="body1" sx={{ ml: 0.5, opacity: 0.8 }}>
                                / 5.0
                              </Typography>
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="h6" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                            ยังไม่มีคะแนน
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        mb: 1
                      }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                          คะแนนการให้บริการ
                        </Typography>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          bgcolor: 'background.paper',
                          px: 2,
                          py: 0.5,
                          borderRadius: 2,
                          boxShadow: 1
                        }}>
                          {(() => {
                            // Debug log the rating value
                            const ratingValue = parseFloat(profile?.riderRate);
                            console.log('Rendering Rating with value:', ratingValue, 'Type:', typeof ratingValue);
                            return (
                              <>
                                <Rating 
                                  value={isNaN(ratingValue) ? 0 : ratingValue}
                                  precision={0.5} 
                                  readOnly 
                                  size="medium"
                                  sx={{ color: 'warning.main' }}
                                />
                                <Typography 
                                  variant="h6" 
                                  color="primary"
                                  sx={{ 
                                    ml: 1,
                                    fontWeight: 'bold',
                                    lineHeight: 1
                                  }}
                                >
                                  {isNaN(ratingValue) ? 'N/A' : ratingValue.toFixed(1)}
                                </Typography>
                              </>
                            );
                          })()}
                        </Box>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {profile?.riderEmail}
                      </Typography>
                    </Box>
                  </Paper>
                  <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="subtitle1" gutterBottom>
                      รูปโปรไฟล์
                    </Typography>
                    {profile?.RiderProfilePic && (
                      <Box sx={{ mb: 2 }}>
                        <img
                          src={getImageUrl(profile?.RiderProfilePic)}
                          alt="รูปโปรไฟล์"
                          style={{ 
                            width: '150px', 
                            height: '150px', 
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid #ccc'
                          }}
                          onError={(e) => {
                            // If image fails to load, try with direct filename (in case it already has uploads/)
                            if (profile?.RiderProfilePic && !profile.RiderProfilePic.startsWith('http')) {
                              const baseUrl = process.env.REACT_APP_API_URL || window.location.origin;
                              e.target.src = `${baseUrl}/${profile.RiderProfilePic}`;
                            } else {
                              e.target.src = defaultAvatar;
                            }
                          }}
                        />
                      </Box>
                    )}
                    <input
                      accept="image/*"
                      type="file"
                      onChange={(e) => handleProfileFileChange(e, 'RiderProfilePic')}
                      style={{ marginTop: '10px' }}
                    />
                  </Box>
                  <TextField
                    autoFocus
                    margin="dense"
                    name="riderFirstname"
                    label="ชื่อ"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={profileFormData.riderFirstname}
                    onChange={handleProfileFormChange}
                    required
                  />
                  <TextField
                    margin="dense"
                    name="riderLastname"
                    label="นามสกุล"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={profileFormData.riderLastname}
                    onChange={handleProfileFormChange}
                    required
                  />
                  <TextField
                    margin="dense"
                    name="riderTel"
                    label="เบอร์โทรศัพท์"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={profileFormData.riderTel}
                    onChange={handleProfileFormChange}
                    required
                  />
                  <TextField
                    margin="dense"
                    name="riderAddress"
                    label="ที่อยู่"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={profileFormData.riderAddress}
                    onChange={handleProfileFormChange}
                    required
                    multiline
                    rows={3}
                  />
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      รูปบัตรนักศึกษา
                    </Typography>
                    {profile?.RiderStudentCard && (
                      <Box sx={{ mb: 2 }}>
                        <img
                          src={getImageUrl(profile?.RiderStudentCard)}
                          alt="บัตรนักศึกษา"
                          style={{ maxWidth: '100%', height: 'auto', marginBottom: '10px' }}
                          onError={(e) => handleImageError(e, 'student card')}
                        />
                      </Box>
                    )}
                    <input
                      accept="image/*"
                      type="file"
                      onChange={(e) => handleProfileFileChange(e, 'RiderStudentCard')}
                    />
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      QR Code
                    </Typography>
                    {profile?.QRscan && (
                      <Box sx={{ mb: 2 }}>
                        <img
                          src={getImageUrl(profile.QRscan)}
                          alt="QR Code"
                          style={{ maxWidth: '100%', height: 'auto', marginBottom: '10px' }}
                          onError={(e) => {
                            console.log('QR Code error, retrying with direct path:', {
                              original: e.target.src,
                              profile
                            });
                            
                            // Get the base URL and clean the path
                            const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                            // Remove any path components and just get the filename
                           
                            
                            // Fallback to default if still fails
                            e.target.onerror = () => {
                              e.target.src = defaultAvatar;
                            };
                          }}
                        />
                      </Box>
                    )}
                    <input
                      accept="image/*"
                      type="file"
                      onChange={(e) => handleProfileFileChange(e, 'QRscan')}
                    />
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      ใบขับขี่
                    </Typography>
                    {profile?.riderLicense && (
                      <Box sx={{ mb: 2 }}>
                        <img
                          src={getImageUrl(profile?.riderLicense)}
                          alt="ใบขับขี่"
                          style={{ maxWidth: '100%', height: 'auto', marginBottom: '10px' }}
                          onError={(e) => handleImageError(e, 'license')}
                        />
                      </Box>
                    )}
                    <input
                      accept="image/*"
                      type="file"
                      onChange={(e) => handleProfileFileChange(e, 'riderLicense')}
                    />
                  </Box>
                </Paper>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Dialog
        open={openProfileDialog}
        onClose={handleCloseProfileDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>แก้ไขโปรไฟล์</DialogTitle>
        <form onSubmit={handleProfileSubmit}>
          <DialogContent>
            {profileError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {profileError}
              </Alert>
            )}
            {/* Work history section has been removed as requested */}
            <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="subtitle1" gutterBottom>
                รูปโปรไฟล์
              </Typography>
              {profile?.RiderProfilePic && (
                <Box sx={{ mb: 2 }}>
                  <img
                    src={getImageUrl(profile?.RiderProfilePic)}
                    alt="รูปโปรไฟล์"
                    style={{ 
                      width: '150px', 
                      height: '150px', 
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #ccc'
                    }}
                    onError={(e) => handleImageError(e, 'profile picture')}
                  />
                </Box>
              )}
              <input
                accept="image/*"
                type="file"
                onChange={(e) => handleProfileFileChange(e, 'RiderProfilePic')}
                style={{ marginTop: '10px' }}
              />
            </Box>
            <TextField
              autoFocus
              margin="dense"
              name="riderFirstname"
              label="ชื่อ"
              type="text"
              fullWidth
              variant="outlined"
              value={profileFormData.riderFirstname}
              onChange={handleProfileFormChange}
              required
            />
            <TextField
              margin="dense"
              name="riderLastname"
              label="นามสกุล"
              type="text"
              fullWidth
              variant="outlined"
              value={profileFormData.riderLastname}
              onChange={handleProfileFormChange}
              required
            />
            <TextField
              margin="dense"
              name="riderTel"
              label="เบอร์โทรศัพท์"
              type="text"
              fullWidth
              variant="outlined"
              value={profileFormData.riderTel}
              onChange={handleProfileFormChange}
              required
            />
            <TextField
              margin="dense"
              name="riderAddress"
              label="ที่อยู่"
              type="text"
              fullWidth
              variant="outlined"
              value={profileFormData.riderAddress}
              onChange={handleProfileFormChange}
              required
              multiline
              rows={3}
            />
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                รูปบัตรนักศึกษา
              </Typography>
              {profile?.RiderStudentCard && (
                <Box sx={{ mb: 2 }}>
                  <img
                    src={getImageUrl(profile?.RiderStudentCard)}
                    alt="บัตรนักศึกษา"
                    style={{ maxWidth: '100%', height: 'auto', marginBottom: '10px' }}
                    onError={(e) => handleImageError(e, 'student card')}
                  />
                </Box>
              )}
              <input
                accept="image/*"
                type="file"
                onChange={(e) => handleProfileFileChange(e, 'RiderStudentCard')}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                QR Code
              </Typography>
              {profile?.QRscan && (
                <Box sx={{ mb: 2 }}>
                  <img
                    src={getImageUrl(profile.QRscan)}
                    alt="QR Code"
                    style={{ maxWidth: '100%', height: 'auto', marginBottom: '10px' }}
                    onError={(e) => {
                      console.log('QR Code error, retrying with direct path:', {
                        original: e.target.src,
                        profile
                      });
                      
                      // Get the base URL and clean the path
                      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                      // Remove any path components and just get the filename
                      
                    }}
                  />
                </Box>
              )}
              <input
                accept="image/*"
                type="file"
                onChange={(e) => handleProfileFileChange(e, 'QRscan')}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                ใบขับขี่
              </Typography>
              {profile?.riderLicense && (
                <Box sx={{ mb: 2 }}>
                  <img
                    src={getImageUrl(profile?.riderLicense)}
                    alt="ใบขับขี่"
                    style={{ maxWidth: '100%', height: 'auto', marginBottom: '10px' }}
                    onError={(e) => handleImageError(e, 'license')}
                  />
                </Box>
              )}
              <input
                accept="image/*"
                type="file"
                onChange={(e) => handleProfileFileChange(e, 'riderLicense')}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseProfileDialog}>ยกเลิก</Button>
            <Button type="submit" variant="contained">
              บันทึก
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={openVehicleDialog}
        onClose={() => setOpenVehicleDialog(false)}
      >
        <DialogTitle>
          {currentVehicle ? "แก้ไข" : "เพิ่ม"}ข้อมูลยานพาหนะ
        </DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="ประเภทรถ"
            value={vehicleFormData.carType}
            onChange={(e) =>
              setVehicleFormData({
                ...vehicleFormData,
                carType: e.target.value,
              })
            }
            margin="normal"
          >
            <MenuItem value="motorcycle">มอเตอร์ไซค์</MenuItem>
            <MenuItem value="car">รถยนต์</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="ทะเบียนรถ"
            value={vehicleFormData.plate}
            onChange={(e) =>
              setVehicleFormData({ ...vehicleFormData, plate: e.target.value })
            }
            margin="normal"
          />
          <TextField
            select
            fullWidth
            label="ยี่ห้อ"
            value={vehicleFormData.brand}
            onChange={(e) =>
              setVehicleFormData({ ...vehicleFormData, brand: e.target.value })
            }
            margin="normal"
          >
            <MenuItem value="Honda">Honda</MenuItem>
            <MenuItem value="Yamaha">Yamaha</MenuItem>
            <MenuItem value="Suzuki">Suzuki</MenuItem>
            <MenuItem value="Kawasaki">Kawasaki</MenuItem>
            <MenuItem value="Other">อื่นๆ</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="รุ่น"
            value={vehicleFormData.model}
            onChange={(e) =>
              setVehicleFormData({ ...vehicleFormData, model: e.target.value })
            }
            margin="normal"
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              รูปกรมธรรม์
            </Typography>
            <input
              accept="image/*"
              type="file"
              onChange={(e) => handleFileChange(e, "insurancePhoto")}
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              รูปยานพาหนะ
            </Typography>
            <input
              accept="image/*"
              type="file"
              onChange={(e) => handleFileChange(e, "carPhoto")}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenVehicleDialog(false)}>ยกเลิก</Button>
          <Button onClick={handleVehicleSubmit} variant="contained">
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
      
      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      
      {/* Loading Overlay */}
      {isLoading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <CircularProgress color="primary" size={60} />
        </Box>
      )}
    </Container>
  );
}

export default memo(RiderDashboard);
