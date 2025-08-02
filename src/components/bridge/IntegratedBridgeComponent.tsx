'use client';
import React, { useState, useEffect } from 'react';
import { 
  integratedBridgeService, 
  CrossChainSwapRequest, 
  IntegratedHTLC, 
  CrossChainSwapResult 
} from '@/lib/services/integrated-bridge-service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { ToastComponent } from '@/components/ui/Toast';

interface IntegratedBridgeComponentProps {
  walletAddress: string;
  onTransactionComplete?: (result: CrossChainSwapResult) => void;
}

export const IntegratedBridgeComponent: React.FC<IntegratedBridgeComponentProps> = ({
  walletAddress,
  onTransactionComplete
}) => {
  // Form state
  const [fromChain, setFromChain] = useState<'ethereum' | 'bitcoin'>('ethereum');
  const [toChain, setToChain] = useState<'ethereum' | 'bitcoin'>('bitcoin');
  const [fromToken, setFromToken] = useState<string>('');
  const [toToken, setToToken] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [timelock, setTimelock] = useState<number>(3600);

  // Bitcoin-specific state
  const [bitcoinPrivateKey, setBitcoinPrivateKey] = useState<string>('');
  const [bitcoinAmount, setBitcoinAmount] = useState<string>('');
  const [destinationAddress, setDestinationAddress] = useState<string>('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [currentHTLC, setCurrentHTLC] = useState<IntegratedHTLC | null>(null);
  const [htlcList, setHtlcList] = useState<IntegratedHTLC[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Get token options based on chain
  const getTokenOptions = (chain: string) => {
    if (chain === 'ethereum') {
      return [
        { value: '0x0000000000000000000000000000000000000000', label: 'ETH' },
        { value: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', label: 'WBTC' },
        { value: '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8', label: 'USDC' }
      ];
    } else if (chain === 'bitcoin') {
      return [
        { value: 'bitcoin', label: 'BTC' }
      ];
    }
    return [];
  };

  // Create cross-chain swap
  const createSwap = async () => {
    if (!fromToken || !toToken || !amount || !walletAddress) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const request: CrossChainSwapRequest = {
        fromChain,
        toChain,
        fromToken,
        toToken,
        amount,
        walletAddress,
        recipientAddress: recipientAddress || walletAddress,
        timelock
      };

      const result = await integratedBridgeService.createCrossChainSwap(request);
      setCurrentHTLC(result.htlc);
      setSuccess(`Cross-chain swap created! HTLC ID: ${result.htlc.id}`);
      
      if (onTransactionComplete) {
        onTransactionComplete(result);
      }

      // Refresh HTLC list
      await loadHTLCs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create swap');
    } finally {
      setIsLoading(false);
    }
  };

  // Fund Bitcoin HTLC
  const fundBitcoinHTLC = async () => {
    if (!currentHTLC || !bitcoinPrivateKey || !bitcoinAmount) {
      setError('Please provide Bitcoin private key and amount');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const amount = parseFloat(bitcoinAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid Bitcoin amount');
      }

      const result = await integratedBridgeService.fundBitcoinHTLC(
        currentHTLC.id,
        amount * 100000000, // Convert to satoshis
        bitcoinPrivateKey,
        10 // fee rate
      );

      setSuccess(`Bitcoin HTLC funded! TXID: ${result.txid}`);
      
      // Update current HTLC
      const updatedHTLC = await integratedBridgeService.monitorHTLC(currentHTLC.id);
      if (updatedHTLC) {
        setCurrentHTLC(updatedHTLC);
      }

      // Refresh HTLC list
      await loadHTLCs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fund Bitcoin HTLC');
    } finally {
      setIsLoading(false);
    }
  };

  // Claim Bitcoin HTLC
  const claimBitcoinHTLC = async () => {
    if (!currentHTLC || !bitcoinPrivateKey || !destinationAddress) {
      setError('Please provide Bitcoin private key and destination address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await integratedBridgeService.claimBitcoinHTLC(
        currentHTLC.id,
        destinationAddress,
        bitcoinPrivateKey,
        10 // fee rate
      );

      setSuccess(`Bitcoin HTLC claimed! TXID: ${result.txid}`);
      
      // Update current HTLC
      const updatedHTLC = await integratedBridgeService.monitorHTLC(currentHTLC.id);
      if (updatedHTLC) {
        setCurrentHTLC(updatedHTLC);
      }

      // Refresh HTLC list
      await loadHTLCs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim Bitcoin HTLC');
    } finally {
      setIsLoading(false);
    }
  };

  // Refund Bitcoin HTLC
  const refundBitcoinHTLC = async () => {
    if (!currentHTLC || !bitcoinPrivateKey || !destinationAddress) {
      setError('Please provide Bitcoin private key and destination address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await integratedBridgeService.refundBitcoinHTLC(
        currentHTLC.id,
        destinationAddress,
        bitcoinPrivateKey,
        10 // fee rate
      );

      setSuccess(`Bitcoin HTLC refunded! TXID: ${result.txid}`);
      
      // Update current HTLC
      const updatedHTLC = await integratedBridgeService.monitorHTLC(currentHTLC.id);
      if (updatedHTLC) {
        setCurrentHTLC(updatedHTLC);
      }

      // Refresh HTLC list
      await loadHTLCs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refund Bitcoin HTLC');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Bitcoin key pair for testing
  const generateBitcoinKeyPair = () => {
    const keyPair = integratedBridgeService.generateBitcoinKeyPair();
    setBitcoinPrivateKey(keyPair.privateKey);
    setDestinationAddress(keyPair.address);
  };

  // Load HTLCs
  const loadHTLCs = async () => {
    try {
      const htlcList = await integratedBridgeService.getAllHTLCs();
      setHtlcList(htlcList);
    } catch (err) {
      console.error('Failed to load HTLCs:', err);
    }
  };

  // Load HTLCs on mount
  useEffect(() => {
    loadHTLCs();
  }, []);

  // Update token options when chains change
  useEffect(() => {
    const fromTokens = getTokenOptions(fromChain);
    const toTokens = getTokenOptions(toChain);
    
    if (fromTokens.length > 0 && !fromTokens.find(t => t.value === fromToken)) {
      setFromToken(fromTokens[0].value);
    }
    if (toTokens.length > 0 && !toTokens.find(t => t.value === toToken)) {
      setToToken(toTokens[0].value);
    }
  }, [fromChain, toChain]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Integrated Cross-Chain Bridge</h2>
        <p className="text-gray-600 mb-6">
          Real Bitcoin HTLCs + 1inch Fusion+ APIs for secure cross-chain swaps
        </p>

        {/* Chain Selection */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">From Chain</label>
            <Select
              value={fromChain}
              onChange={(value) => setFromChain(value as 'ethereum' | 'bitcoin')}
              options={[
                { value: 'ethereum', label: 'Ethereum' },
                { value: 'bitcoin', label: 'Bitcoin' }
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">To Chain</label>
            <Select
              value={toChain}
              onChange={(value) => setToChain(value as 'ethereum' | 'bitcoin')}
              options={[
                { value: 'ethereum', label: 'Ethereum' },
                { value: 'bitcoin', label: 'Bitcoin' }
              ]}
            />
          </div>
        </div>

        {/* Token Selection */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">From Token</label>
            <Select
              value={fromToken}
              onChange={setFromToken}
              options={getTokenOptions(fromChain)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">To Token</label>
            <Select
              value={toToken}
              onChange={setToToken}
              options={getTokenOptions(toChain)}
            />
          </div>
        </div>

        {/* Amount and Address */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Amount</label>
            <Input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Recipient Address (Optional)</label>
            <Input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder={walletAddress}
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
          />
        </div>

        {/* Create Swap Button */}
        <Button
          onClick={createSwap}
          disabled={isLoading || !fromToken || !toToken || !amount}
          className="w-full mb-6"
        >
          {isLoading ? <Spinner /> : 'Create Cross-Chain Swap'}
        </Button>

        {/* Bitcoin Operations */}
        {currentHTLC && (fromChain === 'bitcoin' || toChain === 'bitcoin') && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Bitcoin HTLC Operations</h3>
            
            {/* Generate Bitcoin Key Pair */}
            <div className="mb-4">
              <Button onClick={generateBitcoinKeyPair} variant="outline" className="mb-2">
                Generate Bitcoin Key Pair (Test)
              </Button>
            </div>

            {/* Bitcoin Private Key */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Bitcoin Private Key</label>
              <Input
                type="text"
                value={bitcoinPrivateKey}
                onChange={(e) => setBitcoinPrivateKey(e.target.value)}
                placeholder="Enter Bitcoin private key (hex)"
              />
            </div>

            {/* Bitcoin Amount (for funding) */}
            {currentHTLC.status === 'pending' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Bitcoin Amount (BTC)</label>
                <Input
                  type="text"
                  value={bitcoinAmount}
                  onChange={(e) => setBitcoinAmount(e.target.value)}
                  placeholder="0.001"
                />
                <Button
                  onClick={fundBitcoinHTLC}
                  disabled={isLoading || !bitcoinPrivateKey || !bitcoinAmount}
                  className="w-full mt-2"
                >
                  {isLoading ? <Spinner /> : 'Fund Bitcoin HTLC'}
                </Button>
              </div>
            )}

            {/* Destination Address (for claim/refund) */}
            {(currentHTLC.status === 'funded' || currentHTLC.status === 'pending') && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Destination Address</label>
                <Input
                  type="text"
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder="Enter destination Bitcoin address"
                />
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    onClick={claimBitcoinHTLC}
                    disabled={isLoading || !bitcoinPrivateKey || !destinationAddress}
                  >
                    {isLoading ? <Spinner /> : 'Claim HTLC'}
                  </Button>
                  <Button
                    onClick={refundBitcoinHTLC}
                    disabled={isLoading || !bitcoinPrivateKey || !destinationAddress}
                    variant="outline"
                  >
                    {isLoading ? <Spinner /> : 'Refund HTLC'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Current HTLC Status */}
        {currentHTLC && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Current HTLC Status</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>ID:</strong> {currentHTLC.id.slice(0, 16)}...
                </div>
                <div>
                  <strong>Status:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    currentHTLC.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    currentHTLC.status === 'funded' ? 'bg-blue-100 text-blue-800' :
                    currentHTLC.status === 'claimed' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {currentHTLC.status}
                  </span>
                </div>
                <div>
                  <strong>Bitcoin Address:</strong> {currentHTLC.bitcoinAddress || 'N/A'}
                </div>
                <div>
                  <strong>Fusion Order ID:</strong> {currentHTLC.fusionOrderId || 'N/A'}
                </div>
                <div>
                  <strong>Created:</strong> {new Date(currentHTLC.createdAt).toLocaleString()}
                </div>
                <div>
                  <strong>Expires:</strong> {new Date(currentHTLC.expiresAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HTLC List */}
        {htlcList.length > 0 && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">All HTLCs ({htlcList.length})</h3>
            <div className="space-y-2">
              {htlcList.map((htlc) => (
                <div key={htlc.id} className="bg-gray-50 p-3 rounded-lg text-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <strong>ID:</strong> {htlc.id.slice(0, 16)}...
                    </div>
                    <div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        htlc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        htlc.status === 'funded' ? 'bg-blue-100 text-blue-800' :
                        htlc.status === 'claimed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {htlc.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-gray-600 mt-1">
                    {htlc.bitcoinAddress && `BTC: ${htlc.bitcoinAddress}`}
                    {htlc.fusionOrderId && ` | Fusion: ${htlc.fusionOrderId}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Error and Success Messages */}
      {error && (
        <ToastComponent type="error" onClose={() => setError('')} message={error} />
      )}
      {success && (
        <ToastComponent type="success" onClose={() => setSuccess('')} message={success} />
      )}
    </div>
  );
}; 