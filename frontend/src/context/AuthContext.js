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

  // Function to restore user session from localStorage
  const restoreSession = useCallback(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedProfile = localStorage.getItem('profile');
    const storedUserType = localStorage.getItem('userType');

    if (token && storedUser && storedProfile && storedUserType) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const parsedProfile = JSON.parse(storedProfile);
        
        // Set user and profile state
        setUser(parsedUser);
        setProfile(parsedProfile);
        
        // Return the restored user data
        return { user: parsedUser, profile: parsedProfile, userType: storedUserType };
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        return null;
      }
    }
    return null;
  }, []);

  // Memoize fetchUserProfile to prevent unnecessary re-renders
  const fetchUserProfileMemoized = useCallback(async (userType) => {
    setLoading(true);
    setError(null);
    
    try {
      // Skip if we don't have a valid user type
      if (!userType) {
        console.log('No user type provided, skipping profile fetch');
        return;
      }

      console.log(`Fetching profile for user type: ${userType}`);
      
      let profileResponse;
      try {
        if (userType === 'rider') {
          profileResponse = await riderService.getProfile();
        } else if (userType === 'student') {
          profileResponse = await studentService.getProfile();
        } else if (userType === 'admin') {
          profileResponse = await authService.getProfile('admin');
        } else {
          throw new Error('Invalid user type for fetching profile');
        }
      } catch (error) {
        // If the error is a cancellation, just return and let the new request handle it
        if (error.name === 'CanceledError' || error.message.includes('canceled')) {
          console.log('Profile fetch was canceled, likely due to a new request');
          return;
        }
        throw error; // Re-throw other errors
      }

      if (profileResponse?.data) {
        const profileData = profileResponse.data;
        console.log('=== Profile Data from API ===');
        console.log('Full response:', profileResponse);
        console.log('Profile data object:', profileData);
        console.log('Profile keys:', Object.keys(profileData));
        console.log('riderRate in profile data:', profileData.riderRate);
        
        // Update profile
        console.log('=== Setting profile state ===');
        setProfile(profileData);
        
        // Update user
        console.log('=== Updating user state ===');
        setUser(prevUser => {
          const updatedUser = {
            ...prevUser,
            id: profileData.riderId || profileData.studentId || profileData.id,
            userType,
            email: profileData.riderEmail || profileData.studentEmail || profileData.email
          };
          console.log('Updated user object:', updatedUser);
          return updatedUser;
        });

        // Fetch additional data based on user type
        if (userType === 'student') {
          const tripsResponse = await studentService.getTrips();
          setStudentTrips(tripsResponse.data || []);
        } else if (userType === 'rider') {
          const pendingTripsResponse = await riderService.getPendingTrips();
          setRiderPendingTrips(pendingTripsResponse || []);
        }
      } else {
        console.error('No profile data received:', profileResponse);
        throw new Error('No profile data received');
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setError(error.message || 'Failed to fetch user profile');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize authentication state
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // First try to restore from localStorage
        const restoredSession = restoreSession();
        const token = localStorage.getItem('token');
        const storedUserType = localStorage.getItem('userType');
        
        if (token && storedUserType) {
          // We have a token, try to refresh the session in the background
          // but don't wait for it to complete before rendering
          const refreshSession = async () => {
            try {
              await fetchUserProfileMemoized(storedUserType);
            } catch (error) {
              console.error('Error refreshing session:', error);
              // Even if refresh fails, keep the user logged in if we have valid local data
              if (!restoredSession && isMounted) {
                const isPublicPage = ['/login', '/register', '/register/student', '/register/rider', '/', '/home'].includes(window.location.pathname);
                if (!isPublicPage) {
                  navigate('/login');
                }
              }
            }
          };
          
          // Don't await this - let it run in the background
          refreshSession();
        } else {
          // No token or user type in localStorage
          if (isMounted) {
            const isPublicPage = ['/login', '/register', '/register/student', '/register/rider', '/', '/home'].includes(window.location.pathname);
            if (!isPublicPage) {
              navigate('/login');
            }
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
    setError(null);
    
    try {
      // Skip if we don't have a valid user type
      if (!userType) {
        console.log('No user type provided, skipping profile fetch');
        return;
      }

      console.log(`Fetching profile for user type: ${userType}`);
      
      let profileResponse;
      try {
        if (userType === 'rider') {
          profileResponse = await riderService.getProfile();
        } else if (userType === 'student') {
          profileResponse = await studentService.getProfile();
        } else if (userType === 'admin') {
          profileResponse = await authService.getProfile('admin');
        } else {
          throw new Error('Invalid user type for fetching profile');
        }
      } catch (error) {
        // If the error is a cancellation, just return and let the new request handle it
        if (error.name === 'CanceledError' || error.message.includes('canceled')) {
          console.log('Profile fetch was canceled, likely due to a new request');
          return;
        }
        throw error; // Re-throw other errors
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
      // Clear sensitive data first
      localStorage.removeItem('token');
      localStorage.removeItem('userType');
      
      // Reset all states
      setUser(null);
      setProfile(null);
      setStudentTrips([]);
      setRiderPendingTrips([]);
      
      // Cancel all pending requests after state is cleared
      cancelAllRequests('User logged out');
      
      // Add a small delay to ensure state updates before navigation
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Use window.location.href instead of navigate to ensure a full page reload
      // This prevents any remaining React components from making requests
      window.location.href = '/login';
    } catch (error) {
      console.error('Error during logout:', error);
      // Force redirect to login even if there was an error
      window.location.href = '/login';
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