import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store';
import { Lead } from '../../types';
import { FileText, Clock, Check } from 'lucide-react';
import LeadDetails from './LeadDetails';

export default function LeadDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user?.email) return;

    // Query for leads associated with this email
    const leadsQuery = query(
      collection(db, 'leads'),
      where('email', '==', user.email)
    );

    const unsubscribe = onSnapshot(leadsQuery, (snapshot) => {
      const leadsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Lead));
      setLeads(leadsList);
    });

    return () => unsubscribe();
  }, [user?.email]);

  const getLeadStatus = (lead: Lead) => {
    const completedStages = lead.stages.filter(stage => stage.completed).length;
    const totalStages = lead.stages.length;
    const percentage = Math.round((completedStages / totalStages) * 100);

    if (lead.status === 'closed') {
      return {
        icon: <Check className="w-4 h-4" />,
        text: 'Completed',
        className: 'text-green-400'
      };
    }

    if (completedStages === 0) {
      return {
        icon: <Clock className="w-4 h-4" />,
        text: 'New Request',
        className: 'text-yellow-400'
      };
    }

    return {
      icon: <FileText className="w-4 h-4" />,
      text: `${percentage}% Complete`,
      className: 'text-primary-400'
    };
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Active Requests</h3>
          <p className="text-3xl font-bold text-primary-400">
            {leads.filter(lead => lead.status !== 'closed').length}
          </p>
        </div>
        
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Completed</h3>
          <p className="text-3xl font-bold text-primary-400">
            {leads.filter(lead => lead.status === 'closed').length}
          </p>
        </div>
        
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Total Value</h3>
          <p className="text-3xl font-bold text-primary-400">
            ${leads.reduce((total, lead) => total + (lead.totalDealsValue || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Requests List */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Your Requests</h2>
        
        <div className="space-y-4">
          {leads.map(lead => {
            const status = getLeadStatus(lead);
            return (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className="bg-ocean-900/50 rounded-lg p-4 cursor-pointer hover:bg-ocean-900/70 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-medium text-white">
                      {lead.types.map(type => type.charAt(0).toUpperCase() + type.slice(1)).join(', ')}
                    </h3>
                    <p className="text-ocean-300">{lead.address}</p>
                  </div>
                  <div className={`flex items-center gap-2 ${status.className}`}>
                    {status.icon}
                    <span>{status.text}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {lead.stages.filter(stage => stage.completed).map(stage => (
                    <span
                      key={stage.id}
                      className="text-xs px-2 py-1 rounded-full bg-ocean-800 text-ocean-300"
                    >
                      {stage.title}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          {leads.length === 0 && (
            <div className="text-center text-ocean-400 py-8">
              No requests found
            </div>
          )}
        </div>
      </div>

      {/* Lead Details Modal */}
      {selectedLead && (
        <LeadDetails
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}