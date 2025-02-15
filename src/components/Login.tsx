import React, { useState, useEffect } from 'react';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useAuthStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { Waves as Wave } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthSuccess = (result: any) => {
    if (result && result.user) {
      setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        onboarded: false
      });
      navigate('/onboarding');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      handleAuthSuccess(result);
    } catch (popupError: any) {
      console.error('Popup sign-in error:', popupError);
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectError: any) {
        console.error('Redirect sign-in error:', redirectError);
        setError('Unable to sign in. Please try again.');
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          handleAuthSuccess(result);
        }
      })
      .catch((err) => {
        console.error('Error getting redirect result:', err);
        setError('Unable to sign in. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary-500/10 rounded-full">
              <Wave className="w-12 h-12 text-primary-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Welcome to HappyPipeline</h1>
          <p className="text-ocean-300 mb-3">Streamlined Real Estate Lead Generation</p>
          <p className="text-2xl font-light text-primary-400 italic">Have deals fly to you...</p>
        </div>
        
        <div className="card p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-ocean-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                className="w-5 h-5"
              />
            )}
            {isLoading ? 'Signing in...' : 'Sign in with Google'}
          </button>
          
          <div className="mt-6 text-center">
            <p className="text-ocean-400 text-sm">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;