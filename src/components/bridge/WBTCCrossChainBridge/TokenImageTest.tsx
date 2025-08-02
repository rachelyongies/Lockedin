'use client';

import React from 'react';

export default function TokenImageTest() {
  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h3 className="text-white mb-4">Token Image Test</h3>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <img 
            src="/images/tokens/eth.svg" 
            alt="ETH"
            className="w-8 h-8 rounded-full"
            onError={(e) => {
              console.error('ETH image failed to load:', e);
              const target = e.target as HTMLImageElement;
              target.style.border = '2px solid red';
            }}
            onLoad={() => console.log('ETH image loaded successfully')}
          />
          <span className="text-white">ETH - Ethereum</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <img 
            src="/images/tokens/wbtc.svg" 
            alt="WBTC"
            className="w-8 h-8 rounded-full"
            onError={(e) => {
              console.error('WBTC image failed to load:', e);
              const target = e.target as HTMLImageElement;
              target.style.border = '2px solid red';
            }}
            onLoad={() => console.log('WBTC image loaded successfully')}
          />
          <span className="text-white">WBTC - Wrapped Bitcoin</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <img 
            src="/images/tokens/usdc.svg" 
            alt="USDC"
            className="w-8 h-8 rounded-full"
            onError={(e) => {
              console.error('USDC image failed to load:', e);
              const target = e.target as HTMLImageElement;
              target.style.border = '2px solid red';
            }}
            onLoad={() => console.log('USDC image loaded successfully')}
          />
          <span className="text-white">USDC - USD Coin</span>
        </div>
      </div>
      
      <div className="mt-4 p-2 bg-gray-700 rounded">
        <p className="text-sm text-gray-300">Check browser console for image loading status</p>
      </div>
    </div>
  );
} 