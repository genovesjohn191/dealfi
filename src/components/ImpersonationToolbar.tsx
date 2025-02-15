import React from 'react';
import { useAuthStore } from '../store';
import { UserRole } from '../types';
import { Users, Building2, CircleDollarSign, Briefcase, User } from 'lucide-react';

const roles: { id: UserRole; title: string; icon: React.ReactNode }[] = [
  {
    id: 'lead',
    title: 'Lead',
    icon: <User className="w-4 h-4" />
  },
  {
    id: 'birddog',
    title: 'Birddog',
    icon: <Users className="w-4 h-4" />
  },
  {
    id: 'agent',
    title: 'Agent',
    icon: <Building2 className="w-4 h-4" />
  },
  {
    id: 'lender',
    title: 'Lender',
    icon: <CircleDollarSign className="w-4 h-4" />
  },
  {
    id: 'investor',
    title: 'Investor',
    icon: <Briefcase className="w-4 h-4" />
  }
];

export default function ImpersonationToolbar() {
  const { user, updateUserRole } = useAuthStore();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-ocean-900/95 backdrop-blur-sm border border-ocean-700 rounded-full shadow-lg px-2 py-1 z-50">
      <div className="flex items-center gap-1">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => updateUserRole(role.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
              user?.role === role.id
                ? 'bg-primary-600 text-white'
                : 'text-ocean-300 hover:bg-ocean-800'
            }`}
          >
            {role.icon}
            <span className="text-sm font-medium">{role.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}