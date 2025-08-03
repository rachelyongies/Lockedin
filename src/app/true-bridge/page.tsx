'use client';

import React, { useState, useEffect } from 'react';
import { TrueBridgeComponent } from '@/components/bridge/TrueBridgeComponent';
import { CrossChainSwapResult } from '@/lib/services/true-bridge-service';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { WalletConnector } from '@/components/ui/WalletConnector';

export default function TrueBridgePage() {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [swapHistory, setSwapHistory] = useState<CrossChainSwapResult[]>([]);

  // Handle wallet connection
  const handleWalletConnect = (address: string) => {
    setWalletAddress(address);
    setIsConnected(true);
  };

  // Handle wallet disconnection
  const handleWalletDisconnect = () => {
    setWalletAddress('');
    setIsConnected(false);
  };

  // Handle transaction completion
  const handleTransactionComplete = (result: CrossChainSwapResult) => {
    setSwapHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 transactions
  };

  return (
    <PageWrapper>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              1inch Fusion+ Cross-Chain Bridge
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Real cross-chain swaps using 1inch Fusion+ protocol with HTLC escrows
            </p>
            
            {/* Wallet Connection */}
            <div className="mb-8">
              {!isConnected ? (
                <div className="space-y-4">
                  <p className="text-gray-600">Connect your wallet to start bridging</p>
                  <WalletConnector />
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-green-600 font-medium">
                    ✅ Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </p>
                  <Button
                    onClick={handleWalletDisconnect}
                    variant="secondary"
                    size="sm"
                  >
                    Disconnect Wallet
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Main Bridge Component */}
          {isConnected ? (
            <TrueBridgeComponent
              walletAddress={walletAddress}
              onTransactionComplete={handleTransactionComplete}
            />
          ) : (
            <Card className="p-8 text-center">
              <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
              <p className="text-gray-600 mb-6">
                To use the cross-chain bridge, you need to connect your wallet first.
              </p>
              <WalletConnector />
            </Card>
          )}

          {/* Swap History */}
          {swapHistory.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Recent Swaps</h2>
              <div className="grid gap-4">
                {swapHistory.map((swap, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Order Hash:</span>
                        <br />
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {swap.htlcEscrow.orderHash.slice(0, 20)}...
                        </code>
                      </div>
                      <div>
                        <span className="font-medium">Route:</span>
                        <br />
                        {swap.htlcEscrow.sourceChain} → {swap.htlcEscrow.destinationChain}
                      </div>
                      <div>
                        <span className="font-medium">Status:</span>
                        <br />
                        <span className={`px-2 py-1 rounded text-xs ${
                          swap.htlcEscrow.status === 'completed' ? 'bg-green-100 text-green-800' :
                          swap.htlcEscrow.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {swap.htlcEscrow.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="font-medium">Source TX:</span>
                        <br />
                        <code className="bg-gray-100 px-2 py-1 rounded">
                          {swap.sourceTxHash.slice(0, 20)}...
                        </code>
                      </div>
                      <div>
                        <span className="font-medium">Destination TX:</span>
                        <br />
                        <code className="bg-gray-100 px-2 py-1 rounded">
                          {swap.destinationTxHash ? swap.destinationTxHash.slice(0, 20) + '...' : 'N/A'}
                        </code>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Features Section */}
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-center mb-8">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="p-6 text-center">
                <div className="text-4xl mb-4">🔐</div>
                <h3 className="text-xl font-semibold mb-2">HTLC Escrows</h3>
                <p className="text-gray-600">
                  Uses Hash Time-Locked Contracts (HTLCs) to ensure atomic cross-chain swaps with cryptographic security.
                </p>
              </Card>
              
              <Card className="p-6 text-center">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-semibold mb-2">1inch Fusion+</h3>
                <p className="text-gray-600">
                  Leverages 1inch's Fusion+ protocol for optimal routing and liquidity across multiple chains.
                </p>
              </Card>
              
              <Card className="p-6 text-center">
                <div className="text-4xl mb-4">🌉</div>
                <h3 className="text-xl font-semibold mb-2">Multi-Chain</h3>
                <p className="text-gray-600">
                  Support for Ethereum, Bitcoin, Solana, Starknet, and Stellar with seamless cross-chain transfers.
                </p>
              </Card>
            </div>
          </div>

          {/* Technical Details */}
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-center mb-8">
              Technical Implementation
            </h2>
            <Card className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Protocol Features</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Real 1inch Fusion+ API integration</li>
                    <li>• HTLC-based atomic swaps</li>
                    <li>• Cross-chain secret hash coordination</li>
                    <li>• Automatic order submission to relayers</li>
                    <li>• Configurable timelocks (5 min - 24 hours)</li>
                    <li>• Support for partial fills and multiple fills</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-4">Security Features</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Cryptographic secret generation</li>
                    <li>• Time-locked escrow contracts</li>
                    <li>• Automatic refund mechanisms</li>
                    <li>• Relayer stake requirements</li>
                    <li>• Multi-signature validation</li>
                    <li>• Cross-chain message verification</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          {/* API Status */}
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-center mb-8">
              API Status
            </h2>
            <Card className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4">1inch Fusion+ API</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Quote Service</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Order Creation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Relayer Submission</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Secret Management</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-4">Supported Chains</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Ethereum (Mainnet)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Bitcoin (Mainnet)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>Solana (Testnet)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>Starknet (Testnet)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>Stellar (Testnet)</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
} 