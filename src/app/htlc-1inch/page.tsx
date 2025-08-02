'use client';

import React from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import HTLC1inchFlow from '@/components/bridge/HTLC1inchFlow/HTLC1inchFlow';

export default function HTLC1inchPage() {
  return (
    <PageWrapper
      title="HTLC 1inch Integration"
      description="Secure cross-chain swaps using Hash Time-Locked Contracts with 1inch Fusion API"
    >
      <div className="min-h-screen bg-gray-900">
        <HTLC1inchFlow />
      </div>
    </PageWrapper>
  );
} 