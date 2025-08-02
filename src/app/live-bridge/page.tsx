import LiveHTLCBridge from '@/components/bridge/LiveHTLCBridge/LiveHTLCBridge';

export default function LiveBridgePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Live HTLC Cross-Chain Bridge
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experience real cross-chain swaps using Hash Time-Locked Contracts (HTLC). 
            Bridge ETH, WBTC, and other tokens securely across networks.
          </p>
        </div>

        <LiveHTLCBridge />

        <div className="mt-12 max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h3 className="font-semibold mb-2">Create HTLC</h3>
                <p className="text-sm text-gray-600">
                  Lock your tokens with a secret hash and timelock. The HTLC ensures atomic swaps.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 font-bold">2</span>
                </div>
                <h3 className="font-semibold mb-2">Execute Swap</h3>
                <p className="text-sm text-gray-600">
                  Reveal the secret to unlock tokens on both sides. Only works if both parties cooperate.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-orange-600 font-bold">3</span>
                </div>
                <h3 className="font-semibold mb-2">Refund (Optional)</h3>
                <p className="text-sm text-gray-600">
                  If the swap isn&apos;t completed within the timelock, you can refund your tokens.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Deployed Contracts</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium">Sepolia Testnet:</span>
                <code className="bg-gray-200 px-2 py-1 rounded">
                  0x74A16d11aEcEb1A63b6B0080A8660dc128514444
                </code>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium">Ethereum Mainnet:</span>
                <code className="bg-gray-200 px-2 py-1 rounded">
                  0x2088990997e36e3C22DF036B6ECDD95e535BB324
                </code>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Supported Tokens</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Sepolia Testnet</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• ETH (Native)</li>
                  <li>• WBTC (Wrapped Bitcoin)</li>
                  <li>• WETH (Wrapped Ether)</li>
                  <li>• USDC (USD Coin)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Ethereum Mainnet</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• ETH (Native)</li>
                  <li>• WBTC (Wrapped Bitcoin)</li>
                  <li>• WETH (Wrapped Ether)</li>
                  <li>• USDC (USD Coin)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 