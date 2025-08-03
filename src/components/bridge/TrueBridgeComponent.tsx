'use client';

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { trueBridgeService, CrossChainSwapRequest, HTLCEscrow, CrossChainSwapResult } from '@/lib/services/true-bridge-service';
import { Token } from '@/types/bridge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';

interface TrueBridgeComponentProps {
  walletAddress?: string;
  onTransactionComplete?: (result: CrossChainSwapResult) => void;
}

export const TrueBridgeComponent: React.FC<TrueBridgeComponentProps> = ({
  walletAddress,
  onTransactionComplete
}) => {
  const toast = useToast();
  const [fromChain, setFromChain] = useState<'ethereum' | 'bitcoin' | 'solana' | 'starknet' | 'stellar'>('ethereum');
  const [toChain, setToChain] = useState<'ethereum' | 'bitcoin' | 'solana' | 'starknet' | 'stellar'>('bitcoin');
  const [fromToken, setFromToken] = useState<string>('');
  const [toToken, setToToken] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [timelock, setTimelock] = useState<number>(3600); // 1 hour default
  
  const [isLoading, setIsLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [htlcEscrow, setHtlcEscrow] = useState<HTLCEscrow | null>(null);
  const [swapResult, setSwapResult] = useState<CrossChainSwapResult | null>(null);

  // Available chains
  const chains = [
    { value: 'ethereum', label: 'Ethereum', icon: '🔷' },
    { value: 'bitcoin', label: 'Bitcoin', icon: '🟡' },
    { value: 'solana', label: 'Solana', icon: '🟣' },
    { value: 'starknet', label: 'Starknet', icon: '🔴' },
    { value: 'stellar', label: 'Stellar', icon: '⭐' }
  ];

  // Token options for each chain
  const getTokenOptions = (chain: string) => {
    const tokenMap: Record<string, Array<{ value: string; label: string; symbol: string }>> = {
      ethereum: [
        { value: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEeE', label: 'Ethereum (ETH)', symbol: 'ETH' },
        { value: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', label: 'Wrapped ETH (WETH)', symbol: 'WETH' },
        { value: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', label: 'Wrapped Bitcoin (WBTC)', symbol: 'WBTC' },
        { value: '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C', label: 'USD Coin (USDC)', symbol: 'USDC' }
      ],
      bitcoin: [
        { value: 'BTC', label: 'Bitcoin (BTC)', symbol: 'BTC' }
      ],
      solana: [
        { value: 'SOL', label: 'Solana (SOL)', symbol: 'SOL' },
        { value: 'USDC_SOL', label: 'USD Coin (USDC)', symbol: 'USDC' }
      ],
      starknet: [
        { value: 'ETH_STARK', label: 'Ethereum (ETH)', symbol: 'ETH' },
        { value: 'USDC_STARK', label: 'USD Coin (USDC)', symbol: 'USDC' }
      ],
      stellar: [
        { value: 'XLM', label: 'Stellar Lumens (XLM)', symbol: 'XLM' },
        { value: 'USDC_XLM', label: 'USD Coin (USDC)', symbol: 'USDC' }
      ]
    };
    return tokenMap[chain] || [];
  };

  // Get quote for the swap
  const getQuote = async () => {
    if (!walletAddress || !fromToken || !toToken || !amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      const quoteResult = await trueBridgeService.getQuote({
        srcChainId: getChainId(fromChain),
        dstChainId: getChainId(toChain),
        srcTokenAddress: fromToken,
        dstTokenAddress: toToken,
        amount: ethers.parseEther(amount).toString(),
        walletAddress
      });

      setQuote(quoteResult);
      toast.success('Quote received successfully!');
    } catch (err) {
      toast.error(`Failed to get quote: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Create cross-chain swap
  const createSwap = async () => {
    if (!walletAddress || !fromToken || !toToken || !amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      const request: CrossChainSwapRequest = {
        fromChain,
        toChain,
        fromToken,
        toToken,
        amount: ethers.parseEther(amount).toString(),
        walletAddress,
        recipientAddress: recipientAddress || walletAddress,
        timelock
      };

      const result = await trueBridgeService.createCrossChainSwap(request);
      
      setSwapResult(result);
      setHtlcEscrow(result.htlcEscrow);
      toast.success('Cross-chain swap created successfully!');
      
      onTransactionComplete?.(result);
    } catch (err) {
      toast.error(`Failed to create swap: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute HTLC
  const executeHTLC = async () => {
    if (!htlcEscrow) {
      toast.error('No HTLC escrow to execute');
      return;
    }

    setIsLoading(true);

    try {
      const result = await trueBridgeService.executeHTLC(htlcEscrow);
      toast.success(`HTLC executed successfully! Source: ${result.sourceTxHash}, Destination: ${result.destinationTxHash || 'N/A'}`);
    } catch (err) {
      toast.error(`Failed to execute HTLC: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Refund HTLC
  const refundHTLC = async () => {
    if (!htlcEscrow) {
      toast.error('No HTLC escrow to refund');
      return;
    }

    setIsLoading(true);

    try {
      const result = await trueBridgeService.refundHTLC(htlcEscrow);
      toast.success(`HTLC refunded successfully! Source: ${result.sourceTxHash}, Destination: ${result.destinationTxHash || 'N/A'}`);
    } catch (err) {
      toast.error(`Failed to refund HTLC: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Utility function to get chain ID
  const getChainId = (chain: string): number => {
    const chainMap: Record<string, number> = {
      'ethereum': 1,
      'bitcoin': 0,
      'solana': 101,
      'starknet': 100,
      'stellar': 102
    };
    return chainMap[chain] || 1;
  };

  // Update token options when chains change
  useEffect(() => {
    setFromToken('');
    setToToken('');
    setQuote(null);
  }, [fromChain, toChain]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">1inch Fusion+ Cross-Chain Bridge</h2>
        
        {/* Chain Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">From Chain</label>
            <Select
              value={fromChain}
              onChange={(value) => setFromChain(value as any)}
              options={chains}
              placeholder="Select source chain"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">To Chain</label>
            <Select
              value={toChain}
              onChange={(value) => setToChain(value as any)}
              options={chains}
              placeholder="Select destination chain"
            />
          </div>
        </div>

        {/* Token Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">From Token</label>
            <Select
              value={fromToken}
              onChange={setFromToken}
              options={getTokenOptions(fromChain)}
              placeholder="Select source token"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">To Token</label>
            <Select
              value={toToken}
              onChange={setToToken}
              options={getTokenOptions(toChain)}
              placeholder="Select destination token"
            />
          </div>
        </div>

        {/* Amount and Address */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Amount</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              step="0.000001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Recipient Address (Optional)</label>
            <Input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder={walletAddress || "Enter recipient address"}
            />
          </div>
        </div>

        {/* Timelock */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Timelock (seconds)</label>
          <Input
            type="number"
            value={timelock}
            onChange={(e) => setTimelock(parseInt(e.target.value) || 3600)}
            placeholder="3600"
            min="300"
            max="86400"
          />
          <p className="text-sm text-gray-500 mt-1">
            Default: 1 hour (3600 seconds). Min: 5 minutes, Max: 24 hours
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Button
            onClick={getQuote}
            disabled={isLoading || !walletAddress || !fromToken || !toToken || !amount}
            className="flex items-center gap-2"
          >
            {isLoading ? <Spinner size="sm" /> : null}
            Get Quote
          </Button>
          
          <Button
            onClick={createSwap}
            disabled={isLoading || !walletAddress || !fromToken || !toToken || !amount}
            variant="primary"
            className="flex items-center gap-2"
          >
            {isLoading ? <Spinner size="sm" /> : null}
            Create Cross-Chain Swap
          </Button>
        </div>

        {/* Quote Display */}
        {quote && (
          <Card className="p-4 mb-6 bg-blue-50">
            <h3 className="font-semibold mb-2">Quote Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">From Amount:</span> {quote.fromAmount}
              </div>
              <div>
                <span className="font-medium">To Amount:</span> {quote.toAmount}
              </div>
              <div>
                <span className="font-medium">Exchange Rate:</span> {quote.exchangeRate}
              </div>
              <div>
                <span className="font-medium">Network Fee:</span> {quote.networkFee}
              </div>
              <div>
                <span className="font-medium">Protocol Fee:</span> {quote.protocolFee}
              </div>
              <div>
                <span className="font-medium">Total Fee:</span> {quote.totalFee}
              </div>
              <div>
                <span className="font-medium">Estimated Time:</span> {quote.estimatedTime}
              </div>
              <div>
                <span className="font-medium">Price Impact:</span> {quote.priceImpact}%
              </div>
            </div>
          </Card>
        )}

        {/* HTLC Management */}
        {htlcEscrow && (
          <Card className="p-4 mb-6 bg-green-50">
            <h3 className="font-semibold mb-2">HTLC Escrow</h3>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span className="font-medium">Order Hash:</span> {htlcEscrow.orderHash.slice(0, 10)}...
              </div>
              <div>
                <span className="font-medium">Status:</span> {htlcEscrow.status}
              </div>
              <div>
                <span className="font-medium">Source Chain:</span> {htlcEscrow.sourceChain}
              </div>
              <div>
                <span className="font-medium">Destination Chain:</span> {htlcEscrow.destinationChain}
              </div>
              <div>
                <span className="font-medium">Timelock:</span> {new Date(htlcEscrow.timelock * 1000).toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Expires:</span> {new Date(htlcEscrow.expiresAt).toLocaleString()}
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button
                onClick={executeHTLC}
                disabled={isLoading || htlcEscrow.status !== 'pending'}
                variant="success"
                size="sm"
              >
                Execute HTLC
              </Button>
              
              <Button
                onClick={refundHTLC}
                disabled={isLoading || !trueBridgeService.isHTLCExpired(htlcEscrow)}
                variant="warning"
                size="sm"
              >
                Refund HTLC
              </Button>
            </div>
          </Card>
        )}

        {/* Swap Result */}
        {swapResult && (
          <Card className="p-4 mb-6 bg-purple-50">
            <h3 className="font-semibold mb-2">Swap Result</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Source TX:</span> {swapResult.sourceTxHash.slice(0, 10)}...
              </div>
              <div>
                <span className="font-medium">Destination TX:</span> {swapResult.destinationTxHash ? swapResult.destinationTxHash.slice(0, 10) + '...' : 'N/A'}
              </div>
            </div>
          </Card>
        )}

        {/* Toast notifications are handled by the ToastProvider */}
      </Card>
    </div>
  );
}; 