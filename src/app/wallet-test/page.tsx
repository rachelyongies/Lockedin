'use client';

import React from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { WalletConnector } from '@/components/ui/WalletConnector/WalletConnector';
import { useWalletStore } from '@/store/useWalletStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function WalletTestPage() {
  const {
    isConnected,
    account,
    walletType,
    network,
    status,
    isConnecting
  } = useWalletStore();

  return (
    <PageWrapper
      title="Wallet Connection Test"
      description="Test wallet connections for MetaMask and Phantom"
    >
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Wallet Connection Test</h1>
          <p className="text-gray-600">
            Test connecting to different wallets including MetaMask (Ethereum) and Phantom (Solana)
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Wallet Connector */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Connect Wallet</h2>
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Gradient Variant</h3>
                  <WalletConnector 
                    variant="gradient"
                    size="lg"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Primary Variant</h3>
                  <WalletConnector 
                    variant="primary"
                    size="lg"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Outline Variant</h3>
                  <WalletConnector 
                    variant="outline"
                    size="lg"
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                <p>• Click to open wallet selection modal</p>
                <p>• Supports MetaMask, Phantom, WalletConnect, and Coinbase</p>
                <p>• Automatically detects installed wallets</p>
                <p>• Beautiful animations and hover effects</p>
              </div>
            </div>
          </Card>

          {/* Connection Status */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">Status:</span>
                <span className={`px-2 py-1 rounded text-sm ${
                  isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {status}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium">Wallet Type:</span>
                <span className="text-sm text-gray-600">
                  {walletType || 'Not connected'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium">Network:</span>
                <span className="text-sm text-gray-600">
                  {network?.name || 'Not connected'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium">Address:</span>
                <span className="text-sm text-gray-600 font-mono">
                  {account?.address ? 
                    `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : 
                    'Not connected'
                  }
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium">Chain ID:</span>
                <span className="text-sm text-gray-600">
                  {network?.chainId || 'Not connected'}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-8 p-6">
          <h2 className="text-xl font-semibold mb-4">How to Test</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2 text-blue-600">MetaMask (Ethereum)</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Install MetaMask browser extension</li>
                <li>Create or import a wallet</li>
                <li>Click &quot;Connect Wallet&quot; button</li>
                <li>Select MetaMask from the modal</li>
                <li>Approve the connection in MetaMask</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2 text-purple-600">Phantom (Solana)</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Install Phantom browser extension</li>
                <li>Create or import a wallet</li>
                <li>Click &quot;Connect Wallet&quot; button</li>
                <li>Select Phantom from the modal</li>
                <li>Approve the connection in Phantom</li>
              </ol>
            </div>
          </div>
        </Card>

        {/* Features */}
        <Card className="mt-8 p-6">
          <h2 className="text-xl font-semibold mb-4">Features</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold">Multi-Chain</h3>
              <p className="text-sm text-gray-600">Support for Ethereum and Solana</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold">Auto-Detection</h3>
              <p className="text-sm text-gray-600">Automatically detects installed wallets</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-semibold">Secure</h3>
              <p className="text-sm text-gray-600">Uses standard wallet connection protocols</p>
            </div>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
} 