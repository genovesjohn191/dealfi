import React, { useState } from 'react';
import { X, Users, AlertTriangle } from 'lucide-react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store';

interface AddReferralProps {
  onClose: () => void;
  type?: 'birddog' | 'inspector' | 'appraiser';
}

export default function AddReferral({ onClose, type = 'birddog' }: AddReferralProps) {
  const user = useAuthStore((state) => state.user);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Check if email already exists
      const existingUserQuery = query(
        collection(db, 'users'),
        where('email', '==', formData.email.toLowerCase())
      );
      const existingUserSnapshot = await getDocs(existingUserQuery);
      
      if (!existingUserSnapshot.empty) {
        setError('This email is already registered in the system');
        return;
      }

      // Create referral record
      const referralData = {
        referrerId: user?.uid,
        referrerEmail: user?.email,
        referrerName: user?.displayName,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email.toLowerCase(),
        phone: formData.phone,
        description: formData.description,
        type,
        status: 'pending',
        createdAt: new Date().toISOString(),
        inviteSent: true,
        level: 1, // Direct referral
        commissionRate: 0.10 // 10% for direct referrals
      };

      await addDoc(collection(db, 'referral_relationships'), referralData);
      onClose();
    } catch (err) {
      console.error('Error creating referral:', err);
      setError('Failed to send referral. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="relative bg-gray-800 rounded-lg w-full max-w-md my-8">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Add to Your Network</h2>
              <p className="text-sm text-ocean-300 mt-1">
                Invite someone to join your referral network
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-red-500 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter their email address"
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter their phone number"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add a note about this referral..."
                rows={3}
              />
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-400 mb-2">Referral Benefits</h4>
              <ul className="space-y-2 text-sm text-ocean-300">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-blue-400"></div>
                  <span>10% commission on direct referral earnings</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-blue-400"></div>
                  <span>Multi-level commission structure up to 7 levels</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-blue-400"></div>
                  <span>Automatic commission tracking and payouts</span>
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
              }`}
            >
              <Users className="w-4 h-4" />
              {isSubmitting ? 'Sending Invitation...' : 'Send Invitation'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}