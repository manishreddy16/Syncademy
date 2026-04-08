import { useEffect, useMemo, useState } from 'react';
import { Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { initOfflineStorage } from './utils/offlineStorage';
import { initOnlineStatus } from './utils/onlineStatus';
import { initAutoSync } from './utils/autoSync';
import { getCurrentUser, restoreSession, refreshSession, isAdminUser, isStudentUser } from './utils/auth';
import { initializeUserBalance } from './services/payment';

import LoginPage from './pages/LoginPage';
import RegisterAdminPage from './pages/RegisterAdminPage';
import RegisterStudentPage from './pages/RegisterStudentPage';
import DashboardPage from './pages/DashboardPage';
import AssignmentsPage from './pages/AssignmentsPage';
import ResourcesPage from './pages/ResourcesPage';
import PaymentsPage from './pages/PaymentsPage';
import MapsPage from './pages/MapsPage';
import DebugPage from './pages/DebugPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import { logout } from './utils/auth';

function App() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize offline services on app load
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initOfflineStorage();
        initOnlineStatus();
        initAutoSync();

        // Try to restore session from localStorage
        const restoredUser = restoreSession();
        if (restoredUser) {
          setUser(restoredUser);
          // Initialize balance if not done
          await initializeUserBalance(restoredUser.uid);
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Listen to Firebase auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser && user) {
        // User logged out
        setUser(null);
        navigate('/login');
      } else if (firebaseUser && !user) {
        // User logged in (from Firebase)
        // The login service should have set the user in localStorage already
        const currentUser = getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      }
    });
    return unsubscribe;
  }, [user, navigate]);

  // Refresh session periodically
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      refreshSession();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    navigate('/login');
  };

  const adminNavItems = useMemo(
    () => [
      { label: 'Dashboard', path: '/admin/dashboard' },
      { label: 'Students', path: '/admin/students' },
      { label: 'Assignments', path: '/assignments' },
      { label: 'Resources', path: '/resources' },
      { label: 'Payments', path: '/payments' },
      { label: 'Analytics', path: '/admin/analytics' },
    ],
    []
  );

  const studentNavItems = useMemo(
    () => [
      { label: 'Dashboard', path: '/student/dashboard' },
      { label: 'Assignments', path: '/assignments' },
      { label: 'Resources', path: '/resources' },
      { label: 'Payments', path: '/payments' },
      { label: 'My Grades', path: '/student/grades' },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Loading Syncademy...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {user ? (
        <div className="lg:flex">
          <Sidebar
            user={user}
            items={isAdminUser() ? adminNavItems : studentNavItems}
            onLogout={handleLogout}
          />
          <main className="flex-1 p-4 lg:p-8">
            <Routes>
              {/* Admin Routes */}
              {isAdminUser() && (
                <>
                  <Route path="/admin/dashboard" element={<AdminDashboardPage user={user} />} />
                  <Route path="/admin/students" element={<AdminDashboardPage user={user} />} />
                  <Route path="/admin/analytics" element={<AdminDashboardPage user={user} />} />
                </>
              )}

              {/* Student Routes */}
              {isStudentUser() && (
                <>
                  <Route path="/student/dashboard" element={<StudentDashboardPage user={user} />} />
                  <Route path="/student/grades" element={<StudentDashboardPage user={user} />} />
                </>
              )}

              {/* Shared Routes */}
              <Route path="/dashboard" element={<DashboardPage user={user} />} />
              <Route path="/assignments" element={<AssignmentsPage user={user} />} />
              <Route path="/resources" element={<ResourcesPage user={user} />} />
              <Route path="/payments" element={<PaymentsPage user={user} />} />
              <Route path="/maps" element={<MapsPage user={user} />} />
              <Route path="/debug" element={<DebugPage />} />

              {/* Default redirect based on role */}
              <Route
                path="/"
                element={
                  isAdminUser() ? (
                    <AdminDashboardPage user={user} />
                  ) : isStudentUser() ? (
                    <StudentDashboardPage user={user} />
                  ) : (
                    <DashboardPage user={user} />
                  )
                }
              />

              {/* Catch-all: redirect to appropriate dashboard */}
              <Route
                path="*"
                element={
                  isAdminUser() ? (
                    <AdminDashboardPage user={user} />
                  ) : isStudentUser() ? (
                    <StudentDashboardPage user={user} />
                  ) : (
                    <DashboardPage user={user} />
                  )
                }
              />
            </Routes>
          </main>
        </div>
      ) : (
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={() => setUser(getCurrentUser())} />} />
          <Route path="/register-school" element={<RegisterAdminPage />} />
          <Route path="/register-student" element={<RegisterStudentPage />} />
          <Route path="/debug" element={<DebugPage />} />
          <Route path="*" element={<LoginPage onLogin={() => setUser(getCurrentUser())} />} />
        </Routes>
      )}
    </div>
  );
}

export default App;
