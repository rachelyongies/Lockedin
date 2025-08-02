import WBTCCrossChainBridge from '@/components/bridge/WBTCCrossChainBridge/WBTCCrossChainBridge';

export default function WBTCBridgePage() {
  return (
    <div className="justify-center items-center">
      <div className="container mx-auto">
    

        <WBTCCrossChainBridge />

        <div className="mt-12 max-w-6xl mx-auto">
          {/* How It Works */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">How Cross-Chain Bridge Works</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">1</span>
                </div>
                <h3 className="font-semibold mb-2 text-white">Select Tokens</h3>
                <p className="text-sm text-gray-300">
                  Choose source and destination tokens from supported networks
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">2</span>
                </div>
                <h3 className="font-semibold mb-2 text-white">Get Quote</h3>
                <p className="text-sm text-gray-300">
                  Receive real-time quote with optimal routing and fees
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">3</span>
                </div>
                <h3 className="font-semibold mb-2 text-white">Execute Bridge</h3>
                <p className="text-sm text-gray-300">
                  Execute cross-chain bridge using HTLC escrow contracts
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">4</span>
                </div>
                <h3 className="font-semibold mb-2 text-white">Receive Tokens</h3>
                <p className="text-sm text-gray-300">
                  Receive tokens on destination chain after completion
                </p>
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