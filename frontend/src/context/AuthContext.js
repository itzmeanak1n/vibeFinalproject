import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, riderService, studentService, cancelAllRequests } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentTrips, setStudentTrips] = useState([]);
  const [riderPendingTrips, setRiderPendingTrips] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUserType = localStorage.getItem('userType');

        if (token && storedUserType) {
          try {
            await fetchUserProfile(storedUserType);
          } catch (error) {
            console.error('Error initializing auth:', error);
            // Don't log out immediately on refresh - give it a chance to recover
            if (!window.performance.navigation || window.performance.navigation.type !== window.performance.navigation.TYPE_RELOAD) {
              logout();
            }
          }
        } else {
          // If no token or userType, ensure we're not in a protected route
          if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Error in auth initialization:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
    
    // Listen for storage events to handle logout from other tabs
    const handleStorageChange = (e) => {
      if (e.key === 'token' && !e.newValue) {
        // Token was removed from another tab
        window.location.href = '/login';
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [navigate]);

  const fetchUserProfile = async (userType) => {
    setLoading(true);
    try {
      let profileResponse;
      if (userType === 'rider') {
        profileResponse = await riderService.getProfile();
      } else if (userType === 'student') {
        profileResponse = await studentService.getProfile();
      } else if (userType === 'admin') {
        profileResponse = await authService.getProfile('admin');
      } else {
        throw new Error('Invalid user type for fetching profile');
      }

      if (profileResponse?.data) {
        const profileData = profileResponse.data;
        console.log('Profile data received:', profileData);
        
        // อัพเดท profile
        setProfile(profileData);
        
        // อัพเดท user
        setUser(prevUser => ({
          ...prevUser,
          id: profileData.riderId || profileData.studentId || profileData.id,
          userType,
          email: profileData.riderEmail || profileData.studentEmail || profileData.email
        }));

        // ดึงข้อมูลเพิ่มเติมตาม userType
        if (userType === 'student') {
          const tripsResponse = await studentService.getTrips();
          setStudentTrips(tripsResponse.data || []);
        } else if (userType === 'rider') {
          const pendingTripsResponse = await riderService.getPendingTrips();
          setRiderPendingTrips(pendingTripsResponse || []);
        }
      } else {
        console.error('No profile data received:', profileResponse);
        throw new Error('ไม่พบข้อมูลโปรไฟล์');
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfileInContext = (newProfileData) => {
    setProfile(prevProfile => {
      // ตรวจสอบว่ามีรูปภาพใหม่หรือไม่
      const updatedProfile = {
        ...prevProfile,
        ...newProfileData,
        // ถ้ามีรูปภาพใหม่ ให้ใช้รูปภาพใหม่ ถ้าไม่มีให้ใช้รูปภาพเดิม
        riderImage: newProfileData.riderImage || prevProfile?.riderImage,
        vehicleImage: newProfileData.vehicleImage || prevProfile?.vehicleImage,
        vehicleLicenseImage: newProfileData.vehicleLicenseImage || prevProfile?.vehicleLicenseImage,
        qrCode: newProfileData.qrCode || prevProfile?.qrCode,
        qrCodeUrl: newProfileData.qrCodeUrl || prevProfile?.qrCodeUrl
      };
      console.log('กำลังอัพเดทข้อมูลโปรไฟล์:', updatedProfile);
      return updatedProfile;
    });
    
    setUser(prevUser => {
      const updatedUser = {
        ...prevUser,
        id: newProfileData.riderId || prevUser.id,
        email: newProfileData.riderEmail || prevUser.email,
        role: prevUser.role
      };
      console.log('กำลังอัพเดทข้อมูลผู้ใช้:', updatedUser);
      
      // บันทึกข้อมูลลง localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('profile', JSON.stringify(newProfileData));
      
      return updatedUser;
    });
  };

  const login = async (data) => {
    setLoading(true);
    try {
      const response = await authService.login(data);
      const { token, user: loggedInUser } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('userType', loggedInUser.role);
      
      setUser({ 
        id: loggedInUser.id, 
        userType: loggedInUser.role, 
        email: loggedInUser.email 
      });

      await fetchUserProfile(loggedInUser.role);

      switch (loggedInUser.role) {
        case 'student':
          navigate('/dashboard/student');
          break;
        case 'rider':
          navigate('/dashboard/rider');
          break;
        case 'admin':
          navigate('/dashboard/admin');
          break;
        default:
          navigate('/');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
      setLoading(false);
      throw error;
    }
  };

  const logout = useCallback(async () => {
    try {
      // Cancel all pending requests
      cancelAllRequests('User logged out');
      
      // Clear local storage and state
      localStorage.removeItem('token');
      localStorage.removeItem('userType');
      
      // Reset all states
      setUser(null);
      setProfile(null);
      setStudentTrips([]);
      setRiderPendingTrips([]);
      
      // Add a small delay to ensure state updates before navigation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Navigate to login
      navigate('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      // Still navigate to login even if there was an error
      navigate('/login');
    }
  }, [navigate]);

  const isAdmin = () => {
    return user?.userType === 'admin';
  };

  const isStudent = () => {
    return user?.userType === 'student';
  };

  const isRider = () => {
    return user?.userType === 'rider';
  };

  const updateStudentTrips = useCallback(async () => {
    try {
      const tripsResponse = await studentService.getTrips();
      setStudentTrips(tripsResponse.data);
      return tripsResponse.data; // Return the data so we can use it in the component
    } catch (err) {
      console.error('Failed to update student trips:', err);
      throw err;
    }
  }, []); // No dependencies since we're using the latest state

  const updateRiderPendingTrips = useCallback(async () => {
    try {
      const pendingTripsResponse = await riderService.getPendingTrips();
      setRiderPendingTrips(pendingTripsResponse);
      return pendingTripsResponse; // Make sure to return the response
    } catch (err) {
      console.error('Failed to update rider pending trips:', err);
      throw err; // Re-throw to handle in the component
    }
  }, []); // No dependencies since we're using the latest state

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      error,
      login,
      logout,
      isAdmin,
      isStudent,
      isRider,
      updateProfileInContext,
      studentTrips,
      riderPendingTrips,
      updateStudentTrips,
      updateRiderPendingTrips
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 