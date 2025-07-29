'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useWalletStore } from '@/store/useWalletStore';
import { useToast } from '@/components/ui/Toast';
import { htlcBridgeService, initializeHTLCBridge } from '@/lib/services/htlc-bridge-service';
import { BridgeTransaction } from '@/types/bridge';

interface HTLCBridgeFlowProps {
  className?: string;
}

interface HTLCStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'current';
  action?: () => Promise<void>;
}

export const HTLCBridgeFlow: React.FC<HTLCBridgeFlowProps> = ({ className }) => {
  // Wallet state
  const {
    isConnected,
    account,
    connect,
    disconnect,
    status: walletStatus,
    isConnecting
  } = useWalletStore();

  // Toast notifications
  const { addToast } = useToast();

  // Local state
  const [amount, setAmount] = useState('');
  const [bitcoinAddress, setBitcoinAddress] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<BridgeTransaction | null>(null);
  const [htlcId, setHtlcId] = useState('');
  const [preimage, setPreimage] = useState('');

  // HTLC bridge steps
  const [steps, setSteps] = useState<HTLCStep[]>([
    {
      id: 'connect-wallet',
      title: 'Connect Wallet',
      description: 'Connect your Ethereum wallet to start the bridge process',
      status: 'pending'
    },
    {
      id: 'create-htlc',
      title: 'Create HTLC',
      description: 'Create a Hash Time-Locked Contract on Ethereum',
      status: 'pending'
    },
    {
      id: 'send-bitcoin',
      title: 'Send Bitcoin',
      description: 'Send Bitcoin to the specified address with the preimage',
      status: 'pending'
    },
    {
      id: 'redeem-htlc',
      title: 'Redeem HTLC',
      description: 'Redeem the HTLC to receive ETH on Ethereum',
      status: 'pending'
    }
  ]);

  // Initialize HTLC bridge service
  useEffect(() => {
    const contractAddress = process.env.NEXT_PUBLIC_FUSION_BRIDGE_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS;
    if (contractAddress) {
      initializeHTLCBridge(
        process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || process.env.NEXT_PUBLIC_ETH_RPC_URL || '',
        contractAddress,
        process.env.NEXT_PUBLIC_WBTC_CONTRACT_ADDRESS || ''
      );
    }
  }, []);

  // Update steps based on wallet connection
  useEffect(() => {
    if (isConnected) {
      setSteps(prev => prev.map(step => 
        step.id === 'connect-wallet' 
          ? { ...step, status: 'completed' as const }
          : step
      ));
      setCurrentStep(1);
    } else {
      setSteps(prev => prev.map(step => ({ ...step, status: 'pending' as const })));
      setCurrentStep(0);
    }
  }, [isConnected]);

  // Handle wallet connection
  const handleConnectWallet = async () => {
    try {
      setIsProcessing(true);
      await connect('metamask');
      addToast({ type: 'success', message: 'Wallet connected successfully!' });
    } catch (error) {
      addToast({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to connect wallet' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle HTLC creation
  const handleCreateHTLC = async () => {
    if (!isConnected || !account || !htlcBridgeService) {
      addToast({ type: 'error', message: 'Wallet not connected or bridge service not initialized' });
      return;
    }

    if (!amount || !bitcoinAddress) {
      addToast({ type: 'error', message: 'Please enter amount and Bitcoin address' });
      return;
    }

    try {
      setIsProcessing(true);
      setShowModal(true);

      // Get provider and signer
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Execute HTLC creation
      const transaction = await htlcBridgeService.executeBitcoinToEthereum(
        amount,
        bitcoinAddress,
        account.address,
        signer,
        (status) => {
          console.log('HTLC Progress:', status);
          // You could update UI here with progress
        }
      );

      setCurrentTransaction(transaction);
      
      // Extract HTLC parameters
      if (transaction.txIdentifier.htlc) {
        setHtlcId(transaction.txIdentifier.htlc.id);
        if (transaction.txIdentifier.htlc.preimage) {
          setPreimage(transaction.txIdentifier.htlc.preimage);
        }
      }

      // Update steps
      setSteps(prev => prev.map(step => 
        step.id === 'create-htlc' 
          ? { ...step, status: 'completed' as const }
          : step
      ));
      setCurrentStep(2);

      addToast({ type: 'success', message: 'HTLC created successfully!' });
    } catch (error) {
      addToast({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to create HTLC' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle HTLC redemption
  const handleRedeemHTLC = async () => {
    if (!isConnected || !account || !htlcBridgeService || !htlcId || !preimage) {
      addToast({ type: 'error', message: 'Missing required parameters for redemption' });
      return;
    }

    try {
      setIsProcessing(true);

      // Get provider and signer
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Redeem HTLC
      const transaction = await htlcBridgeService.redeemHTLC(
        htlcId,
        preimage,
        signer,
        (status) => {
          console.log('Redemption Progress:', status);
        }
      );

      // Update steps
      setSteps(prev => prev.map(step => 
        step.id === 'redeem-htlc' 
          ? { ...step, status: 'completed' as const }
          : step
      ));

      addToast({ type: 'success', message: 'HTLC redeemed successfully!' });
    } catch (error) {
      addToast({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to redeem HTLC' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle HTLC refund
  const handleRefundHTLC = async () => {
    if (!isConnected || !account || !htlcBridgeService || !htlcId) {
      addToast({ type: 'error', message: 'Missing required parameters for refund' });
      return;
    }

    try {
      setIsProcessing(true);

      // Get provider and signer
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Refund HTLC
      const transaction = await htlcBridgeService.refundHTLC(
        htlcId,
        signer,
        (status) => {
          console.log('Refund Progress:', status);
        }
      );

      addToast({ type: 'success', message: 'HTLC refunded successfully!' });
    } catch (error) {
      addToast({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to refund HTLC' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Get current step
  const getCurrentStep = () => steps[currentStep];

  // Render step content
  const renderStepContent = () => {
    const step = getCurrentStep();

    switch (step.id) {
      case 'connect-wallet':
        return (
          <div className="space-y-4">
            <p className="text-gray-600">
              Connect your Ethereum wallet to start the Bitcoin to Ethereum bridge process.
            </p>
            <Button
              onClick={handleConnectWallet}
              disabled={isProcessing || isConnecting}
              className="w-full"
            >
              {isProcessing || isConnecting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Connecting...
                </>
              ) : (
                'Connect Wallet'
              )}
            </Button>
          </div>
        );

      case 'create-htlc':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (ETH)
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.1"
                min="0"
                step="0.001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bitcoin Address
              </label>
              <Input
                type="text"
                value={bitcoinAddress}
                onChange={(e) => setBitcoinAddress(e.target.value)}
                placeholder="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
              />
            </div>
            <Button
              onClick={handleCreateHTLC}
              disabled={isProcessing || !amount || !bitcoinAddress}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Creating HTLC...
                </>
              ) : (
                'Create HTLC'
              )}
            </Button>
          </div>
        );

      case 'send-bitcoin':
        return (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Bitcoin Transaction Required</h4>
              <p className="text-yellow-700 text-sm mb-3">
                Send exactly {amount} BTC to the address below. Include the preimage in the transaction.
              </p>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-yellow-800">Bitcoin Address:</label>
                  <code className="text-xs bg-yellow-100 px-2 py-1 rounded">{bitcoinAddress}</code>
                </div>
                <div>
                  <label className="block text-xs font-medium text-yellow-800">Preimage (Secret):</label>
                  <code className="text-xs bg-yellow-100 px-2 py-1 rounded break-all">{preimage}</code>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentStep(3)}
                className="flex-1"
              >
                I&apos;ve Sent Bitcoin
              </Button>
              <Button
                onClick={handleRefundHTLC}
                variant="secondary"
                className="flex-1"
              >
                Refund HTLC
              </Button>
            </div>
          </div>
        );

      case 'redeem-htlc':
        return (
          <div className="space-y-4">
            <p className="text-gray-600">
              After sending Bitcoin, redeem the HTLC to receive ETH on Ethereum.
            </p>
            <Button
              onClick={handleRedeemHTLC}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Redeeming HTLC...
                </>
              ) : (
                'Redeem HTLC'
              )}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={className}>
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Bitcoin → Ethereum Bridge (HTLC)</h2>
        
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                    ${step.status === 'completed' ? 'bg-green-500 text-white' : ''}
                    ${step.status === 'current' ? 'bg-blue-500 text-white' : ''}
                    ${step.status === 'pending' ? 'bg-gray-200 text-gray-600' : ''}
                    ${step.status === 'failed' ? 'bg-red-500 text-white' : ''}
                  `}>
                    {step.status === 'completed' ? '✓' : index + 1}
                  </div>
                  <div className="mt-2 text-center">
                    <div className="text-sm font-medium">{step.title}</div>
                    <div className="text-xs text-gray-500 max-w-24">{step.description}</div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`
                    flex-1 h-0.5 mx-4
                    ${step.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'}
                  `} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Current Step Content */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">{getCurrentStep().title}</h3>
          {renderStepContent()}
        </div>

        {/* Wallet Status */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-600">Wallet Status: </span>
              <span className={`text-sm font-medium ${
                isConnected ? 'text-green-600' : 'text-red-600'
              }`}>
                {walletStatus}
              </span>
            </div>
            {isConnected && account && (
              <div className="text-sm text-gray-600">
                {account.address.slice(0, 6)}...{account.address.slice(-4)}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Transaction Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="HTLC Transaction"
      >
        {currentTransaction && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Hash:
              </label>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">
                {currentTransaction.txIdentifier.ethereum}
              </code>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                HTLC ID:
              </label>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">
                {currentTransaction.txIdentifier.htlc?.id}
              </code>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preimage (Keep Secret):
              </label>
              <code className="text-xs bg-red-100 px-2 py-1 rounded break-all">
                {currentTransaction.txIdentifier.htlc?.preimage}
              </code>
            </div>
            <Button
              onClick={() => setShowModal(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}; 