'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { ALL_TOKENS, ETHEREUM_TOKENS, SOLANA_TOKENS } from '@/config/tokens';
import { initializeHTLC1inchService } from '@/lib/services/htlc-1inch-service';
import { fusionAPI } from '@/lib/services/1inch-fusion';

interface HTLCState {
  id: string;
  status: 'pending' | 'executed' | 'refunded' | 'expired';
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  timelock: number;
  secret?: string;
  secretHash?: string;
  orderId?: string;
}

export default function HTLC1inchFlow() {
  const [isLoading, setIsLoading] = useState(false);
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('WBTC');
  const [amount, setAmount] = useState('');
  const [resolverAddress, setResolverAddress] = useState('');
  const [htlcService, setHtlcService] = useState<any>(null);
  const [htlcStates, setHtlcStates] = useState<HTLCState[]>([]);
  const [selectedHTLC, setSelectedHTLC] = useState<HTLCState | null>(null);
  const [secret, setSecret] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const { addToast } = useToast();

  // Initialize HTLC service
  useEffect(() => {
    const initializeService = async () => {
      try {
        // In production, these would come from environment variables
        const ethereumRpcUrl = process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo';
        const htlcContractAddress = process.env.NEXT_PUBLIC_HTLC_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
        
        const service = initializeHTLC1inchService(ethereumRpcUrl, htlcContractAddress);
        await service.initialize();
        setHtlcService(service);
        
        addToast({
          message: '✅ HTLC 1inch service initialized',
          type: 'success'
        });
      } catch (error) {
        console.error('Failed to initialize HTLC service:', error);
        addToast({
          message: '❌ Failed to initialize HTLC service',
          type: 'error'
        });
      }
    };

    initializeService();
  }, [addToast]);

  // Get quote for swap
  const getQuote = async () => {
    if (!htlcService || !amount || !resolverAddress) {
      addToast({
        message: '❌ Please fill in all required fields',
        type: 'error'
      });
      return;
    }

    setIsLoading(true);
    try {
      const fromTokenData = ALL_TOKENS.find(t => t.symbol === fromToken);
      const toTokenData = ALL_TOKENS.find(t => t.symbol === toToken);

      if (!fromTokenData || !toTokenData) {
        throw new Error('Invalid token selection');
      }

      const quote = await htlcService.getQuote(
        fromTokenData,
        toTokenData,
        amount,
        resolverAddress
      );

      addToast({
        message: `💰 Quote received: ${quote.toAmount} ${toToken} for ${amount} ${fromToken}`,
        type: 'success'
      });

      console.log('Quote:', quote);
    } catch (error) {
      console.error('Quote error:', error);
      addToast({
        message: `❌ Failed to get quote: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create HTLC swap
  const createHTLCSwap = async () => {
    if (!htlcService || !amount || !resolverAddress) {
      addToast({
        message: '❌ Please fill in all required fields',
        type: 'error'
      });
      return;
    }

    setIsLoading(true);
    try {
      const fromTokenData = ALL_TOKENS.find(t => t.symbol === fromToken);
      const toTokenData = ALL_TOKENS.find(t => t.symbol === toToken);

      if (!fromTokenData || !toTokenData) {
        throw new Error('Invalid token selection');
      }

      // Get quote first
      const quote = await htlcService.getQuote(
        fromTokenData,
        toTokenData,
        amount,
        resolverAddress
      );

      // Get signer (in production, this would come from wallet connection)
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      const transaction = await htlcService.createHTLCSwap(
        fromTokenData,
        toTokenData,
        amount,
        resolverAddress,
        quote.toAmount,
        signer,
        (status: string) => {
          addToast({
            message: `🔄 ${status}`,
            type: 'info'
          });
        }
      );

      // Add to HTLC states
      const newHTLC: HTLCState = {
        id: transaction.htlcId,
        status: 'pending',
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: quote.toAmount,
        timelock: transaction.timelock,
        secret: transaction.secret,
        secretHash: transaction.secretHash,
        orderId: transaction.orderId
      };

      setHtlcStates(prev => [...prev, newHTLC]);
      setSelectedHTLC(newHTLC);

      addToast({
        message: `✅ HTLC swap created! ID: ${transaction.htlcId}`,
        type: 'success'
      });

      console.log('HTLC Transaction:', transaction);
    } catch (error) {
      console.error('HTLC creation error:', error);
      addToast({
        message: `❌ Failed to create HTLC: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Execute HTLC
  const executeHTLC = async () => {
    if (!htlcService || !selectedHTLC || !secret) {
      addToast({
        message: '❌ Please select an HTLC and provide the secret',
        type: 'error'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get signer
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      const transaction = await htlcService.executeHTLC(
        selectedHTLC.id,
        secret,
        signer,
        (status: string) => {
          addToast({
            message: `🔄 ${status}`,
            type: 'info'
          });
        }
      );

      // Update HTLC state
      setHtlcStates(prev => prev.map(htlc => 
        htlc.id === selectedHTLC.id 
          ? { ...htlc, status: 'executed' }
          : htlc
      ));

      addToast({
        message: `✅ HTLC executed successfully!`,
        type: 'success'
      });

      console.log('Execution Transaction:', transaction);
    } catch (error) {
      console.error('HTLC execution error:', error);
      addToast({
        message: `❌ Failed to execute HTLC: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Execute HTLC with swap
  const executeHTLCWithSwap = async () => {
    if (!htlcService || !selectedHTLC || !secret || !actualAmount) {
      addToast({
        message: '❌ Please select an HTLC, provide the secret, and actual amount',
        type: 'error'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get signer
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      const transaction = await htlcService.executeHTLCWithSwap(
        selectedHTLC.id,
        secret,
        actualAmount,
        signer,
        (status: string) => {
          addToast({
            message: `🔄 ${status}`,
            type: 'info'
          });
        }
      );

      // Update HTLC state
      setHtlcStates(prev => prev.map(htlc => 
        htlc.id === selectedHTLC.id 
          ? { ...htlc, status: 'executed' }
          : htlc
      ));

      addToast({
        message: `✅ HTLC executed with swap successfully!`,
        type: 'success'
      });

      console.log('Swap Execution Transaction:', transaction);
    } catch (error) {
      console.error('HTLC swap execution error:', error);
      addToast({
        message: `❌ Failed to execute HTLC with swap: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Refund HTLC
  const refundHTLC = async () => {
    if (!htlcService || !selectedHTLC) {
      addToast({
        message: '❌ Please select an HTLC to refund',
        type: 'error'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get signer
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      const transaction = await htlcService.refundHTLC(
        selectedHTLC.id,
        signer,
        (status: string) => {
          addToast({
            message: `🔄 ${status}`,
            type: 'info'
          });
        }
      );

      // Update HTLC state
      setHtlcStates(prev => prev.map(htlc => 
        htlc.id === selectedHTLC.id 
          ? { ...htlc, status: 'refunded' }
          : htlc
      ));

      addToast({
        message: `✅ HTLC refunded successfully!`,
        type: 'success'
      });

      console.log('Refund Transaction:', transaction);
    } catch (error) {
      console.error('HTLC refund error:', error);
      addToast({
        message: `❌ Failed to refund HTLC: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get token options for dropdown
  const getTokenOptions = () => {
    return ALL_TOKENS.map(token => ({
      value: token.symbol,
      label: `${token.symbol} - ${token.name}`,
      icon: token.logoUrl,
      disabled: false
    }));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">HTLC 1inch Integration</h1>
        <p className="text-gray-300">
          Secure cross-chain swaps using Hash Time-Locked Contracts with 1inch Fusion API
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create HTLC Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Create HTLC Swap</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  From Token
                </label>
                <Select
                  value={fromToken}
                  onValueChange={(value: string | string[]) => {
                    if (typeof value === 'string') setFromToken(value);
                  }}
                  options={getTokenOptions()}
                  placeholder="Select from token..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  To Token
                </label>
                <Select
                  value={toToken}
                  onValueChange={(value: string | string[]) => {
                    if (typeof value === 'string') setToToken(value);
                  }}
                  options={getTokenOptions()}
                  placeholder="Select to token..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount
                </label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Resolver Address
                </label>
                <Input
                  type="text"
                  value={resolverAddress}
                  onChange={(e) => setResolverAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={getQuote}
                  disabled={isLoading || !htlcService}
                  className="flex-1"
                >
                  {isLoading ? <Spinner size="sm" /> : 'Get Quote'}
                </Button>

                <Button
                  variant="primary"
                  onClick={createHTLCSwap}
                  disabled={isLoading || !htlcService}
                  className="flex-1"
                >
                  {isLoading ? <Spinner size="sm" /> : 'Create HTLC'}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Execute HTLC Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Execute HTLC</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Secret (Preimage)
                </label>
                <Input
                  type="text"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Enter secret..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Actual Amount (for swap execution)
                </label>
                <Input
                  type="number"
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                  placeholder="Enter actual amount received..."
                  className="w-full"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={executeHTLC}
                  disabled={isLoading || !selectedHTLC || !secret}
                  className="flex-1"
                >
                  {isLoading ? <Spinner size="sm" /> : 'Execute HTLC'}
                </Button>

                <Button
                  variant="secondary"
                  onClick={executeHTLCWithSwap}
                  disabled={isLoading || !selectedHTLC || !secret || !actualAmount}
                  className="flex-1"
                >
                  {isLoading ? <Spinner size="sm" /> : 'Execute with Swap'}
                </Button>

                <Button
                  variant="outline"
                  onClick={refundHTLC}
                  disabled={isLoading || !selectedHTLC}
                  className="flex-1"
                >
                  {isLoading ? <Spinner size="sm" /> : 'Refund HTLC'}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* HTLC States */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">HTLC States</h2>
          
          {htlcStates.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No HTLCs created yet</p>
          ) : (
            <div className="space-y-4">
              {htlcStates.map((htlc) => (
                <div
                  key={htlc.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedHTLC?.id === htlc.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedHTLC(htlc)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-white">
                        HTLC {htlc.id.slice(0, 8)}...
                      </h3>
                      <p className="text-sm text-gray-400">
                        {htlc.fromAmount} {htlc.fromToken} → {htlc.toAmount} {htlc.toToken}
                      </p>
                      <p className="text-xs text-gray-500">
                        Timelock: {new Date(htlc.timelock * 1000).toLocaleString()}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      htlc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      htlc.status === 'executed' ? 'bg-green-100 text-green-800' :
                      htlc.status === 'refunded' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {htlc.status.toUpperCase()}
                    </div>
                  </div>
                  
                  {selectedHTLC?.id === htlc.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-gray-700"
                    >
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Secret Hash:</span>
                          <p className="font-mono text-xs break-all">{htlc.secretHash}</p>
                        </div>
                        {htlc.secret && (
                          <div>
                            <span className="text-gray-400">Secret:</span>
                            <p className="font-mono text-xs break-all">{htlc.secret}</p>
                          </div>
                        )}
                        {htlc.orderId && (
                          <div className="col-span-2">
                            <span className="text-gray-400">1inch Order ID:</span>
                            <p className="font-mono text-xs break-all">{htlc.orderId}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
} 