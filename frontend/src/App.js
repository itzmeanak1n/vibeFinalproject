import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';

// Pages
import Home from './pages/Home';
import StudentRegister from './pages/StudentRegister';
import RiderRegister from './pages/RiderRegister';
import AdminRegister from './pages/AdminRegister';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import RiderDashboard from './pages/RiderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Register from './pages/Register';
import AdminStudentManagement from './pages/AdminStudentManagement';
import RiderTripDetail from './pages/RiderTripDetail';

// Components
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register/student" element={<StudentRegister />} />
            <Route path="/register/rider" element={<RiderRegister />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin/register" element={<AdminRegister />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard/student"
              element={
                <PrivateRoute>
                  <StudentDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/rider"
              element={
                <PrivateRoute>
                  <RiderDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route path="/admin/students" element={<AdminRoute><AdminStudentManagement /></AdminRoute>} />
            <Route path="/rider" element={<RiderDashboard />} />
            <Route path="/rider/trips/:tripId" element={<RiderTripDetail />} />
            {/* Removed the catch-all redirect to prevent navigation loop */}
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
