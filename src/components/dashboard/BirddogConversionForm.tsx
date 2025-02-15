import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Lead } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface BirddogConversionFormProps {
  lead: Lead;
  onClose: () => void;
}

export default function BirddogConversionForm({ lead, onClose }: BirddogConversionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const handleConversion = async () => {
    if (!agreed) {
      setError('Please agree to the terms and conditions');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const leadRef = doc(db, 'leads', lead.id);
      await updateDoc(leadRef, {
        isBirddog: true,
        originalBirddogId: lead.birddogId,
        referralCommissionRate: 1.5, // Default commission rate for converted leads
        totalReferrals: 0,
        totalReferralEarnings: 0
      });

      onClose();
    } catch (err) {
      console.error('Error converting to birddog:', err);
      setError('Failed to complete conversion. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Become a Birddog</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="bg-ocean-900/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">
              Birddog Benefits
            </h3>
            <ul className="space-y-2 text-ocean-300">
              <li>• Earn commissions by referring new leads</li>
              <li>• Build your own referral network</li>
              <li>• Access to exclusive deals and opportunities</li>
              <li>• Automatic tracking of all your referrals</li>
            </ul>
          </div>

          <div className="bg-ocean-900/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">
              Commission Structure
            </h3>
            <p className="text-ocean-300">
              As a converted lead, you'll start with a base commission rate of 1.5% on all successful referrals. This rate can increase based on your performance and the number of successful deals closed.
            </p>
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="agreement"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 text-primary-600 border-ocean-600 rounded focus:ring-primary-500 focus:ring-offset-ocean-800"
            />
            <label htmlFor="agreement" className="text-sm text-ocean-300">
              I understand and agree to the terms and conditions of becoming a birddog, including the commission structure and referral policies.
            </label>
          </div>

          <button
            onClick={handleConversion}
            disabled={isSubmitting || !agreed}
            className={`btn-primary w-full ${
              isSubmitting || !agreed ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Processing...' : 'Become a Birddog'}
          </button>
        </div>
      </div>
    </div>
  );
}