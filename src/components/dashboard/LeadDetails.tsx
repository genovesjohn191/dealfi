import React, { useState } from 'react';
import { X, MapPin, Phone, Mail, Calendar, FileText, Clock, User, Building2, DollarSign, Tag, MessageSquare, Award, TrendingUp, Coins, CheckCircle } from 'lucide-react';
import { Lead } from '../../types';
import LeadStages from './LeadStages';
import LeadRequestForm from './LeadRequestForm';
import BirddogConversionForm from './BirddogConversionForm';

interface LeadDetailsProps {
  lead: Lead;
  onClose: () => void;
}

export default function LeadDetails({ lead, onClose }: LeadDetailsProps) {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showBirddogConversion, setShowBirddogConversion] = useState(false);

  const getAssignmentStatus = () => {
    if (lead.types.some(type => ['purchase', 'sell'].includes(type))) {
      return {
        role: 'Real Estate Agent',
        status: lead.assignedAgentId ? 'Assigned' : 'Pending Assignment'
      };
    }
    if (lead.types.some(type => ['mortgage', 'hardmoney'].includes(type))) {
      return {
        role: 'Lender',
        status: lead.needsLender ? 'Pending Assignment' : 'Not Required Yet'
      };
    }
    return {
      role: 'N/A',
      status: 'No Assignment Required'
    };
  };

  const assignment = getAssignmentStatus();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Lead Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[80vh] overflow-y-auto">
          {/* Action Buttons */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setShowRequestForm(true)}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Request New Service
            </button>
            {!lead.isBirddog && (
              <button
                onClick={() => setShowBirddogConversion(true)}
                className="btn-secondary flex-1 flex items-center justify-center gap-2"
              >
                <Award className="w-4 h-4" />
                Become a Birddog
              </button>
            )}
          </div>

          {/* Basic Info */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-ocean-700 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-ocean-300" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">
                {lead.firstName} {lead.lastName}
              </h3>
              <p className="text-ocean-300 text-sm">
                Added {new Date(lead.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-ocean-900/50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-primary-400">
                {lead.dealsClosedScore || 0}
              </p>
              <p className="text-sm text-ocean-300">Deals Closed</p>
            </div>
            <div className="bg-ocean-900/50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-primary-400">
                ${lead.totalDealsValue?.toLocaleString() || '0'}
              </p>
              <p className="text-sm text-ocean-300">Total Value</p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary-400" />
              <span className="text-white">{lead.address}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-primary-400" />
              <span className="text-white">{lead.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-primary-400" />
              <span className="text-white">{lead.phone}</span>
            </div>
          </div>

          {/* Lead Types */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-ocean-300 mb-2">Lead Types</h4>
            <div className="flex flex-wrap gap-2">
              {lead.types.map(type => (
                <span
                  key={type}
                  className="px-3 py-1 bg-ocean-900/50 rounded-full text-sm text-primary-400"
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
              ))}
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-ocean-300 mb-2">Notes</h4>
              <p className="text-white bg-ocean-900/50 p-4 rounded-lg">
                {lead.notes}
              </p>
            </div>
          )}

          {/* Progress */}
          <div>
            <h4 className="text-sm font-medium text-ocean-300 mb-2">Progress</h4>
            <LeadStages
              stages={lead.stages}
              onStageComplete={() => {}}
              readOnly={true}
            />
          </div>

          {/* Birddog Stats (if converted) */}
          {lead.isBirddog && (
            <div className="mt-6 bg-ocean-900/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-ocean-300 mb-4">Birddog Performance</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-primary-400">
                    {lead.totalReferrals || 0}
                  </p>
                  <p className="text-sm text-ocean-300">Total Referrals</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary-400">
                    ${lead.totalReferralEarnings?.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-ocean-300">Referral Earnings</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Request Form Modal */}
        {showRequestForm && (
          <LeadRequestForm
            onClose={() => setShowRequestForm(false)}
            existingLead={{
              id: lead.id,
              birddogId: lead.birddogId,
              firstName: lead.firstName,
              lastName: lead.lastName,
              email: lead.email,
              phone: lead.phone
            }}
          />
        )}

        {/* Birddog Conversion Modal */}
        {showBirddogConversion && (
          <BirddogConversionForm
            lead={lead}
            onClose={() => setShowBirddogConversion(false)}
          />
        )}
      </div>
    </div>
  );
}