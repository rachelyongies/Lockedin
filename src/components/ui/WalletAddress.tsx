'use client';

import { useState } from 'react';

interface WalletAddressProps {
  address: string;
  network?: 'eth' | 'btc' | 'sol';
  isTestnet?: boolean;
  showCopy?: boolean;
  showExplorer?: boolean;
  className?: string;
  length?: number;
  onCopy?: () => void;
}

export function WalletAddress({ 
  address, 
  network = 'eth',
  isTestnet = false,
  showCopy = true,
  showExplorer = true,
  className = '',
  length = 8,
  onCopy
}: WalletAddressProps) {
  const [copyFeedback, setCopyFeedback] = useState(false);

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    if (addr.length <= length * 2) return addr;
    return `${addr.slice(0, length)}...${addr.slice(-length)}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
      onCopy?.();
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const getExplorerUrl = () => {
    switch (network) {
      case 'eth':
        if (isTestnet) {
          return `https://goerli.etherscan.io/address/${address}`;
        }
        return `https://etherscan.io/address/${address}`;
      case 'btc':
        if (isTestnet) {
          return `https://blockstream.info/testnet/address/${address}`;
        }
        return `https://blockstream.info/address/${address}`;
      case 'sol':
        if (isTestnet) {
          return `https://solscan.io/account/${address}?cluster=devnet`;
        }
        return `https://solscan.io/account/${address}`;
      default:
        return '';
    }
  };

  const getNetworkIcon = () => {
    switch (network) {
      case 'eth': return 'Ξ';
      case 'btc': return '₿';
      case 'sol': return '◎';
      default: return '⚪';
    }
  };

  const explorerUrl = getExplorerUrl();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {getNetworkIcon()}
        </span>
        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
          {formatAddress(address)}
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        {showCopy && (
          <button
            onClick={copyToClipboard}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title="Copy address"
            aria-label="Copy address to clipboard"
          >
            {copyFeedback ? (
              <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        )}
        
        {showExplorer && explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title="View in explorer"
            aria-label="View address in blockchain explorer"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}