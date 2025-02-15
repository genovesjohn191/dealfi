import React, { useState } from 'react';
import { X, Coins, AlertTriangle } from 'lucide-react';
import { LeadType, getLeadStages } from '../../types';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthStore } from '../../store';

interface LeadFormProps {
  onClose: () => void;
}

const leadTypes: { value: LeadType; label: string }[] = [
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'rental', label: 'Rental Property' },
  { value: 'hardmoney', label: 'Hard Money Loan' },
  { value: 'purchase', label: 'Purchase Home' },
  { value: 'sell', label: 'Sell Home' },
];

export default function LeadForm({ onClose }: LeadFormProps) {
  const user = useAuthStore((state) => state.user);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    types: [] as LeadType[],
    notes: '',
    isCashDeal: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState<number>(0);
  const [showStakeWarning, setShowStakeWarning] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.uid) {
      setError('You must be logged in to submit leads');
      return;
    }
    
    if (formData.types.length === 0) {
      setError('Please select at least one lead type');
      return;
    }

    // Validate email
    if (!formData.email || !formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setDebugInfo(null);

    try {
      console.log('Starting lead submission process...', {
        userUid: user.uid,
        selectedTypes: formData.types,
        hasStake: stakeAmount > 0,
        timestamp: new Date().toISOString()
      });

      const allStages = formData.types.flatMap(type => {
        return getLeadStages(type).map(stage => ({
          ...stage,
          completed: false
        }));
      });

      const uniqueStages = allStages.filter(
        (stage, index, self) =>
          index === self.findIndex((s) => s.id === stage.id)
      );

      console.log('Generated stages:', {
        totalStages: uniqueStages.length,
        stages: uniqueStages.map(s => s.id),
        timestamp: new Date().toISOString()
      });

      const needsLender = formData.types.includes('purchase') && !formData.isCashDeal;

      // Add confidence stake if amount > 0
      const confidenceStake = stakeAmount > 0 ? {
        amount: stakeAmount,
        timestamp: new Date().toISOString(),
        tokenId: 'BIRDFI',
        status: 'active'
      } : undefined;

      const newLeadData = {
        ...formData,
        birddogId: user.uid,
        createdAt: new Date().toISOString(),
        status: 'new',
        stages: uniqueStages,
        needsLender,
        confidenceStake,
        birddogReputation: user.reputation || 0
      };

      console.log('Preparing lead data:', {
        hasConfidenceStake: !!confidenceStake,
        needsLender,
        totalStages: uniqueStages.length,
        timestamp: new Date().toISOString(),
        leadEmail: formData.email,
        birddogEmail: user.email
      });

      // If staking, lock tokens
      if (stakeAmount > 0) {
        console.log('Processing stake...', {
          amount: stakeAmount,
          currentAvailable: user.availableTokens,
          currentLocked: user.lockedTokens,
          timestamp: new Date().toISOString()
        });

        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          availableTokens: user.availableTokens - stakeAmount,
          lockedTokens: (user.lockedTokens || 0) + stakeAmount
        });

        console.log('Stake processed successfully');
      }

      // Create the lead
      console.log('Creating lead document...', {
        timestamp: new Date().toISOString()
      });
      
      const leadsRef = collection(db, 'leads');
      const docRef = await addDoc(leadsRef, newLeadData);
      
      console.log('Lead created successfully:', {
        leadId: docRef.id,
        timestamp: new Date().toISOString()
      });

      // Store debug info for display
      setDebugInfo({
        leadId: docRef.id,
        timestamp: new Date().toISOString(),
        emailsSent: false, // Will be updated by the cloud function
        stages: uniqueStages.length,
        stake: stakeAmount > 0 ? {
          amount: stakeAmount,
          status: 'locked'
        } : null,
        emails: {
          lead: formData.email,
          birddog: user.email
        }
      });

      // Wait a bit to allow cloud function to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if the lead document was updated with email status
      const updatedLeadDoc = await getDoc(doc(db, 'leads', docRef.id));
      const updatedLeadData = updatedLeadDoc.data();
      
      if (updatedLeadData?.emailStatus) {
        setDebugInfo(prev => ({
          ...prev,
          emailStatus: updatedLeadData.emailStatus,
          emailsProcessed: true
        }));
      }

      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error submitting lead:', {
        error: err,
        formData: {
          ...formData,
          email: formData.email.slice(0, 3) + '***' // Mask email for privacy
        },
        timestamp: new Date().toISOString()
      });
      setError(`Failed to submit lead: ${errorMessage}`);
      setDebugInfo({
        error: errorMessage,
        timestamp: new Date().toISOString(),
        stage: 'submission_failed'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTypeToggle = (type: LeadType) => {
    setFormData(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }));
  };

  const showCashDealOption = formData.types.includes('purchase');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Submit New Lead</h2>
          <button
            onClick={onClose}
            className="text-ocean-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-red-500 text-sm">
              {error}
            </div>
          )}

          {debugInfo && (
            <div className="bg-ocean-900/50 border border-ocean-700 rounded p-3 space-y-2">
              <h4 className="text-sm font-medium text-ocean-300">Debug Information</h4>
              <pre className="text-xs text-ocean-400 overflow-x-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-ocean-300 mb-1">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                className="input w-full"
                required
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-ocean-300 mb-1">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className="input w-full"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ocean-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="input w-full"
                required
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-ocean-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="input w-full"
                required
                placeholder="(123) 456-7890"
              />
            </div>
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-ocean-300 mb-1">
              Address
            </label>
            <input
              type="text"
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="input w-full"
              required
              placeholder="123 Main St, City, State, ZIP"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ocean-300 mb-2">
              Lead Type (Select all that apply)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {leadTypes.map(type => (
                <label
                  key={type.value}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.types.includes(type.value)}
                    onChange={() => handleTypeToggle(type.value)}
                    className="w-4 h-4 text-primary-600 border-ocean-600 rounded focus:ring-primary-500 focus:ring-offset-ocean-800"
                  />
                  <span className="text-ocean-300">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {showCashDealOption && (
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isCashDeal}
                  onChange={(e) => setFormData(prev => ({ ...prev, isCashDeal: e.target.checked }))}
                  className="w-4 h-4 text-primary-600 border-ocean-600 rounded focus:ring-primary-500 focus:ring-offset-ocean-800"
                />
                <span className="text-ocean-300">This is a cash deal (no financing needed)</span>
              </label>
            </div>
          )}

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-ocean-300 mb-1">
              Additional Notes
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="input w-full"
              rows={3}
              placeholder="Any additional information about the lead..."
            />
          </div>

          <div className="mt-6 border-t border-ocean-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Confidence Stake</h3>
              <button
                type="button"
                onClick={() => setShowStakeWarning(!showStakeWarning)}
                className="text-ocean-400 hover:text-white"
              >
                <AlertTriangle className="w-5 h-5" />
              </button>
            </div>

            {showStakeWarning && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                <p className="text-yellow-400 text-sm">
                  Staking tokens shows your confidence in this lead. Higher stakes can attract more attention from agents and lenders, potentially increasing your commission. However, if the deal doesn't close, you'll lose a portion of your staked tokens and your reputation score will be affected.
                </p>
              </div>
            )}

            <div className="bg-ocean-900/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-primary-400" />
                  <span className="text-ocean-300">Available BIRDFI:</span>
                  <span className="text-white font-semibold">
                    {user?.availableTokens || 0}
                  </span>
                </div>
                <div className="text-ocean-300">
                  Reputation Score: <span className="text-primary-400 font-semibold">{user?.reputation || 0}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ocean-300 mb-1">
                    Stake Amount
                  </label>
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(Math.max(0, Math.min(user?.availableTokens || 0, Number(e.target.value))))}
                    className="input w-full"
                    min="0"
                    max={user?.availableTokens || 0}
                    step="1"
                  />
                </div>

                <div className="flex justify-between text-sm text-ocean-400">
                  <span>Min: 0 BIRDFI</span>
                  <span>Max: {user?.availableTokens || 0} BIRDFI</span>
                </div>

                {stakeAmount > 0 && (
                  <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
                    <h4 className="text-primary-400 font-semibold mb-2">Potential Returns</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-ocean-300">Base Commission</span>
                        <span className="text-white">2%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ocean-300">Stake Bonus</span>
                        <span className="text-white">+{(stakeAmount * 0.1).toFixed(1)}%</span>
                      </div>
                      <div className="border-t border-ocean-700 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-ocean-300">Total Commission</span>
                          <span className="text-primary-400 font-semibold">
                            {(2 + stakeAmount * 0.1).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || formData.types.length === 0}
            className={`btn-primary w-full ${
              isSubmitting || formData.types.length === 0
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Lead'}
          </button>
        </form>
      </div>
    </div>
  );
}