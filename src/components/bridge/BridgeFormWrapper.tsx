'use client';

import { useEffect, useState } from 'react';
import { BridgeForm } from './BridgeForm';
import type { BridgeFormProps } from './BridgeForm';

export function BridgeFormWrapper(props: BridgeFormProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading bridge...</span>
      </div>
    );
  }

  return <BridgeForm {...props} />;
}