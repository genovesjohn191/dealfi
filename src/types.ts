export type UserRole = 'birddog' | 'agent' | 'lender' | 'investor' | 'lead';

export type LeadType = 'mortgage' | 'rental' | 'hardmoney' | 'purchase' | 'sell';

export interface ConfidenceStake {
  amount: number;
  timestamp: string;
  tokenId: string;
  status: 'active' | 'burned' | 'partially_returned';
  returnedAmount?: number;
}

export interface LeadStage {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: {
    id: string;
    name: string;
    role: string;
  };
  fee?: number;
  report?: {
    content: string;
    submittedAt: string;
    submittedBy: {
      id: string;
      name: string;
    };
  };
}

export interface StakingStats {
  pipeBalance: number;
  pipeStaked: number;
  vePIPEBalance: number;
  lpTokens: {
    ETH: number;
    DAI: number;
  };
  lpStaked: {
    ETH: number;
    DAI: number;
  };
  rewards: {
    pending: number;
    claimed: number;
  };
}

export interface StakingHistory {
  id: string;
  amount: number;
  type: 'stake' | 'unstake' | 'lpStake' | 'lpUnstake' | 'vePIPE';
  pool?: 'ETH' | 'DAI';
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  lockDuration?: number; // in days
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role?: UserRole;
  onboarded: boolean;
  referredBy?: string;
  fee?: number;
  earnings?: number;
  photoURL?: string;
  bio?: string;
  phone?: string;
  company?: string;
  website?: string;
  location?: string;
  licenses?: string[];
  specialties?: string[];
  rating?: number;
  totalDeals?: number;
  totalVolume?: number;
  reviews?: Review[];
  socialLinks?: {
    linkedin?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  reputation: number;
  totalStaked: number;
  successfulStakes: number;
  failedStakes: number;
  availableTokens: number;
  lockedTokens: number;
  totalEarnings: number;
  stakingStats?: StakingStats;
  stakingHistory?: StakingHistory[];
}

export interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  dealId?: string;
}

export interface LeadFolder {
  id: string;
  name: string;
  color: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  leadIds: string[];
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  types: LeadType[];
  notes?: string;
  createdAt: string;
  birddogId: string;
  status: 'new' | 'processing' | 'closed';
  assignedAgentId?: string;
  assignedLenderId?: string;
  needsLender?: boolean;
  stages: LeadStage[];
  isCashDeal?: boolean;
  value?: number;
  commission?: number;
  folderId?: string;
  confidenceStake?: ConfidenceStake;
  birddogReputation?: number;
  dealsClosedScore?: number;
  totalDealsValue?: number;
  isBirddog?: boolean;
  totalReferrals?: number;
  totalReferralEarnings?: number;
}

export const getLeadStages = (type: LeadType): Omit<LeadStage, 'completed' | 'completedAt' | 'completedBy'>[] => {
  const commonStages = [
    { id: 'initial_contact', title: 'Initial Contact Made' },
    { id: 'requirements_gathered', title: 'Requirements Gathered' },
  ];

  switch (type) {
    case 'purchase':
      return [
        { id: 'agent_accepted', title: 'Agent Accepted Lead' },
        ...commonStages,
        { id: 'property_search', title: 'Property Search Started' },
        { id: 'showings_scheduled', title: 'Showings Scheduled' },
        { id: 'offer_made', title: 'Offer Made' },
        { id: 'contract_signed', title: 'Contract Signed' },
        { id: 'closing_scheduled', title: 'Closing Scheduled' },
        { id: 'deal_closed', title: 'Deal Closed' }
      ];

    case 'mortgage':
      return [
        { id: 'lender_accepted', title: 'Lender Accepted Lead' },
        { id: 'pre_approval', title: 'Pre-Approval Started' },
        { id: 'documents_collected', title: 'Documents Collected' },
        { id: 'application_submitted', title: 'Application Submitted' },
        { id: 'underwriting', title: 'Underwriting in Progress' },
        { id: 'conditions_cleared', title: 'Conditions Cleared' },
        { id: 'approved', title: 'Loan Approved' }
      ];

    case 'rental':
      return [
        { id: 'agent_accepted', title: 'Agent Accepted Lead' },
        ...commonStages,
        { id: 'property_search', title: 'Property Search Started' },
        { id: 'showings_scheduled', title: 'Showings Scheduled' },
        { id: 'application_submitted', title: 'Application Submitted' },
        { id: 'background_check', title: 'Background Check Completed' },
        { id: 'lease_signed', title: 'Lease Signed' },
        { id: 'move_in_scheduled', title: 'Move-in Scheduled' }
      ];

    case 'hardmoney':
      return [
        { id: 'lender_accepted', title: 'Lender Accepted Lead' },
        { id: 'property_details', title: 'Property Details Collected' },
        { id: 'underwriting', title: 'Underwriting in Progress' },
        { id: 'valuation_completed', title: 'Property Valuation Completed' },
        { id: 'terms_proposed', title: 'Loan Terms Proposed' },
        { id: 'application_submitted', title: 'Application Submitted' },
        { id: 'approved', title: 'Loan Approved' }
      ];

    case 'sell':
      return [
        { id: 'agent_accepted', title: 'Agent Accepted Lead' },
        ...commonStages,
        { id: 'property_evaluation', title: 'Property Evaluation Completed' },
        { id: 'listing_agreement', title: 'Listing Agreement Signed' },
        { id: 'photos_marketing', title: 'Photos and Marketing Ready' },
        { id: 'listed_mls', title: 'Listed on MLS' },
        { id: 'showings_started', title: 'Showings Started' },
        { id: 'offer_received', title: 'Offer Received' },
        { id: 'contract_signed', title: 'Contract Signed' },
        { id: 'closing_scheduled', title: 'Closing Scheduled' },
        { id: 'deal_closed', title: 'Deal Closed' }
      ];
  }
};