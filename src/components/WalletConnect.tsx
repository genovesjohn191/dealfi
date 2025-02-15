import React from 'react';
import { useWeb3Store } from '../store';
import { Wallet } from 'lucide-react';

export default function WalletConnect() {
  const { address, balance, isConnected, isConnecting, error, connect, disconnect } = useWeb3Store();

  return (
    <div className="flex items-center gap-4">
      {isConnected ? (
        <div className="flex items-center gap-4">
          <div className="bg-ocean-800 rounded-lg px-4 py-2">
            <p className="text-sm text-ocean-300">Balance</p>
            <p className="text-lg font-semibold text-white">
              {parseFloat(balance || '0').toFixed(4)} ETH
            </p>
          </div>
          <div className="bg-ocean-800 rounded-lg px-4 py-2">
            <p className="text-sm text-ocean-300">Address</p>
            <p className="text-sm font-mono text-white">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
          <button
            onClick={disconnect}
            className="btn-secondary"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <button
            onClick={connect}
            disabled={isConnecting}
            className="btn-primary flex items-center gap-2"
          >
            <Wallet className="w-5 h-5" />
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 px-3 py-1 rounded">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}