import React, { useState, useEffect } from 'react';
import { FileText, Check, X, Clock, ChevronRight } from 'lucide-react';
import { Lead } from '../../types';
import LeadStages from './LeadStages';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store';

export default function AgentDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user?.uid) return;

    const leadsQuery = query(
      collection(db, 'leads'),
      where('status', 'in', ['new', 'processing']),
      where('types', 'array-contains-any', ['purchase', 'sell'])
    );

    const unsubscribe = onSnapshot(leadsQuery, (snapshot) => {
      const leadsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Lead)).filter(lead => 
        lead.status === 'new' || lead.assignedAgentId === user.uid
      );
      setLeads(leadsList);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleAcceptLead = async (leadId: string) => {
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead || !user) return;

      const updatedStages = lead.stages.map(stage => 
        stage.id === 'agent_accepted' ? {
          ...stage,
          completed: true,
          completedAt: new Date().toISOString(),
          completedBy: {
            id: user.uid,
            name: user.displayName || 'Agent',
            role: 'agent'
          }
        } : stage
      );

      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        status: 'processing',
        assignedAgentId: user.uid,
        stages: updatedStages
      });
    } catch (error) {
      console.error('Error accepting lead:', error);
    }
  };

  const handleStageComplete = async (leadId: string, stageId: string) => {
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead || !user) return;

      const updatedStages = lead.stages.map(stage =>
        stage.id === stageId
          ? {
              ...stage,
              completed: !stage.completed,
              completedAt: !stage.completed ? new Date().toISOString() : undefined,
              completedBy: !stage.completed ? {
                id: user.uid,
                name: user.displayName || 'Agent',
                role: 'agent'
              } : undefined
            }
          : stage
      );

      const stage = lead.stages.find(s => s.id === stageId);
      const shouldNotifyLender = stage?.id === 'contract_signed' &&
        lead.types.some(type => ['mortgage', 'hardmoney'].includes(type));

      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        stages: updatedStages,
        needsLender: shouldNotifyLender || lead.needsLender
      });
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  const getLeadProgress = (lead: Lead) => {
    const relevantStages = lead.stages.filter(stage => 
      stage.id === 'agent_accepted' || 
      stage.id.includes('property') ||
      stage.id.includes('showing') ||
      stage.id.includes('offer') ||
      stage.id.includes('contract') ||
      stage.id.includes('inspection') ||
      stage.id.includes('appraisal') ||
      stage.id.includes('closing') ||
      stage.id.includes('deal')
    );
    
    const completedStages = relevantStages.filter(stage => stage.completed).length;
    return {
      completed: completedStages,
      total: relevantStages.length,
      percentage: Math.round((completedStages / relevantStages.length) * 100)
    };
  };

  const getLeadStatus = (lead: Lead) => {
    if (!lead.assignedAgentId) {
      return {
        icon: <Clock className="w-4 h-4" />,
        text: 'Awaiting Agent',
        className: 'text-yellow-400'
      };
    }

    const progress = getLeadProgress(lead);
    if (progress.percentage === 100) {
      return {
        icon: <Check className="w-4 h-4" />,
        text: 'Completed',
        className: 'text-green-400'
      };
    }

    return {
      icon: <FileText className="w-4 h-4" />,
      text: `${progress.percentage}% Complete`,
      className: 'text-primary-400'
    };
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Active Leads</h3>
          <p className="text-3xl font-bold text-primary-400">
            {leads.filter(lead => lead.status === 'processing' && lead.assignedAgentId === user?.uid).length}
          </p>
        </div>
        
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">New Leads</h3>
          <p className="text-3xl font-bold text-primary-400">
            {leads.filter(lead => lead.status === 'new').length}
          </p>
        </div>
        
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Closed Deals</h3>
          <p className="text-3xl font-bold text-primary-400">
            {leads.filter(lead => lead.status === 'closed').length}
          </p>
        </div>
      </div>

      {/* New Leads */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Available Leads</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-ocean-700">
                <th className="pb-3 text-ocean-300 font-medium">Client</th>
                <th className="pb-3 text-ocean-300 font-medium">Property</th>
                <th className="pb-3 text-ocean-300 font-medium">Type</th>
                <th className="pb-3 text-ocean-300 font-medium">Status</th>
                <th className="pb-3 text-ocean-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads
                .filter(lead => lead.status === 'new')
                .map(lead => (
                  <tr key={lead.id} className="border-b border-ocean-700/50">
                    <td className="py-4 text-white">
                      {lead.firstName} {lead.lastName}
                    </td>
                    <td className="py-4 text-white">{lead.address}</td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2">
                        {lead.types.map(type => (
                          <span key={type} className="badge badge-blue">
                            {type}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className={`flex items-center gap-2 ${getLeadStatus(lead).className}`}>
                        {getLeadStatus(lead).icon}
                        <span className="text-sm">{getLeadStatus(lead).text}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <button
                        onClick={() => handleAcceptLead(lead.id)}
                        className="btn-primary"
                      >
                        Accept Lead
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          
          {leads.filter(lead => lead.status === 'new').length === 0 && (
            <div className="text-center text-ocean-400 py-8">
              No new leads available at the moment
            </div>
          )}
        </div>
      </div>

      {/* Active Leads */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Active Leads</h2>
        
        <div className="divide-y divide-ocean-800">
          {leads
            .filter(lead => lead.assignedAgentId === user?.uid)
            .map(lead => {
              const progress = getLeadProgress(lead);
              const status = getLeadStatus(lead);
              return (
                <div 
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className="py-4 cursor-pointer hover:bg-ocean-900/30 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between px-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-medium text-white">
                          {lead.firstName} {lead.lastName}
                        </h3>
                        <div className="flex items-center gap-2">
                          {lead.types.map(type => (
                            <span key={type} className="badge badge-blue">
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-ocean-300 text-sm mb-2">{lead.address}</p>
                      <div className="w-full bg-ocean-900 rounded-full h-2">
                        <div 
                          className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-ocean-400 text-sm">
                          {progress.completed} of {progress.total} stages completed
                        </p>
                        <div className={`flex items-center gap-2 ${status.className} text-sm`}>
                          {status.icon}
                          <span>{status.text}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-ocean-400 ml-4" />
                  </div>
                </div>
              );
            })}
            
          {leads.filter(lead => lead.assignedAgentId === user?.uid).length === 0 && (
            <div className="text-center text-ocean-400 py-8">
              No active leads at the moment
            </div>
          )}
        </div>
      </div>

      {/* Lead Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Lead Progress</h2>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-ocean-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-ocean-400 mb-1">Client</h3>
                  <p className="text-white">
                    {selectedLead.firstName} {selectedLead.lastName}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ocean-400 mb-1">Property</h3>
                  <p className="text-white">{selectedLead.address}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-ocean-400 mb-1">Notes</h3>
                <p className="text-white">{selectedLead.notes || 'No notes provided'}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-ocean-400 mb-4">Progress Checklist</h3>
                <LeadStages
                  stages={selectedLead.stages}
                  onStageComplete={(stageId) => handleStageComplete(selectedLead.id, stageId)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}