import React, { useState, useEffect } from 'react';
import { FileText, Check, Clock, ChevronRight } from 'lucide-react';
import { Lead } from '../../types';
import LeadStages from './LeadStages';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store';

export default function LenderDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user?.uid) return;

    const leadsQuery = query(
      collection(db, 'leads'),
      where('types', 'array-contains-any', ['mortgage', 'hardmoney'])
    );

    const unsubscribe = onSnapshot(leadsQuery, (snapshot) => {
      const leadsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Lead)).filter(lead => 
        (lead.needsLender && !lead.assignedLenderId) || // New leads needing a lender
        lead.assignedLenderId === user.uid // Leads assigned to this lender
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
        stage.id === 'lender_accepted' ? {
          ...stage,
          completed: true,
          completedAt: new Date().toISOString(),
          completedBy: {
            id: user.uid,
            name: user.displayName || 'Lender',
            role: 'lender'
          }
        } : stage
      );

      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        assignedLenderId: user.uid,
        stages: updatedStages,
        status: 'processing' // Update the lead status to processing
      });
    } catch (error) {
      console.error('Error accepting lead:', error);
    }
  };

  const handleStageComplete = async (leadId: string, stageId: string) => {
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead || !user) return;

      const stage = lead.stages.find(s => s.id === stageId);
      if (!stage) return;

      const updatedStages = lead.stages.map(s =>
        s.id === stageId ? {
          ...s,
          completed: !s.completed,
          completedAt: !s.completed ? new Date().toISOString() : undefined,
          completedBy: !s.completed ? {
            id: user.uid,
            name: user.displayName || 'Lender',
            role: 'lender'
          } : undefined
        } : s
      );

      // Check if we need to update needsAppraiser flag
      const needsAppraiser = stageId === 'appraiser_needed' && !stage.completed;

      // Check if all loan stages are completed
      const loanStages = updatedStages.filter(stage => 
        stage.id === 'lender_accepted' || 
        stage.id.includes('pre_approval') ||
        stage.id.includes('documents') ||
        stage.id.includes('application') ||
        stage.id.includes('underwriting') ||
        stage.id.includes('conditions') ||
        stage.id.includes('approved') ||
        stage.id.includes('appraisal')
      );
      
      const allLoanStagesCompleted = loanStages.every(stage => stage.completed);

      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        stages: updatedStages,
        needsAppraiser,
        status: allLoanStagesCompleted ? 'closed' : 'processing'
      });
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  const getLeadProgress = (lead: Lead) => {
    const loanStages = lead.stages.filter(stage => 
      stage.id === 'lender_accepted' || 
      stage.id.includes('pre_approval') ||
      stage.id.includes('documents') ||
      stage.id.includes('application') ||
      stage.id.includes('underwriting') ||
      stage.id.includes('conditions') ||
      stage.id.includes('approved') ||
      stage.id.includes('appraisal')
    );
    
    const completedStages = loanStages.filter(stage => stage.completed).length;
    return {
      completed: completedStages,
      total: loanStages.length,
      percentage: Math.round((completedStages / loanStages.length) * 100)
    };
  };

  const getLeadStatus = (lead: Lead) => {
    if (!lead.assignedLenderId) {
      return {
        icon: <Clock className="w-4 h-4" />,
        text: 'Awaiting Lender',
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
          <h3 className="text-xl font-semibold text-white mb-4">Active Loans</h3>
          <p className="text-3xl font-bold text-primary-400">
            {leads.filter(lead => lead.assignedLenderId === user?.uid).length}
          </p>
        </div>
        
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">New Requests</h3>
          <p className="text-3xl font-bold text-primary-400">
            {leads.filter(lead => !lead.assignedLenderId && lead.needsLender).length}
          </p>
        </div>
        
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Closed Loans</h3>
          <p className="text-3xl font-bold text-primary-400">
            {leads.filter(lead => lead.status === 'closed').length}
          </p>
        </div>
      </div>

      {/* Loan Requests */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Loan Requests</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-ocean-700">
                <th className="pb-3 text-ocean-300 font-medium">Client</th>
                <th className="pb-3 text-ocean-300 font-medium">Property</th>
                <th className="pb-3 text-ocean-300 font-medium">Loan Type</th>
                <th className="pb-3 text-ocean-300 font-medium">Status</th>
                <th className="pb-3 text-ocean-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads
                .filter(lead => lead.needsLender && !lead.assignedLenderId)
                .map(lead => {
                  const status = getLeadStatus(lead);
                  return (
                    <tr key={lead.id} className="border-b border-ocean-800/50">
                      <td className="py-4 text-white">
                        {lead.firstName} {lead.lastName}
                      </td>
                      <td className="py-4 text-white">{lead.address}</td>
                      <td className="py-4">
                        <div className="flex flex-wrap gap-2">
                          {lead.types
                            .filter(type => ['mortgage', 'hardmoney'].includes(type))
                            .map(type => (
                              <span key={type} className="badge badge-blue">
                                {type === 'mortgage' ? 'Traditional Mortgage' : 'Hard Money'}
                              </span>
                            ))}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className={`flex items-center gap-2 ${status.className}`}>
                          {status.icon}
                          <span className="text-sm">{status.text}</span>
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
                  );
                })}
            </tbody>
          </table>
          
          {leads.filter(lead => lead.needsLender && !lead.assignedLenderId).length === 0 && (
            <div className="text-center text-ocean-400 py-8">
              No loan requests available at the moment
            </div>
          )}
        </div>
      </div>

      {/* Active Loans */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Active Loans</h2>
        
        <div className="divide-y divide-ocean-800">
          {leads
            .filter(lead => lead.assignedLenderId === user?.uid)
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
                          {lead.types
                            .filter(type => ['mortgage', 'hardmoney'].includes(type))
                            .map(type => (
                              <span key={type} className="badge badge-blue">
                                {type === 'mortgage' ? 'Traditional Mortgage' : 'Hard Money'}
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
            
          {leads.filter(lead => lead.assignedLenderId === user?.uid).length === 0 && (
            <div className="text-center text-ocean-400 py-8">
              No active loans at the moment
            </div>
          )}
        </div>
      </div>

      {/* Lead Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Loan Progress</h2>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-ocean-400 hover:text-white transition"
              >
                <FileText className="w-5 h-5" />
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
                <h3 className="text-sm font-medium text-ocean-400 mb-4">Loan Progress</h3>
                <LeadStages
                  stages={selectedLead.stages.filter(stage => 
                    stage.id === 'lender_accepted' || 
                    stage.id.includes('pre_approval') ||
                    stage.id.includes('documents') ||
                    stage.id.includes('application') ||
                    stage.id.includes('underwriting') ||
                    stage.id.includes('conditions') ||
                    stage.id.includes('approved') ||
                    stage.id.includes('appraisal')
                  )}
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