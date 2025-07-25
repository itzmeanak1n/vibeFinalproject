import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

// Create a map to store cancel tokens
const cancelTokens = new Map();

// Create a base axios instance with interceptors
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token and handle refresh
axiosInstance.interceptors.request.use(
  (config) => {
    // Skip auth checks for authentication-related endpoints
    const authEndpoints = ['/auth/'];
    const isAuthEndpoint = authEndpoints.some(endpoint => config.url.includes(endpoint));
    
    if (isAuthEndpoint) {
      return config;
    }

    // Get the current token
    const token = localStorage.getItem('token');
    
    // Only add auth header if token exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Skip cancellation for critical endpoints to prevent UI issues
    const excludedEndpoints = [
      '/students/trips',
      '/students/profile',
      '/riders/profile',
      '/auth/profile'
    ];
    
    if (config.url && excludedEndpoints.some(endpoint => config.url.includes(endpoint))) {
      return config;
    }
    
    // Only add cancel token if not already set
    if (config.cancelToken === undefined) {
      const source = axios.CancelToken.source();
      config.cancelToken = source.token;
      
      // Only track GET requests for cancellation
      if (config.method?.toLowerCase() === 'get') {
        // Generate a request ID that doesn't include timestamp or other changing parameters
        const requestId = `${config.method}-${config.url}`;
        
        // If there's a pending request to the same endpoint, cancel it
        if (cancelTokens.has(requestId)) {
          const pendingSource = cancelTokens.get(requestId);
          // Only cancel if the request is still pending
          if (pendingSource) {
            pendingSource.cancel('Request canceled: new request to same endpoint');
          }
          cancelTokens.delete(requestId);
        }
        
        cancelTokens.set(requestId, source);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => {
    // Skip cleanup for student trips to prevent UI issues
    if (response.config.url && response.config.url.includes('/students/trips')) {
      return response;
    }
    
    // Clean up the cancel token for successful responses
    if (response.config) {
      const requestId = `${response.config.method}-${response.config.url}`;
      cancelTokens.delete(requestId);
    }
    return response;
  },
  (error) => {
    // Don't log or handle canceled requests as errors
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    // Skip cleanup for student trips to prevent UI issues
    if (error.config && error.config.url && error.config.url.includes('/students/trips')) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Don't process if this is a canceled request
      if (axios.isCancel(error)) {
        return Promise.reject(error);
      }
      
      // Don't redirect if we're already on the login page or if this is a profile update request
      const isLoginPage = window.location.pathname.includes('/login');
      const isProfileRequest = error.config && error.config.url && (
        error.config.url.includes('/profile') || 
        error.config.url.includes('/riders/profile') ||
        error.config.url.includes('/students/profile')
      );
      
      // Check if this is a request that was made after logout
      const token = localStorage.getItem('token');
      if (!token) {
        // If there's no token, this is expected after logout - don't show error
        return Promise.reject(new Error('Session expired'));
      }
      
      if (!isLoginPage && !isProfileRequest) {
        // Only clear auth and redirect for non-profile related 401s
        console.log('Unauthorized access - redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('userType');
        
        // Only redirect if not already on the login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      } else if (isProfileRequest) {
        console.log('Profile request failed with 401 - not logging out');
      }
      
      // Return a resolved promise to prevent error from propagating
      return Promise.reject(new Error('Session expired'));
    }

    // Clean up the cancel token for failed requests
    if (error.config) {
      const requestId = `${error.config.method}-${error.config.url}`;
      cancelTokens.delete(requestId);
    }
    
    return Promise.reject(error);
  }
);

// Function to cancel all pending requests
export const cancelAllRequests = (reason = 'Operation canceled') => {
  const requestsToCancel = Array.from(cancelTokens.entries());
  cancelTokens.clear(); // Clear the map first to prevent race conditions
  
  requestsToCancel.forEach(([requestId, source]) => {
    try {
      if (source && typeof source.cancel === 'function') {
        source.cancel(reason);
      }
    } catch (error) {
      console.warn(`Error canceling request ${requestId}:`, error);
    }
  });
};

// Create API client with the configured axios instance
const createApiClient = () => {
  return axiosInstance;
};

// Authentication services
export const authService = {
  login: (data) => createApiClient().post('/api/login', data, {
    headers: {
      'Content-Type': 'application/json'
    }
  }),
  registerStudent: (data) => createApiClient().post('/api/register/student', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  }),
  registerRider: (formData) => {
    return createApiClient().post('/api/register/rider', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  registerAdmin: (data) => createApiClient().post('/api/register/admin', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  }),
  getProfile: (userType) => createApiClient().get(`/api/${userType}/profile`),
};

// Student services
export const studentService = {
  getProfile: async () => {
    const apiClient = createApiClient();
    return await apiClient.get('/api/students/profile');
  },
  updateProfile: (formData) => {
    // Create a new axios instance for file upload with the correct content type
    const uploadClient = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    // Add request interceptor to handle errors
    uploadClient.interceptors.response.use(
      response => response,
      error => {
        console.error('Upload error:', error);
        return Promise.reject(error);
      }
    );
    
    return uploadClient.put('/api/students/profile', formData);
  },
  getPlaces: async () => {
    const apiClient = createApiClient();
    return await apiClient.get('/api/students/places');
  },
  createTrip: async (tripData) => {
    const apiClient = createApiClient();
    return await apiClient.post('/api/students/trips', tripData);
  },
  getTrips: async () => {
    const apiClient = createApiClient();
    return await apiClient.get('/api/students/trips');
  },
  getRiderDetails: async (riderId) => {
    const apiClient = createApiClient();
    return await apiClient.get(`/api/students/rider/${riderId}`);
  },
  rateRider: async (tripId, rating) => {
    const apiClient = createApiClient();
    
    try {
      console.log(`Rating trip ${tripId} with rating ${rating}`);
      
      const response = await apiClient({
        method: 'put',
        url: `/api/students/trips/${tripId}/rate`,
        data: { rating }
      });
      
      console.log('Rate rider response:', response);
      return response;
    } catch (error) {
      console.error('Error rating rider:', error);
      throw error;
    }
  },
  
  cancelTrip: async (tripId) => {
    const apiClient = createApiClient();
    try {
      console.log(`Canceling trip ${tripId}`);
      const response = await apiClient({
        method: 'put',
        url: `/api/students/trips/${tripId}/cancel`
      });
      console.log('Cancel trip response:', response);
      return response;
    } catch (error) {
      console.error('Error canceling trip:', error);
      throw error;
    }
  },
};

// Rider services
export const riderService = {
  getProfile: async () => {
    const apiClient = createApiClient();
    return await apiClient.get('/api/riders/profile');
  },
  updateProfile: (formData) => {
    return createApiClient().put('/api/riders/profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Vehicle Management
  getVehicles: () => createApiClient().get('/api/riders/vehicles'),

  addVehicle: (vehicleData) => {
    console.log('Calling POST /api/riders/vehicles');
    return createApiClient().post('/api/riders/vehicles', vehicleData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  updateVehicle: (carId, vehicleData) => {
    const url = `/api/riders/vehicles/${carId}`;
    console.log('Calling PUT:', url);
    return createApiClient().put(url, vehicleData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  deleteVehicle: (carId) => {
    const url = `/api/riders/vehicles/${carId}`;
    console.log(`Calling DELETE ${url}`);
    return createApiClient().delete(url);
  },

  // getTrips: () => createApiClient().get('/riders/trips'),

  // Admin services
  getStatus: () => createApiClient().get('/api/riders/status'),
  updateStatus: (status) => createApiClient().put('/api/riders/status', { status }),

  // เพิ่ม API สำหรับดึงงานที่รอรับและจัดการงาน
  getPendingTrips: async () => {
    try {
      const response = await createApiClient().get('/api/riders/pending-trips');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getTripDetails: async (tripId) => {
    try {
      console.log('Fetching trip details for ID:', tripId);
      const apiClient = createApiClient();
      const response = await apiClient.get(`/api/riders/trips/${tripId}`);
      console.log('Trip details response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error in getTripDetails:', error);
      return null;
    }
  },
  acceptTrip: async (tripId, riderId) => {
    try {
      console.log('Accepting trip:', { tripId, riderId });
      const apiClient = createApiClient();

      const response = await apiClient.put(`/api/riders/trips/${tripId}/accept`, {
        riderId: riderId.toString() // แปลงเป็น string เพื่อให้ตรงกับ type ในฐานข้อมูล
      });
      console.log('Accept trip response:', response.data);

      // ถ้าสำเร็จ ให้อัพเดทรายการงานที่รอการตอบรับและงานที่กำลังดำเนินการ
      if (response.data.success) {
        try {
          // รอให้ backend อัพเดทข้อมูลก่อน
          await new Promise(resolve => setTimeout(resolve, 1000));

          // ดึงรายการงานที่รอการตอบรับใหม่
          const pendingTrips = await apiClient.get('/api/riders/pending-trips');
          console.log('Updated pending trips:', pendingTrips.data);

          // ดึงรายการงานที่กำลังดำเนินการใหม่
          const activeTrips = await apiClient.get('/api/riders/active-trips');
          console.log('Updated active trips:', activeTrips.data);
        } catch (updateError) {
          console.error('Error updating trip lists:', updateError);
        }
      }

      return response.data;
    } catch (error) {
      console.error('Error in acceptTrip:', error.response?.data || error);
      throw new Error(error.response?.data?.message || 'ไม่สามารถรับงานได้');
    }
  },
  rejectTrip: async (tripId) => {
    try {
      const response = await createApiClient().put(`/api/riders/trips/${tripId}/reject`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getActiveTrips: async () => {
    try {
      const response = await createApiClient().get('/api/riders/active-trips');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  completeTrip: async (tripId) => {
    try {
      console.log('Completing trip:', tripId);
      const apiClient = createApiClient();
      const response = await apiClient.put(`/api/riders/trips/${tripId}/complete`);
      console.log('Complete trip response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error in completeTrip:', error);
      throw error;
    }
  },
  getTripHistory: async () => {
    try {
      const response = await createApiClient().get('/api/riders/trips/history');
      return response.data;
    } catch (error) {
      console.error('Error fetching trip history:', error);
      throw error;
    }
  },
};

// Admin services
export const adminService = {
  // Student management
  getStudents: async () => {
    const apiClient = createApiClient();
    return await apiClient.get('/api/admin/students');
  },
  getStudent: (id) => createApiClient().get(`/api/admin/students/${id}`),
  createStudent: (data) => createApiClient().post('/api/admin/students', data),
  updateStudent: (id, data) => createApiClient().put(`/api/admin/students/${id}`, data),
  deleteStudent: (id) => createApiClient().delete(`/api/admin/students/${id}`),

  // Rider management
  getRiders: async () => {
    const apiClient = createApiClient();
    return await apiClient.get('/api/admin/riders');
  },
  getRiderById: (riderId) => createApiClient().get(`/api/admin/riders/${riderId}`),
  createRider: async (riderData) => {
    const apiClient = createApiClient();
    return await apiClient.post('/api/admin/riders', riderData);
  },
  updateRider: async (riderId, data) => {
    const apiClient = createApiClient();
    return await apiClient.put(`/api/admin/riders/${riderId}`, data);
  },
  deleteRider: async (riderId) => {
    try {
      const apiClient = createApiClient();
      const response = await apiClient.delete(`/api/admin/riders/${riderId}`);
      return response;
    } catch (error) {
      console.error('Delete rider error:', error.response?.data);
      throw error;
    }
  },
  approveRider: async (riderId) => {
    const apiClient = createApiClient();
    return await apiClient.put(`/api/admin/riders/${riderId}/approve`);
  },

  // Vehicle management (Admin)
  getRiderVehicles: (riderId) => createApiClient().get(`/api/admin/riders/${riderId}/vehicles`),
  addRiderVehicle: (riderId, data) => createApiClient().post(`/api/admin/riders/${riderId}/vehicles`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  updateRiderVehicle: (carId, data) => createApiClient().put(`/api/admin/vehicles/${carId}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  deleteRiderVehicle: (carId) => createApiClient().delete(`/api/admin/vehicles/${carId}`),

  // Place management
  getPlaces: async () => {
    const apiClient = createApiClient();
    return await apiClient.get('/api/admin/places');
  },
  addPlace: async (formData) => {
    const apiClient = createApiClient();
    return await apiClient.post('/api/admin/places', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  updatePlace: async (placeId, formData) => {
    const apiClient = createApiClient();
    return await apiClient.put(`/api/admin/places/${placeId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deletePlace: async (placeId) => {
    const apiClient = createApiClient();
    return await apiClient.delete(`/api/admin/places/${placeId}`);
  },
};

// Export default instance if needed, otherwise remove
// export default createApiClient();