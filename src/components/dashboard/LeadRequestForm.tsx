import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { LeadType, getLeadStages } from '../../types';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface LeadRequestFormProps {
  onClose: () => void;
  existingLead: {
    id: string;
    birddogId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

const leadTypes: { value: LeadType; label: string; description: string }[] = [
  { 
    value: 'mortgage', 
    label: 'Mortgage',
    description: 'Get financing for your property purchase'
  },
  { 
    value: 'rental', 
    label: 'Rental Property',
    description: 'Find a property to rent or lease'
  },
  { 
    value: 'hardmoney', 
    label: 'Hard Money Loan',
    description: 'Short-term financing for real estate investments'
  },
  { 
    value: 'purchase', 
    label: 'Purchase Home',
    description: 'Buy a residential property'
  },
  { 
    value: 'sell', 
    label: 'Sell Home',
    description: 'List and sell your property'
  },
];

export default function LeadRequestForm({ onClose, existingLead }: LeadRequestFormProps) {
  const [formData, setFormData] = useState({
    address: '',
    types: [] as LeadType[],
    notes: '',
    isCashDeal: false,
    urgency: 'normal' as 'high' | 'normal' | 'low',
    budget: '',
    preferredContactMethod: 'email' as 'email' | 'phone' | 'both'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.types.length === 0) {
      setError('Please select at least one service type');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
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

      const needsLender = formData.types.includes('purchase') && !formData.isCashDeal;

      const leadData = {
        ...formData,
        firstName: existingLead.firstName,
        lastName: existingLead.lastName,
        email: existingLead.email,
        phone: existingLead.phone,
        birddogId: existingLead.birddogId,
        createdAt: new Date().toISOString(),
        status: 'new',
        stages: uniqueStages,
        needsLender,
        originalRequest: existingLead.id,
        budget: formData.budget ? parseFloat(formData.budget) : null
      };

      const leadsRef = collection(db, 'leads');
      await addDoc(leadsRef, leadData);
      onClose();
    } catch (err) {
      console.error('Error submitting request:', err);
      setError('Failed to submit request. Please try again.');
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-xl">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">New Service Request</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-red-500 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-lg font-medium text-white mb-4">
              What services do you need?
            </label>
            <div className="grid grid-cols-1 gap-3">
              {leadTypes.map(type => (
                <label
                  key={type.value}
                  className={`flex items-start p-4 rounded-lg cursor-pointer transition-all ${
                    formData.types.includes(type.value)
                      ? 'bg-primary-500/20 ring-2 ring-primary-500'
                      : 'bg-ocean-900/50 hover:bg-ocean-900/70'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.types.includes(type.value)}
                    onChange={() => handleTypeToggle(type.value)}
                    className="mt-1 w-4 h-4 text-primary-600 border-ocean-600 rounded focus:ring-primary-500 focus:ring-offset-ocean-800"
                  />
                  <div className="ml-3">
                    <span className="block text-white font-medium">{type.label}</span>
                    <span className="block text-sm text-ocean-300 mt-1">{type.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-ocean-300 mb-1">
              Property Address
            </label>
            <input
              type="text"
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="input w-full"
              required
              placeholder="Enter property address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-ocean-300 mb-1">
                Budget
              </label>
              <input
                type="number"
                id="budget"
                value={formData.budget}
                onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                className="input w-full"
                placeholder="Enter your budget"
              />
            </div>

            <div>
              <label htmlFor="urgency" className="block text-sm font-medium text-ocean-300 mb-1">
                Urgency Level
              </label>
              <select
                id="urgency"
                value={formData.urgency}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  urgency: e.target.value as 'high' | 'normal' | 'low'
                }))}
                className="input w-full"
              >
                <option value="high">High - Need ASAP</option>
                <option value="normal">Normal - Within a month</option>
                <option value="low">Low - No rush</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="preferredContact" className="block text-sm font-medium text-ocean-300 mb-1">
              Preferred Contact Method
            </label>
            <select
              id="preferredContact"
              value={formData.preferredContactMethod}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                preferredContactMethod: e.target.value as 'email' | 'phone' | 'both'
              }))}
              className="input w-full"
            >
              <option value="email">Email Only</option>
              <option value="phone">Phone Only</option>
              <option value="both">Both Email and Phone</option>
            </select>
          </div>

          {formData.types.includes('purchase') && (
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
              placeholder="Any specific requirements or details..."
            />
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
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
}