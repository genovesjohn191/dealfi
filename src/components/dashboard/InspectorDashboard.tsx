import React, { useState, useEffect } from 'react';
import { FileText, Check, Clock, ChevronRight, X } from 'lucide-react';
import { Lead } from '../../types';
import LeadStages from './LeadStages';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store';

export default function InspectorDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [reportContent, setReportContent] = useState('');
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user?.uid) return;

    const leadsQuery = query(
      collection(db, 'leads'),
      where('stages', 'array-contains', {
        id: 'inspector_needed',
        completed: true
      })
    );

    const unsubscribe = onSnapshot(leadsQuery, (snapshot) => {
      const leadsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Lead)).filter(lead => {
        const inspectorNeededStage = lead.stages.find(s => s.id === 'inspector_needed');
        const inspectionCompletedStage = lead.stages.find(s => s.id === 'inspection_completed');
        
        return inspectorNeededStage?.completed && 
               !inspectionCompletedStage?.completed &&
               (!lead.assignedInspectorId || lead.assignedInspectorId === user.uid);
      });
      
      setLeads(leadsList);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleAcceptJob = async (leadId: string) => {
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead || !user) return;

      const updatedStages = lead.stages.map(stage => 
        stage.id === 'inspection_scheduled' ? {
          ...stage,
          completed: true,
          completedAt: new Date().toISOString(),
          completedBy: {
            id: user.uid,
            name: user.displayName || 'Inspector',
            role: 'inspector'
          }
        } : stage
      );

      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        assignedInspectorId: user.uid,
        stages: updatedStages
      });
    } catch (error) {
      console.error('Error accepting job:', error);
    }
  };

  const handleSubmitReport = async (leadId: string) => {
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead || !user || !reportContent.trim()) return;

      const updatedStages = lead.stages.map(stage => 
        stage.id === 'inspection_completed' ? {
          ...stage,
          completed: true,
          completedAt: new Date().toISOString(),
          completedBy: {
            id: user.uid,
            name: user.displayName || 'Inspector',
            role: 'inspector'
          },
          report: {
            content: reportContent,
            submittedAt: new Date().toISOString(),
            submittedBy: {
              id: user.uid,
              name: user.displayName || 'Inspector'
            }
          }
        } : stage
      );

      // Update user's earnings when inspection is completed
      const inspectionStage = lead.stages.find(s => s.id === 'inspector_needed');
      if (inspectionStage?.fee) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          earnings: (user.earnings || 0) + inspectionStage.fee
        });
      }

      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        stages: updatedStages,
        needsInspector: false,
        inspectionReport: reportContent
      });

      setReportContent('');
      setSelectedLead(null);
    } catch (error) {
      console.error('Error submitting report:', error);
    }
  };

  const getLeadProgress = (lead: Lead) => {
    const inspectionStages = lead.stages.filter(stage => 
      stage.id.includes('inspection')
    );
    
    const completedStages = inspectionStages.filter(stage => stage.completed).length;
    return {
      completed: completedStages,
      total: inspectionStages.length,
      percentage: Math.round((completedStages / inspectionStages.length) * 100)
    };
  };

  const getLeadStatus = (lead: Lead) => {
    if (!lead.assignedInspectorId) {
      return {
        icon: <Clock className="w-4 h-4" />,
        text: 'Awaiting Inspector',
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

  // Separate leads into available and active
  const availableLeads = leads.filter(lead => !lead.assignedInspectorId);
  const activeLeads = leads.filter(lead => lead.assignedInspectorId === user?.uid);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Active Jobs</h3>
          <p className="text-3xl font-bold text-primary-400">
            {activeLeads.length}
          </p>
        </div>
        
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Available Jobs</h3>
          <p className="text-3xl font-bold text-primary-400">
            {availableLeads.length}
          </p>
        </div>
        
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Total Earnings</h3>
          <p className="text-3xl font-bold text-primary-400">
            ${user?.earnings?.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Available Jobs */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Available Inspection Jobs</h2>
        
        <div className="divide-y divide-ocean-800">
          {availableLeads.map(lead => {
            const inspectionStage = lead.stages.find(stage => 
              stage.id === 'inspector_needed'
            );
            const fee = inspectionStage?.fee || 0;
            const status = getLeadStatus(lead);

            return (
              <div 
                key={lead.id}
                className="py-4 hover:bg-ocean-900/30 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between px-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium text-white">
                        {lead.firstName} {lead.lastName}
                      </h3>
                      <span className="text-primary-400 font-semibold">
                        ${fee}
                      </span>
                    </div>
                    <p className="text-ocean-300 text-sm mb-2">{lead.address}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {lead.types.map(type => (
                          <span key={type} className="badge badge-blue">
                            {type}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => handleAcceptJob(lead.id)}
                        className="btn-primary"
                      >
                        Accept Job
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {availableLeads.length === 0 && (
            <div className="text-center text-ocean-400 py-8">
              No inspection jobs available at the moment
            </div>
          )}
        </div>
      </div>

      {/* Active Jobs */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Active Jobs</h2>
        
        <div className="divide-y divide-ocean-800">
          {activeLeads.map(lead => {
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
            
          {activeLeads.length === 0 && (
            <div className="text-center text-ocean-400 py-8">
              No active jobs at the moment
            </div>
          )}
        </div>
      </div>

      {/* Job Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Inspection Details</h2>
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
                <h3 className="text-sm font-medium text-ocean-400 mb-1">Contact Information</h3>
                <p className="text-white">Email: {selectedLead.email}</p>
                <p className="text-white">Phone: {selectedLead.phone}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-ocean-400 mb-2">Inspection Report</h3>
                <textarea
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  className="input w-full min-h-[200px]"
                  placeholder="Enter your detailed inspection report here..."
                />
                <button
                  onClick={() => handleSubmitReport(selectedLead.id)}
                  disabled={!reportContent.trim()}
                  className="btn-primary mt-4 w-full"
                >
                  Submit Report
                </button>
              </div>

              <div>
                <h3 className="text-sm font-medium text-ocean-400 mb-4">Progress Checklist</h3>
                <LeadStages
                  stages={selectedLead.stages.filter(stage => 
                    stage.id.includes('inspection')
                  )}
                  onStageComplete={() => {}} // Stages are completed via report submission
                  readOnly={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}