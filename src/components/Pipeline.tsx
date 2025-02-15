import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, TrendingUp, DollarSign, UserPlus, Mail, Clock, Check, X } from 'lucide-react';

interface ReferralNode {
  id: string;
  displayName: string;
  email: string;
  level: number;
  totalEarnings: number;
  referralCount: number;
  children?: ReferralNode[];
}

interface PipelineStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingCommissions: number;
}

interface ReferralInvite {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  type: string;
  status: string;
  createdAt: string;
}

export default function Pipeline() {
  const [network, setNetwork] = useState<ReferralNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PipelineStats>({
    totalReferrals: 0,
    activeReferrals: 0,
    totalEarnings: 0,
    pendingCommissions: 0
  });
  const [invites, setInvites] = useState<ReferralInvite[]>([]);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchPipelineData = async () => {
      try {
        // Fetch referral invites
        const invitesQuery = query(
          collection(db, 'referral_relationships'),
          where('referrerId', '==', user.uid)
        );
        const invitesSnapshot = await getDocs(invitesQuery);
        const invitesList = invitesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ReferralInvite));
        setInvites(invitesList);

        // Function to recursively fetch referral network
        const fetchReferralNetwork = async (userId: string, level: number = 1, maxLevel: number = 7): Promise<ReferralNode | null> => {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (!userDoc.exists()) return null;

          const userData = userDoc.data();

          // Get direct referrals
          const referralsQuery = query(
            collection(db, 'referral_relationships'),
            where('referrerId', '==', userId)
          );
          const referralsSnapshot = await getDocs(referralsQuery);

          const children: ReferralNode[] = [];
          if (level < maxLevel) {
            for (const referralDoc of referralsSnapshot.docs) {
              const referralData = referralDoc.data();
              const childNode = await fetchReferralNetwork(referralData.referredId, level + 1);
              if (childNode) children.push(childNode);
            }
          }

          return {
            id: userId,
            displayName: userData.displayName || 'Unknown User',
            email: userData.email || '',
            level,
            totalEarnings: userData.totalEarnings || 0,
            referralCount: referralsSnapshot.size,
            ...(children.length > 0 && { children })
          };
        };

        // Fetch network data
        const networkData = await fetchReferralNetwork(user.uid);
        setNetwork(networkData);

        // Fetch statistics
        const statsQuery = query(
          collection(db, 'revenue_shares'),
          where('referrerId', '==', user.uid)
        );
        const statsSnapshot = await getDocs(statsQuery);

        const calculatedStats = statsSnapshot.docs.reduce((acc, doc) => {
          const data = doc.data();
          return {
            totalReferrals: acc.totalReferrals + 1,
            activeReferrals: acc.activeReferrals + (data.status === 'active' ? 1 : 0),
            totalEarnings: acc.totalEarnings + (data.status === 'paid' ? data.amount : 0),
            pendingCommissions: acc.pendingCommissions + (data.status === 'pending' ? data.amount : 0)
          };
        }, {
          totalReferrals: 0,
          activeReferrals: 0,
          totalEarnings: 0,
          pendingCommissions: 0
        });

        setStats(calculatedStats);
      } catch (err) {
        console.error('Error fetching pipeline data:', err);
        setError('Failed to load pipeline data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPipelineData();
  }, [user?.uid]);

  const renderNode = (node: ReferralNode) => {
    return (
      <div 
        key={node.id}
        className={`relative p-4 rounded-lg border ${
          node.level === 1 ? 'border-primary-500 bg-primary-500/10' :
          node.level <= 3 ? 'border-ocean-500 bg-ocean-500/10' :
          'border-ocean-700 bg-ocean-700/10'
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-medium text-white">{node.displayName}</h4>
            <p className="text-sm text-ocean-300">{node.email}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            node.level === 1 ? 'bg-primary-500/20 text-primary-300' :
            'bg-ocean-500/20 text-ocean-300'
          }`}>
            Level {node.level}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1 text-ocean-300">
            <Users className="w-4 h-4" />
            <span>{node.referralCount} referrals</span>
          </div>
          <div className="flex items-center gap-1 text-ocean-300">
            <DollarSign className="w-4 h-4" />
            <span>${node.totalEarnings.toLocaleString()}</span>
          </div>
        </div>

        {node.children && node.children.length > 0 && (
          <div className="mt-4 pl-6 space-y-4">
            {node.children.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-ocean-800 rounded-lg"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-48 bg-ocean-800 rounded-lg"></div>
              <div className="h-48 bg-ocean-800 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-red-400">
            {error}
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-500/20 rounded-lg">
                <Users className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-ocean-300">Total Referrals</p>
                <p className="text-2xl font-bold text-white">
                  {stats.totalReferrals}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <UserPlus className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-ocean-300">Active Referrals</p>
                <p className="text-2xl font-bold text-white">
                  {stats.activeReferrals}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-ocean-300">Total Earnings</p>
                <p className="text-2xl font-bold text-white">
                  ${stats.totalEarnings.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-ocean-300">Pending Commissions</p>
                <p className="text-2xl font-bold text-white">
                  ${stats.pendingCommissions.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Invites */}
        <div className="card p-6 mb-8">
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

        {/* Network Visualization */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Your Pipeline Network</h2>
          
          <div className="space-y-6">
            {network ? (
              renderNode(network)
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-ocean-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  No Referrals Yet
                </h3>
                <p className="text-ocean-300">
                  Start growing your network by referring other users to the platform
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}