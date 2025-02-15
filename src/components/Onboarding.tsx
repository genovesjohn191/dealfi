import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { UserRole } from '../types';
import { Building2, CircleDollarSign, Users, Briefcase, User } from 'lucide-react';

const roles: { id: UserRole; title: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'lead',
    title: 'Lead',
    description: 'Looking for real estate services',
    icon: <User className="w-8 h-8 text-blue-400" />
  },
  {
    id: 'birddog',
    title: 'Birddog',
    description: 'Find and refer potential real estate deals',
    icon: <Users className="w-8 h-8 text-blue-400" />
  },
  {
    id: 'agent',
    title: 'Real Estate Agent',
    description: 'List and sell properties',
    icon: <Building2 className="w-8 h-8 text-blue-400" />
  },
  {
    id: 'lender',
    title: 'Mortgage Lender',
    description: 'Provide financing solutions',
    icon: <CircleDollarSign className="w-8 h-8 text-blue-400" />
  },
  {
    id: 'investor',
    title: 'Investor',
    description: 'Find investment opportunities',
    icon: <Briefcase className="w-8 h-8 text-blue-400" />
  }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { updateUserRole, completeOnboarding } = useAuthStore();

  const handleRoleSelect = (role: UserRole) => {
    updateUserRole(role);
    completeOnboarding();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Welcome to HappyPipeline</h1>
          <p className="text-xl text-gray-400">Select your role to get started</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => handleRoleSelect(role.id)}
              className="bg-gray-800 p-6 rounded-lg hover:bg-gray-750 transition group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-700 rounded-lg group-hover:bg-gray-600 transition">
                  {role.icon}
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-white mb-2">{role.title}</h3>
                  <p className="text-gray-400">{role.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}