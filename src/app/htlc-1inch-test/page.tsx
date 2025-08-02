'use client';

import React from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import HTLC1inchTest from '@/components/bridge/HTLC1inchTest/HTLC1inchTest';

export default function HTLC1inchTestPage() {
  return (
    <PageWrapper
      title="1inch HTLC Integration Test"
      description="Test the 1inch API integration with real wallets and testnet tokens"
    >
      <div className="min-h-screen bg-gray-900">
        <HTLC1inchTest />
      </div>
    </PageWrapper>
  );
} 