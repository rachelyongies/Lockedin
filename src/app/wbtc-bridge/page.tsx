import WBTCCrossChainBridge from '@/components/bridge/WBTCCrossChainBridge/WBTCCrossChainBridge';

export default function WBTCBridgePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            WBTC Cross-Chain Bridge
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Bridge native tokens (ETH, MATIC, BNB) to Wrapped Bitcoin (WBTC) across multiple chains 
            using 1inch Fusion+ protocol. Experience seamless cross-chain swaps with real-time quotes.
          </p>
        </div>

        <WBTCCrossChainBridge />

        <div className="mt-12 max-w-6xl mx-auto">
          {/* How It Works */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">How WBTC Cross-Chain Bridge Works</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h3 className="font-semibold mb-2">Select Chains</h3>
                <p className="text-sm text-gray-600">
                  Choose source and destination chains from 6 supported networks
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-purple-600 font-bold">2</span>
                </div>
                <h3 className="font-semibold mb-2">Get Quote</h3>
                <p className="text-sm text-gray-600">
                  Receive real-time quote from 1inch Fusion+ with optimal routing
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 font-bold">3</span>
                </div>
                <h3 className="font-semibold mb-2">Execute Swap</h3>
                <p className="text-sm text-gray-600">
                  Execute cross-chain swap using HTLC escrow contracts
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-orange-600 font-bold">4</span>
                </div>
                <h3 className="font-semibold mb-2">Receive WBTC</h3>
                <p className="text-sm text-gray-600">
                  Receive WBTC on destination chain after secret revelation
                </p>
              </div>
            </div>
          </div>

          {/* Supported Networks */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Supported Networks</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold mb-3 text-blue-600">Layer 1</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Ethereum (ETH → WBTC)
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    BSC (BNB → WBTC)
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3 text-purple-600">Layer 2</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    Polygon (MATIC → WBTC)
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    Arbitrum (ETH → WBTC)
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    Optimism (ETH → WBTC)
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    Base (ETH → WBTC)
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3 text-green-600">Benefits</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Real-time quotes
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Atomic swaps
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    No bridging fees
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Instant execution
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* WBTC Information */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">About Wrapped Bitcoin (WBTC)</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">What is WBTC?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  WBTC is an ERC-20 token that represents Bitcoin on Ethereum and other EVM-compatible chains. 
                  Each WBTC is backed 1:1 by actual Bitcoin held in custody.
                </p>
                <h3 className="font-semibold mb-2">Why Use WBTC?</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Access Bitcoin liquidity on DeFi protocols</li>
                  <li>• Earn yield on Bitcoin holdings</li>
                  <li>• Trade Bitcoin on DEXs</li>
                  <li>• Use Bitcoin as collateral</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">WBTC Addresses</h3>
                <div className="space-y-2 text-xs">
                  <div className="p-2 bg-gray-50 rounded">
                    <strong>Ethereum:</strong> 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <strong>Polygon:</strong> 0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <strong>Arbitrum:</strong> 0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <strong>Optimism:</strong> 0x68f180fcCe6836688e9084f035309E29Bf0A2095
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Technical Architecture</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">1inch Fusion+ Protocol</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• HTLC escrow contracts on each chain</li>
                  <li>• Secret hash linking across chains</li>
                  <li>• Atomic swap execution</li>
                  <li>• Automatic order matching</li>
                  <li>• Real-time price discovery</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Security Features</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Time-locked escrows</li>
                  <li>• Cryptographic secrets</li>
                  <li>• Multi-signature safety</li>
                  <li>• Automatic refunds</li>
                  <li>• Audited smart contracts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 