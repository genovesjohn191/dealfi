import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import { Coins, TrendingUp, Lock, Unlock, AlertTriangle, History, ArrowUpDown, Timer } from 'lucide-react';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { StakingHistory, StakingStats } from '../types';

export default function Staking() {
  const user = useAuthStore((state) => state.user);
  const [stakeAmount, setStakeAmount] = useState<number>(0);
  const [unstakeAmount, setUnstakeAmount] = useState<number>(0);
  const [lpStakeAmount, setLpStakeAmount] = useState<number>(0);
  const [selectedPool, setSelectedPool] = useState<'ETH' | 'DAI'>('ETH');
  const [vePIPEAmount, setVePIPEAmount] = useState<number>(0);
  const [lockDuration, setLockDuration] = useState<number>(7); // minimum 7 days
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<StakingHistory[]>([]);
  const [stats, setStats] = useState<StakingStats>({
    pipeBalance: 0,
    pipeStaked: 0,
    vePIPEBalance: 0,
    lpTokens: { ETH: 0, DAI: 0 },
    lpStaked: { ETH: 0, DAI: 0 },
    rewards: { pending: 0, claimed: 0 }
  });

  useEffect(() => {
    if (!user?.uid) return;

    // Subscribe to user's staking data
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (doc) => {
        const data = doc.data();
        if (data?.stakingHistory) {
          setHistory(data.stakingHistory);
        }
        if (data?.stakingStats) {
          setStats(data.stakingStats);
        }
      },
      (error) => {
        console.error('Error fetching staking data:', error);
        setError('Failed to load staking data');
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const handleStake = async () => {
    if (!user?.uid || stakeAmount <= 0) return;
    
    setIsStaking(true);
    setError(null);

    try {
      if (stakeAmount > stats.pipeBalance) {
        throw new Error('Insufficient PIPE tokens available');
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'stakingStats.pipeBalance': stats.pipeBalance - stakeAmount,
        'stakingStats.pipeStaked': stats.pipeStaked + stakeAmount,
        stakingHistory: [
          {
            id: crypto.randomUUID(),
            amount: stakeAmount,
            type: 'stake',
            timestamp: new Date().toISOString(),
            status: 'completed'
          },
          ...(history || [])
        ]
      });

      setStakeAmount(0);
    } catch (err) {
      console.error('Error staking tokens:', err);
      setError(err instanceof Error ? err.message : 'Failed to stake tokens');
    } finally {
      setIsStaking(false);
    }
  };

  const handleLPStake = async () => {
    if (!user?.uid || lpStakeAmount <= 0) return;
    
    setIsStaking(true);
    setError(null);

    try {
      if (lpStakeAmount > stats.lpTokens[selectedPool]) {
        throw new Error(`Insufficient PIPE/${selectedPool} LP tokens`);
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        [`stakingStats.lpTokens.${selectedPool}`]: stats.lpTokens[selectedPool] - lpStakeAmount,
        [`stakingStats.lpStaked.${selectedPool}`]: stats.lpStaked[selectedPool] + lpStakeAmount,
        stakingHistory: [
          {
            id: crypto.randomUUID(),
            amount: lpStakeAmount,
            type: 'lpStake',
            pool: selectedPool,
            timestamp: new Date().toISOString(),
            status: 'completed'
          },
          ...(history || [])
        ]
      });

      setLpStakeAmount(0);
    } catch (err) {
      console.error('Error staking LP tokens:', err);
      setError(err instanceof Error ? err.message : 'Failed to stake LP tokens');
    } finally {
      setIsStaking(false);
    }
  };

  const handleVePIPEStake = async () => {
    if (!user?.uid || vePIPEAmount <= 0 || lockDuration < 7) return;
    
    setIsStaking(true);
    setError(null);

    try {
      if (vePIPEAmount > stats.pipeBalance) {
        throw new Error('Insufficient PIPE tokens available');
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'stakingStats.pipeBalance': stats.pipeBalance - vePIPEAmount,
        'stakingStats.vePIPEBalance': stats.vePIPEBalance + vePIPEAmount,
        stakingHistory: [
          {
            id: crypto.randomUUID(),
            amount: vePIPEAmount,
            type: 'vePIPE',
            lockDuration,
            timestamp: new Date().toISOString(),
            status: 'completed'
          },
          ...(history || [])
        ]
      });

      setVePIPEAmount(0);
    } catch (err) {
      console.error('Error creating vePIPE:', err);
      setError(err instanceof Error ? err.message : 'Failed to create vePIPE');
    } finally {
      setIsStaking(false);
    }
  };

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
                <Coins className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-ocean-300">PIPE Balance</p>
                <p className="text-2xl font-bold text-white">
                  {stats.pipeBalance.toFixed(2)} PIPE
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Lock className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-ocean-300">Total Staked</p>
                <p className="text-2xl font-bold text-white">
                  {(stats.pipeStaked + stats.vePIPEBalance).toFixed(2)} PIPE
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Timer className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-ocean-300">vePIPE Balance</p>
                <p className="text-2xl font-bold text-white">
                  {stats.vePIPEBalance.toFixed(2)} vePIPE
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-ocean-300">Pending Rewards</p>
                <p className="text-2xl font-bold text-white">
                  {stats.rewards.pending.toFixed(2)} PIPE
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Staking Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* PIPE Staking */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Stake PIPE</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ocean-300 mb-1">
                  Amount to Stake
                </label>
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(Math.max(0, Number(e.target.value)))}
                  className="input w-full"
                  min="0"
                  max={stats.pipeBalance}
                  step="0.01"
                />
              </div>

              <div className="flex justify-between text-sm text-ocean-400">
                <span>Available: {stats.pipeBalance.toFixed(2)} PIPE</span>
                <span>APR: 12.5%</span>
              </div>

              <button
                onClick={handleStake}
                disabled={isStaking || stakeAmount <= 0 || stakeAmount > stats.pipeBalance}
                className={`btn-primary w-full flex items-center justify-center gap-2 ${
                  isStaking || stakeAmount <= 0 || stakeAmount > stats.pipeBalance
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                <Lock className="w-4 h-4" />
                {isStaking ? 'Staking...' : 'Stake PIPE'}
              </button>
            </div>
          </div>

          {/* LP Staking */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Stake LP Tokens</h2>
            <div className="space-y-4">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setSelectedPool('ETH')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                    selectedPool === 'ETH'
                      ? 'bg-primary-600 text-white'
                      : 'bg-ocean-800 text-ocean-300 hover:bg-ocean-700'
                  }`}
                >
                  PIPE/ETH
                </button>
                <button
                  onClick={() => setSelectedPool('DAI')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                    selectedPool === 'DAI'
                      ? 'bg-primary-600 text-white'
                      : 'bg-ocean-800 text-ocean-300 hover:bg-ocean-700'
                  }`}
                >
                  PIPE/DAI
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-ocean-300 mb-1">
                  Amount to Stake
                </label>
                <input
                  type="number"
                  value={lpStakeAmount}
                  onChange={(e) => setLpStakeAmount(Math.max(0, Number(e.target.value)))}
                  className="input w-full"
                  min="0"
                  max={stats.lpTokens[selectedPool]}
                  step="0.000001"
                />
              </div>

              <div className="flex justify-between text-sm text-ocean-400">
                <span>Available: {stats.lpTokens[selectedPool].toFixed(6)} LP</span>
                <span>APR: {selectedPool === 'ETH' ? '45.2%' : '38.7%'}</span>
              </div>

              <button
                onClick={handleLPStake}
                disabled={isStaking || lpStakeAmount <= 0 || lpStakeAmount > stats.lpTokens[selectedPool]}
                className={`btn-primary w-full flex items-center justify-center gap-2 ${
                  isStaking || lpStakeAmount <= 0 || lpStakeAmount > stats.lpTokens[selectedPool]
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                <ArrowUpDown className="w-4 h-4" />
                {isStaking ? 'Staking...' : `Stake PIPE/${selectedPool} LP`}
              </button>
            </div>
          </div>

          {/* vePIPE Staking */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Create vePIPE</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ocean-300 mb-1">
                  PIPE Amount
                </label>
                <input
                  type="number"
                  value={vePIPEAmount}
                  onChange={(e) => setVePIPEAmount(Math.max(0, Number(e.target.value)))}
                  className="input w-full"
                  min="0"
                  max={stats.pipeBalance}
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ocean-300 mb-1">
                  Lock Duration (days)
                </label>
                <input
                  type="number"
                  value={lockDuration}
                  onChange={(e) => setLockDuration(Math.max(7, Math.min(365, Number(e.target.value))))}
                  className="input w-full"
                  min="7"
                  max="365"
                  step="1"
                />
              </div>

              <div className="flex justify-between text-sm text-ocean-400">
                <span>Min: 7 days</span>
                <span>Max: 365 days</span>
              </div>

              <div className="bg-ocean-800/50 rounded-lg p-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ocean-300">Voting Power:</span>
                  <span className="text-white font-medium">
                    {((vePIPEAmount * lockDuration) / 365).toFixed(2)} vePIPE
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ocean-300">Boost Multiplier:</span>
                  <span className="text-white font-medium">
                    {(1 + (lockDuration / 365) * 1.5).toFixed(2)}x
                  </span>
                </div>
              </div>

              <button
                onClick={handleVePIPEStake}
                disabled={
                  isStaking || 
                  vePIPEAmount <= 0 || 
                  vePIPEAmount > stats.pipeBalance ||
                  lockDuration < 7
                }
                className={`btn-primary w-full flex items-center justify-center gap-2 ${
                  isStaking || 
                  vePIPEAmount <= 0 || 
                  vePIPEAmount > stats.pipeBalance ||
                  lockDuration < 7
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                <Timer className="w-4 h-4" />
                {isStaking ? 'Creating...' : 'Create vePIPE'}
              </button>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-3">PIPE Staking</h3>
            <ul className="space-y-2 text-sm text-ocean-300">
              <li>• Earn 12.5% APR in PIPE rewards</li>
              <li>• No lock-up period</li>
              <li>• Withdraw anytime</li>
              <li>• Earn platform fees</li>
            </ul>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-3">LP Staking</h3>
            <ul className="space-y-2 text-sm text-ocean-300">
              <li>• PIPE/ETH Pool: 45.2% APR</li>
              <li>• PIPE/DAI Pool: 38.7% APR</li>
              <li>• Earn trading fees</li>
              <li>• Boosted rewards with vePIPE</li>
            </ul>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-3">vePIPE Benefits</h3>
            <ul className="space-y-2 text-sm text-ocean-300">
              <li>• Boost LP rewards up to 2.5x</li>
              <li>• Participate in governance</li>
              <li>• Earn protocol revenue</li>
              <li>• Longer locks = More power</li>
            </ul>
          </div>
        </div>

        {/* Transaction History */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Staking History</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-ocean-700">
                  <th className="pb-3 text-ocean-300 font-medium">Type</th>
                  <th className="pb-3 text-ocean-300 font-medium">Amount</th>
                  <th className="pb-3 text-ocean-300 font-medium">Details</th>
                  <th className="pb-3 text-ocean-300 font-medium">Status</th>
                  <th className="pb-3 text-ocean-300 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-ocean-700/50">
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        {transaction.type === 'stake' && <Lock className="w-4 h-4 text-primary-400" />}
                        {transaction.type === 'unstake' && <Unlock className="w-4 h-4 text-green-400" />}
                        {transaction.type === 'lpStake' && <ArrowUpDown className="w-4 h-4 text-blue-400" />}
                        {transaction.type === 'vePIPE' && <Timer className="w-4 h-4 text-purple-400" />}
                        <span className="text-white capitalize">
                          {transaction.type === 'lpStake' ? 'LP Stake' : 
                           transaction.type === 'lpUnstake' ? 'LP Unstake' :
                           transaction.type === 'vePIPE' ? 'vePIPE Lock' :
                           transaction.type}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="text-white font-medium">
                        {transaction.amount.toFixed(transaction.type.includes('lp') ? 6 : 2)}{' '}
                        {transaction.type.includes('lp') ? 'LP' : 'PIPE'}
                      </span>
                    </td>
                    <td className="py-4 text-ocean-300">
                      {transaction.pool && `PIPE/${transaction.pool} Pool`}
                      {transaction.lockDuration && `${transaction.lockDuration} days lock`}
                    </td>
                    <td className="py-4">
                      <span className={`badge ${
                        transaction.status === 'completed' ? 'badge-green' :
                        transaction.status === 'pending' ? 'badge-yellow' :
                        'badge-red'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="py-4 text-ocean-300">
                      {new Date(transaction.timestamp).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {history.length === 0 && (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-ocean-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  No Staking History
                </h3>
                <p className="text-ocean-300">
                  Start staking to see your transaction history
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}