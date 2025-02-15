import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store';
import { Plus, Users, FileText, ChevronRight, Mail, Clock, Check, X, Send, Trash2 } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Lead, LeadFolder } from '../../types';
import AddReferral from './AddReferral';
import LeadForm from './LeadForm';
import LeadDetails from './LeadDetails';
import LeadFolders from './LeadFolders';

interface ReferralInvite {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  type: string;
  status: string;
  createdAt: string;
  lastReminderSent?: string;
}

export default function BirddogDashboard() {
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showLeadDetails, setShowLeadDetails] = useState<Lead | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [referralType, setReferralType] = useState<'birddog' | 'inspector' | 'appraiser'>('birddog');
  const [folders, setFolders] = useState<LeadFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<LeadFolder | null>(null);
  const [invites, setInvites] = useState<ReferralInvite[]>([]);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user?.uid) return;

    const leadsQuery = query(
      collection(db, 'leads'),
      where('birddogId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(leadsQuery, (snapshot) => {
      const leadsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Lead));
      setLeads(leadsList);
    }, (error) => {
      console.error('Error fetching leads:', error);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const foldersQuery = query(
      collection(db, 'folders'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(foldersQuery, (snapshot) => {
      const foldersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as LeadFolder));
      setFolders(foldersList);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const invitesQuery = query(
      collection(db, 'referral_relationships'),
      where('referrerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(invitesQuery, (snapshot) => {
      const invitesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ReferralInvite));
      setInvites(invitesList);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleCreateFolder = async (name: string, color: string) => {
    if (!user?.uid) return;

    try {
      await addDoc(collection(db, 'folders'), {
        name,
        color,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        leadIds: []
      });
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const handleUpdateFolder = async (folder: LeadFolder) => {
    try {
      const folderRef = doc(db, 'folders', folder.id);
      await updateDoc(folderRef, {
        name: folder.name,
        color: folder.color,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating folder:', error);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      // Update all leads in this folder to remove the folderId
      const leadsToUpdate = leads.filter(lead => lead.folderId === folderId);
      for (const lead of leadsToUpdate) {
        const leadRef = doc(db, 'leads', lead.id);
        await updateDoc(leadRef, { folderId: null });
      }

      // Delete the folder
      await deleteDoc(doc(db, 'folders', folderId));
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  };

  const handleMoveLeadToFolder = async (leadId: string, folderId: string | null) => {
    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, { folderId });

      // Update the old folder's leadIds
      if (selectedFolder) {
        const oldFolderRef = doc(db, 'folders', selectedFolder.id);
        await updateDoc(oldFolderRef, {
          leadIds: selectedFolder.leadIds.filter(id => id !== leadId),
          updatedAt: new Date().toISOString()
        });
      }

      // Update the new folder's leadIds
      if (folderId) {
        const newFolder = folders.find(f => f.id === folderId);
        if (newFolder) {
          const newFolderRef = doc(db, 'folders', folderId);
          await updateDoc(newFolderRef, {
            leadIds: [...newFolder.leadIds, leadId],
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error moving lead to folder:', error);
    }
  };

  const handleAddServiceProvider = (type: 'birddog' | 'inspector' | 'appraiser') => {
    setReferralType(type);
    setShowReferralModal(true);
  };

  const handleSendReminder = async (inviteId: string) => {
    try {
      const inviteRef = doc(db, 'referral_relationships', inviteId);
      await updateDoc(inviteRef, {
        lastReminderSent: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (!window.confirm('Are you sure you want to delete this invite?')) return;

    try {
      await deleteDoc(doc(db, 'referral_relationships', inviteId));
    } catch (error) {
      console.error('Error deleting invite:', error);
    }
  };

  const getLeadStatus = (lead: Lead) => {
    if (lead.status === 'new') {
      return {
        label: 'Pending Assignment',
        className: 'badge-yellow'
      };
    } else if (lead.status === 'processing') {
      const completedStages = lead.stages.filter(stage => stage.completed).length;
      const totalStages = lead.stages.length;
      return {
        label: `In Progress (${completedStages}/${totalStages})`,
        className: 'badge-blue'
      };
    } else {
      return {
        label: 'Closed',
        className: 'badge-green'
      };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'accepted':
        return <Check className="w-4 h-4 text-green-400" />;
      case 'declined':
        return <X className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-ocean-400" />;
    }
  };

  // Filter leads based on selected folder
  const filteredLeads = selectedFolder
    ? leads.filter(lead => lead.folderId === selectedFolder.id)
    : leads;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Active Leads</h3>
          <p className="text-3xl font-bold text-primary-400">{leads.length}</p>
        </div>
        
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Total Deals Closed</h3>
          <p className="text-3xl font-bold text-primary-400">
            {leads.reduce((total, lead) => total + (lead.dealsClosedScore || 0), 0)}
          </p>
        </div>
        
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Total Deal Value</h3>
          <p className="text-3xl font-bold text-primary-400">
            ${leads.reduce((total, lead) => total + (lead.totalDealsValue || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <button
            onClick={() => handleAddServiceProvider('birddog')}
            className="w-full btn-primary flex items-center justify-center gap-3"
          >
            <Users className="w-5 h-5" />
            Add Birddog to Network
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleAddServiceProvider('inspector')}
              className="btn-secondary flex items-center justify-center gap-3"
            >
              <FileText className="w-5 h-5" />
              Add Inspector
            </button>

            <button
              onClick={() => handleAddServiceProvider('appraiser')}
              className="btn-secondary flex items-center justify-center gap-3"
            >
              <FileText className="w-5 h-5" />
              Add Appraiser
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowLeadModal(true)}
          className="btn-primary flex items-center justify-center gap-3"
        >
          <Plus className="w-5 h-5" />
          Submit New Lead
        </button>
      </div>

      {/* Referral Invites */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Referral Invites</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-ocean-700">
                <th className="pb-3 text-ocean-300 font-medium">Name</th>
                <th className="pb-3 text-ocean-300 font-medium">Email</th>
                <th className="pb-3 text-ocean-300 font-medium">Type</th>
                <th className="pb-3 text-ocean-300 font-medium">Status</th>
                <th className="pb-3 text-ocean-300 font-medium">Sent</th>
                <th className="pb-3 text-ocean-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr key={invite.id} className="border-b border-ocean-700/50">
                  <td className="py-4 text-white">
                    {invite.firstName} {invite.lastName}
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2 text-ocean-300">
                      <Mail className="w-4 h-4" />
                      {invite.email}
                    </div>
                  </td>
                  <td className="py-4">
                    <span className="badge badge-blue">
                      {invite.type.charAt(0).toUpperCase() + invite.type.slice(1)}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(invite.status)}
                      <span className={`text-sm ${
                        invite.status === 'accepted' ? 'text-green-400' :
                        invite.status === 'declined' ? 'text-red-400' :
                        'text-yellow-400'
                      }`}>
                        {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 text-ocean-300">
                    {new Date(invite.createdAt).toLocaleDateString()}
                    {invite.lastReminderSent && (
                      <div className="text-xs text-ocean-400 mt-1">
                        Reminder sent: {new Date(invite.lastReminderSent).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      {invite.status === 'pending' && (
                        <button
                          onClick={() => handleSendReminder(invite.id)}
                          className="p-2 text-ocean-300 hover:text-primary-400 transition-colors"
                          title="Send Reminder"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteInvite(invite.id)}
                        className="p-2 text-ocean-300 hover:text-red-400 transition-colors"
                        title="Delete Invite"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {invites.length === 0 && (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-ocean-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                No Invites Sent
              </h3>
              <p className="text-ocean-300">
                Start growing your network by inviting others to join
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add LeadFolders component */}
      <LeadFolders
        folders={folders}
        selectedFolder={selectedFolder}
        onSelectFolder={setSelectedFolder}
        onCreateFolder={handleCreateFolder}
        onUpdateFolder={handleUpdateFolder}
        onDeleteFolder={handleDeleteFolder}
      />

      {/* Leads Table */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          {selectedFolder ? `Leads in ${selectedFolder.name}` : 'All Leads'}
        </h2>
        {filteredLeads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-ocean-700">
                  <th className="pb-3 text-ocean-300">Client</th>
                  <th className="pb-3 text-ocean-300">Address</th>
                  <th className="pb-3 text-ocean-300">Type</th>
                  <th className="pb-3 text-ocean-300">Status</th>
                  <th className="pb-3 text-ocean-300">Deals Closed</th>
                  <th className="pb-3 text-ocean-300">Submitted</th>
                  <th className="pb-3 text-ocean-300"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  const status = getLeadStatus(lead);
                  return (
                    <tr 
                      key={lead.id} 
                      className="border-b border-ocean-700/50 cursor-pointer hover:bg-ocean-900/30 transition"
                      onClick={() => setShowLeadDetails(lead)}
                    >
                      <td className="py-4 text-white hover:text-primary-400 transition">
                        {lead.firstName} {lead.lastName}
                      </td>
                      <td className="py-4 text-white">{lead.address}</td>
                      <td className="py-4">
                        {lead.types.map((type) => (
                          <span
                            key={type}
                            className="badge badge-blue mr-1"
                          >
                            {type}
                          </span>
                        ))}
                      </td>
                      <td className="py-4">
                        <span className={`badge ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-primary-400 font-semibold">
                            {lead.dealsClosedScore || 0}
                          </span>
                          {lead.dealsClosedScore > 0 && (
                            <span className="text-ocean-400 text-sm">
                              (${lead.totalDealsValue?.toLocaleString()})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-ocean-400">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={lead.folderId || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleMoveLeadToFolder(lead.id, e.target.value || null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="input text-sm"
                          >
                            <option value="">No Folder</option>
                            {folders.map(folder => (
                              <option key={folder.id} value={folder.id}>
                                {folder.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-ocean-400 py-8">
            {selectedFolder 
              ? `No leads in ${selectedFolder.name}`
              : 'No leads submitted yet'
            }
          </div>
        )}
      </div>

      {/* Modals */}
      {showReferralModal && (
        <AddReferral 
          onClose={() => setShowReferralModal(false)} 
          type={referralType}
        />
      )}
      
      {showLeadModal && (
        <LeadForm onClose={() => setShowLeadModal(false)} />
      )}

      {showLeadDetails && (
        <LeadDetails lead={showLeadDetails} onClose={() => setShowLeadDetails(null)} />
      )}
    </div>
  );
}