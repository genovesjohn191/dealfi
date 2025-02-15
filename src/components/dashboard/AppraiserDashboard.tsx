import React, { useState, useEffect } from 'react';
import { FileText, Check, X, Clock, ChevronRight, Upload } from 'lucide-react';
import { Lead } from '../../types';
import LeadStages from './LeadStages';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store';

export default function AppraiserDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [reportContent, setReportContent] = useState('');
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user?.uid) return;

    // Query for leads where appraiser is needed
    const leadsQuery = query(
      collection(db, 'leads'),
      where('stages', 'array-contains', {
        id: 'appraiser_needed',
        completed: true
      })
    );

    const unsubscribe = onSnapshot(leadsQuery, (snapshot) => {
      const leadsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Lead)).filter(lead => {
        // Only show leads that:
        // 1. Have appraiser_needed stage completed
        // 2. Don't have appraisal_completed stage completed
        // 3. Either have no appraiser assigned or are assigned to current appraiser
        const appraiserNeededStage = lead.stages.find(s => s.id === 'appraiser_needed');
        const appraisalCompletedStage = lead.stages.find(s => s.id === 'appraisal_completed');
        
        return appraiserNeededStage?.completed && 
               !appraisalCompletedStage?.completed &&
               (!lead.assignedAppraiserId || lead.assignedAppraiserId === user.uid);
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
        stage.id === 'appraisal_scheduled' ? {
          ...stage,
          completed: true,
          completedAt: new Date().toISOString(),
          completedBy: {
            id: user.uid,
            name: user.displayName || 'Appraiser',
            role: 'appraiser'
          }
        } : stage
      );

      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        assignedAppraiserId: user.uid,
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
        stage.id === 'appraisal_completed' ? {
          ...stage,
          completed: true,
          completedAt: new Date().toISOString(),
          completedBy: {
            id: user.uid,
            name: user.displayName || 'Appraiser',
            role: 'appraiser'
          },
          report: {
            content: reportContent,
            submittedAt: new Date().toISOString(),
            submittedBy: {
              id: user.uid,
              name: user.displayName || 'Appraiser'
            }
          }
        } : stage
      );

      // Update user's earnings when appraisal is completed
      const appraisalStage = lead.stages.find(s => s.id === 'appraiser_needed');
      if (appraisalStage?.fee) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          earnings: (user.earnings || 0) + appraisalStage.fee
        });
      }

      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        stages: updatedStages,
        needsAppraiser: false
      });

      setReportContent('');
      setSelectedLead(null);
    } catch (error) {
      console.error('Error submitting report:', error);
    }
  };

  // Separate leads into available and active
  const availableLeads = leads.filter(lead => !lead.assignedAppraiserId);
  const activeLeads = leads.filter(lead => lead.assignedAppraiserId === user?.uid);

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

      {/* Available Jobs Table */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Available Appraisal Jobs</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-ocean-700">
                <th className="pb-3 text-ocean-300 font-medium">Client</th>
                <th className="pb-3 text-ocean-300 font-medium">Property</th>
                <th className="pb-3 text-ocean-300 font-medium">Type</th>
                <th className="pb-3 text-ocean-300 font-medium">Fee</th>
                <th className="pb-3 text-ocean-300 font-medium">Status</th>
                <th className="pb-3 text-ocean-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {availableLeads.map(lead => {
                const appraisalStage = lead.stages.find(stage => 
                  stage.id === 'appraiser_needed'
                );
                const fee = appraisalStage?.fee || 0;

                return (
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
                      <span className="text-primary-400 font-semibold">
                        ${fee}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className="badge badge-yellow">
                        Awaiting Appraiser
                      </span>
                    </td>
                    <td className="py-4">
                      <button
                        onClick={() => handleAcceptJob(lead.id)}
                        className="btn-primary"
                      >
                        Accept Job
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {availableLeads.length === 0 && (
            <div className="text-center text-ocean-400 py-8">
              No appraisal jobs available at the moment
            </div>
          )}
        </div>
      </div>

      {/* Active Jobs */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Active Jobs</h2>
        
        <div className="space-y-4">
          {activeLeads.map(lead => {
            const appraisalStages = lead.stages.filter(stage => 
              stage.id.includes('appraisal')
            );
            
            return (
              <div 
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className="bg-ocean-900/50 rounded-lg p-4 cursor-pointer hover:bg-ocean-900/70 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-medium text-white">
                      {lead.firstName} {lead.lastName}
                    </h3>
                    <p className="text-ocean-300">{lead.address}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-ocean-400" />
                </div>
                <div className="space-y-2">
                  {appraisalStages.map(stage => (
                    <div 
                      key={stage.id}
                      className="flex items-center gap-2"
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        stage.completed ? 'bg-green-400' : 'bg-ocean-600'
                      }`} />
                      <span className={`text-sm ${
                        stage.completed ? 'text-green-400' : 'text-ocean-400'
                      }`}>
                        {stage.title}
                      </span>
                    </div>
                  ))}
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
              <h2 className="text-xl font-semibold text-white">Appraisal Details</h2>
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

              {selectedLead.assignedAppraiserId === user?.uid && (
                <div>
                  <h3 className="text-sm font-medium text-ocean-400 mb-2">Appraisal Report</h3>
                  <textarea
                    value={reportContent}
                    onChange={(e) => setReportContent(e.target.value)}
                    className="input w-full min-h-[200px]"
                    placeholder="Enter your detailed appraisal report here..."
                  />
                  <button
                    onClick={() => handleSubmitReport(selectedLead.id)}
                    disabled={!reportContent.trim()}
                    className="btn-primary mt-4 w-full flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Submit Report
                  </button>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-ocean-400 mb-4">Appraisal Checklist</h3>
                <LeadStages
                  stages={selectedLead.stages.filter(stage => 
                    stage.id.includes('appraisal')
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