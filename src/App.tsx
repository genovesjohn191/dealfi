import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { useAuthStore } from './store';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import Pipeline from './components/Pipeline';
import Staking from './components/Staking';
import ImpersonationToolbar from './components/ImpersonationToolbar';
import { User, UserCircle, LogOut, GitBranch, Coins } from 'lucide-react';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  const { setUser, user } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // If we don't have the user in our store, set it
        if (!user) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            onboarded: false
          });
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [setUser, user]);

  return (
    <Router>
      {user && (
        <header className="fixed top-0 left-0 right-0 bg-ocean-900/95 backdrop-blur-sm border-b border-ocean-800 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link to="/dashboard" className="text-xl font-bold text-white">
                HappyPipeline
              </Link>
              
              <div className="flex items-center gap-6">
                <Link
                  to="/pipeline"
                  className="flex items-center gap-2 text-ocean-300 hover:text-white transition"
                >
                  <GitBranch className="w-5 h-5" />
                  <span>Pipeline</span>
                </Link>

                <Link
                  to="/staking"
                  className="flex items-center gap-2 text-ocean-300 hover:text-white transition"
                >
                  <Coins className="w-5 h-5" />
                  <span>Staking</span>
                </Link>
                
                <div className="relative group">
                  <button className="flex items-center gap-2 text-ocean-300 hover:text-white transition">
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt={user.displayName || ''} 
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <UserCircle className="w-8 h-8" />
                    )}
                    <span>{user.displayName || 'User'}</span>
                  </button>
                  
                  <div className="absolute right-0 top-full mt-2 w-48 bg-ocean-800 rounded-lg shadow-lg py-1 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <Link 
                      to="/profile" 
                      className="flex items-center gap-2 px-4 py-2 text-ocean-300 hover:bg-ocean-700/50 hover:text-white transition"
                    >
                      <User className="w-4 h-4" />
                      My Profile
                    </Link>
                    <button
                      onClick={() => auth.signOut()}
                      className="w-full flex items-center gap-2 px-4 py-2 text-ocean-300 hover:bg-ocean-700/50 hover:text-white transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className={user ? 'pt-16' : ''}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/onboarding"
            element={
              <PrivateRoute>
                <Onboarding />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/pipeline"
            element={
              <PrivateRoute>
                <Pipeline />
              </PrivateRoute>
            }
          />
          <Route
            path="/staking"
            element={
              <PrivateRoute>
                <Staking />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      
      {user && <ImpersonationToolbar />}
    </Router>
  );
}

export default App;