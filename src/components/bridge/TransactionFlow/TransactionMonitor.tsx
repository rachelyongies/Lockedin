import React, { useEffect, useState } from 'react';
import { useWalletStore } from '@/store/useWalletStore';
import { ethers } from 'ethers';

interface TransactionMonitorProps {
  htlcId: string | null;
}

const BitcoinBridgeABI = [
  "event Initiated(bytes32 indexed id, address indexed initiator, address indexed resolver, uint256 amount)",
  "event Redeemed(bytes32 indexed id, bytes32 preimage)",
  "event Refunded(bytes32 indexed id)"
];

// Replace with your deployed contract address
const BITCOIN_BRIDGE_CONTRACT_ADDRESS = "0xYourDeployedContractAddressHere";

export function TransactionMonitor({ htlcId }: TransactionMonitorProps) {
  const { provider } = useWalletStore();
  const [status, setStatus] = useState<'pending' | 'redeemed' | 'refunded' | 'idle'>('idle');
  const [transactionDetails, setTransactionDetails] = useState<any>(null);

  useEffect(() => {
    if (!htlcId || !provider) {
      setStatus('idle');
      setTransactionDetails(null);
      return;
    }

    setStatus('pending');
    const contract = new ethers.Contract(BITCOIN_BRIDGE_CONTRACT_ADDRESS, BitcoinBridgeABI, provider);

    const handleInitiated = (id: string, initiator: string, resolver: string, amount: bigint) => {
      if (id === htlcId) {
        setTransactionDetails({
          id,
          initiator,
          resolver,
          amount: ethers.formatEther(amount),
          type: 'Initiated',
        });
        console.log('Initiated Event:', { id, initiator, resolver, amount: ethers.formatEther(amount) });
      }
    };

    const handleRedeemed = (id: string, preimage: string) => {
      if (id === htlcId) {
        setStatus('redeemed');
        setTransactionDetails((prev: any) => ({ ...prev, type: 'Redeemed', preimage }));
        console.log('Redeemed Event:', { id, preimage });
      }
    };

    const handleRefunded = (id: string) => {
      if (id === htlcId) {
        setStatus('refunded');
        setTransactionDetails((prev: any) => ({ ...prev, type: 'Refunded' }));
        console.log('Refunded Event:', { id });
      }
    };

    contract.on('Initiated', handleInitiated);
    contract.on('Redeemed', handleRedeemed);
    contract.on('Refunded', handleRefunded);

    return () => {
      contract.off('Initiated', handleInitiated);
      contract.off('Redeemed', handleRedeemed);
      contract.off('Refunded', handleRefunded);
    };
  }, [htlcId, provider]);

  if (status === 'idle') {
    return null;
  }

  return (
    <div className="mt-4 p-4 rounded-xl border border-blue-500/20 bg-blue-500/10 text-white">
      <h3 className="text-lg font-semibold mb-2">Transaction Status: {status.toUpperCase()}</h3>
      {transactionDetails && (
        <div className="text-sm space-y-1">
          <p><strong>ID:</strong> {transactionDetails.id.substring(0, 10)}...</p>
          <p><strong>Initiator:</strong> {transactionDetails.initiator.substring(0, 10)}...</p>
          <p><strong>Resolver:</strong> {transactionDetails.resolver.substring(0, 10)}...</p>
          <p><strong>Amount:</strong> {transactionDetails.amount} ETH</p>
          {transactionDetails.type === 'Redeemed' && (
            <p><strong>Preimage:</strong> {transactionDetails.preimage.substring(0, 10)}...</p>
          )}
        </div>
      )}
      {status === 'pending' && (
        <p className="mt-2 text-blue-300">Waiting for resolver to act or timelock to expire...</p>
      )}
      {status === 'redeemed' && (
        <p className="mt-2 text-green-300">Swap successfully completed!</p>
      )}
      {status === 'refunded' && (
        <p className="mt-2 text-red-300">Swap refunded. Funds returned to initiator.</p>
      )}
    </div>
  );
}
