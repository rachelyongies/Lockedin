'use client';

import React from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import WalletSetup from '@/components/bridge/WalletSetup/WalletSetup';

export default function WalletSetupPage() {
  return (
    <PageWrapper
      title="Wallet Setup"
      description="Configure your wallet address and RPC settings for testing the 1inch integration"
    >
      <div className="min-h-screen bg-gray-900">
        <WalletSetup />
      </div>
    </PageWrapper>
  );
} 