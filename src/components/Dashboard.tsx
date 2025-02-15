import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import BirddogDashboard from './dashboard/BirddogDashboard';
import AgentDashboard from './dashboard/AgentDashboard';
import LenderDashboard from './dashboard/LenderDashboard';
import LeadDashboard from './dashboard/LeadDashboard';
import WalletConnect from './WalletConnect';

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);

  if (!user?.onboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  // Function to render the appropriate dashboard based on role
  const renderDashboard = () => {
    switch (user.role) {
      case 'lead':
        return <LeadDashboard />;
      case 'birddog':
        return <BirddogDashboard />;
      case 'agent':
        return <AgentDashboard />;
      case 'lender':
        return <LenderDashboard />;
      default:
        return (
          <div className="text-center text-gray-400 py-8">
            Dashboard for {user.role} role is coming soon.
          </div>
        );
    }
  };

  // Get the role-specific title
  const getDashboardTitle = () => {
    switch (user.role) {
      case 'lead':
        return 'Lead Portal';
      case 'birddog':
        return 'Birddog Dashboard';
      case 'agent':
        return 'Real Estate Agent Dashboard';
      case 'lender':
        return 'Mortgage Lender Dashboard';
      case 'investor':
        return 'Investor Dashboard';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {getDashboardTitle()}
              </h1>
              <p className="text-gray-400">
                Welcome back, {user.displayName}
              </p>
            </div>
            <WalletConnect />
          </div>
        </div>
        
        {renderDashboard()}
      </div>
    </div>
  );
}