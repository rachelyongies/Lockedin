'use client';

import React from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import MetaMaskTest from '@/components/bridge/MetaMaskTest/MetaMaskTest';

export default function MetaMaskTestPage() {
  return (
    <PageWrapper
      title="MetaMask Connection Test"
      description="Test MetaMask connection and network switching"
    >
      <div className="min-h-screen bg-gray-900">
        <MetaMaskTest />
      </div>
    </PageWrapper>
  );
} 