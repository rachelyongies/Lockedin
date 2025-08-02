import { ethers } from 'ethers';
import { Token, BridgeQuote, BridgeTransaction, BridgeError, BridgeErrorCode } from '@/types/bridge';
import { fusionAPI, FusionOrderResponse, FusionOrderStatusResponse } from './1inch-fusion';

// HTLC 1inch Integration Service
export class HTLC1inchService {
  private ethereumProvider: ethers.Provider;
  private htlcContract: ethers.Contract;
  private isInitialized = false;

  // HTLC ABI for the escrow contract
  private static HTLC_ABI = [
    'function createHTLC(address resolver, address fromToken, address toToken, uint256 amount, uint256 expectedAmount, bytes32 secretHash, uint256 timelock) external',
    'function submitOrder(bytes32 htlcId, string orderId) external',
    'function executeHTLC(bytes32 htlcId, bytes32 secret) external',
    'function executeHTLCWithSwap(bytes32 htlcId, bytes32 secret, uint256 actualAmount) external',
    'function refundHTLC(bytes32 htlcId) external',
    'function getHTLC(bytes32 htlcId) external view returns (address initiator, address resolver, address fromToken, address toToken, uint256 amount, uint256 expectedAmount, bytes32 secretHash, uint256 timelock, bool executed, bool refunded, string orderId, bool orderSubmitted)',
    'function htlcExists(bytes32 htlcId) external view returns (bool)',
    'event HTLCCreated(bytes32 indexed htlcId, address indexed initiator, address indexed resolver, address fromToken, address toToken, uint256 amount, uint256 expectedAmount, bytes32 secretHash, uint256 timelock)',
    'event HTLCExecuted(bytes32 indexed htlcId, address indexed resolver, bytes32 secret, uint256 actualAmount)',
    'event HTLCRefunded(bytes32 indexed htlcId, address indexed initiator)',
    'event OrderSubmitted(bytes32 indexed htlcId, string orderId, address indexed initiator)',
    'event OrderExecuted(bytes32 indexed htlcId, string orderId, uint256 actualAmount)'
  ];

  constructor(
    ethereumRpcUrl: string,
    htlcContractAddress: string
  ) {
    this.ethereumProvider = new ethers.JsonRpcProvider(ethereumRpcUrl);
    this.htlcContract = new ethers.Contract(
      htlcContractAddress,
      HTLC1inchService.HTLC_ABI,
      this.ethereumProvider
    );
  }

  // Initialize the service
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Verify contract address
      const contractCode = await this.ethereumProvider.getCode(this.htlcContract.target);
      if (contractCode === '0x') {
        throw new Error('HTLC contract not found at specified address');
      }

      this.isInitialized = true;
      console.log('HTLC 1inch service initialized');
    } catch (error) {
      console.error('Failed to initialize HTLC 1inch service:', error);
      throw error;
    }
  }

  // Generate HTLC parameters
  private generateHTLCParams(): { id: string; hash: string; preimage: string; timelock: number } {
    // Generate random preimage (secret)
    const preimage = new Uint8Array(32);
    crypto.getRandomValues(preimage);
    const hash = ethers.sha256(preimage);
    const id = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'uint256'],
      [hash, Date.now()]
    ));
    
    // Use absolute timestamp for cross-chain coordination (24 hours from now)
    const timelock = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
    
    return {
      id,
      hash: hash,
      preimage: ethers.hexlify(preimage),
      timelock
    };
  }

  // Get quote for cross-chain swap with HTLC
  async getQuote(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string
  ): Promise<BridgeQuote> {
    try {
      // Get 1inch quote
      const quote = await fusionAPI.getQuote(fromToken, toToken, amount, walletAddress);
      
      // Add HTLC-specific information
      const htlcParams = this.generateHTLCParams();
      
      return {
        ...quote,
        id: htlcParams.id, // Use HTLC ID as quote ID
        estimatedTime: '5-10 minutes', // HTLC adds some time
        minimumReceived: quote.minimumReceived,
        htlcHash: htlcParams.hash,
        htlcTimelock: htlcParams.timelock
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to get quote');
    }
  }

  // Create HTLC and initiate cross-chain swap
  async createHTLCSwap(
    fromToken: Token,
    toToken: Token,
    amount: string,
    resolverAddress: string,
    expectedAmount: string,
    signer: ethers.Signer,
    onProgress?: (status: string, data?: unknown) => void
  ): Promise<BridgeTransaction> {
    try {
      onProgress?.('Generating HTLC parameters...');
      
      // Generate HTLC parameters
      const htlcParams = this.generateHTLCParams();
      
      onProgress?.('Creating 1inch Fusion order...');
      
      // Create 1inch Fusion order
      const order = await fusionAPI.createOrder(
        fromToken,
        toToken,
        amount,
        await signer.getAddress()
      );
      
      onProgress?.('Creating HTLC contract...');
      
      // Create HTLC contract
      const tx = await this.htlcContract.connect(signer).createHTLC(
        resolverAddress,
        fromToken.address,
        toToken.address,
        ethers.parseUnits(amount, fromToken.decimals || 18),
        ethers.parseUnits(expectedAmount, toToken.decimals || 18),
        htlcParams.hash,
        htlcParams.timelock
      );
      
      onProgress?.('Waiting for HTLC creation confirmation...');
      const receipt = await tx.wait();
      
      // Find HTLCCreated event
      const htlcCreatedEvent = receipt.logs.find(log => {
        try {
          const parsed = this.htlcContract.interface.parseLog(log);
          return parsed.name === 'HTLCCreated';
        } catch {
          return false;
        }
      });
      
      if (!htlcCreatedEvent) {
        throw new Error('HTLCCreated event not found');
      }
      
      const parsedEvent = this.htlcContract.interface.parseLog(htlcCreatedEvent);
      const htlcId = parsedEvent.args[0];
      
      onProgress?.('Submitting 1inch order to HTLC...');
      
      // Submit 1inch order to HTLC
      const submitTx = await this.htlcContract.connect(signer).submitOrder(
        htlcId,
        order.orderId
      );
      
      await submitTx.wait();
      
      onProgress?.('HTLC swap created successfully!');
      
      return {
        id: htlcId,
        status: 'pending',
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: expectedAmount,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        timestamp: Date.now(),
        htlcId,
        orderId: order.orderId,
        secret: htlcParams.preimage,
        secretHash: htlcParams.hash,
        timelock: htlcParams.timelock
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to create HTLC swap');
    }
  }

  // Execute HTLC with secret (for resolver)
  async executeHTLC(
    htlcId: string,
    secret: string,
    signer: ethers.Signer,
    onProgress?: (status: string, data?: unknown) => void
  ): Promise<BridgeTransaction> {
    try {
      onProgress?.('Executing HTLC...');
      
      // Get HTLC details
      const htlc = await this.getHTLCDetails(htlcId);
      
      if (!htlc) {
        throw new Error('HTLC not found');
      }
      
      if (htlc.executed) {
        throw new Error('HTLC already executed');
      }
      
      if (htlc.refunded) {
        throw new Error('HTLC already refunded');
      }
      
      // Check if timelock has expired
      if (Date.now() / 1000 >= htlc.timelock) {
        throw new Error('HTLC timelock has expired');
      }
      
      // Execute HTLC
      const tx = await this.htlcContract.connect(signer).executeHTLC(
        htlcId,
        secret
      );
      
      onProgress?.('Waiting for HTLC execution confirmation...');
      const receipt = await tx.wait();
      
      onProgress?.('HTLC executed successfully!');
      
      return {
        id: htlcId,
        status: 'completed',
        fromToken: htlc.fromToken,
        toToken: htlc.toToken,
        fromAmount: ethers.formatUnits(htlc.amount, 18),
        toAmount: ethers.formatUnits(htlc.expectedAmount, 18),
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        timestamp: Date.now(),
        htlcId,
        secret
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to execute HTLC');
    }
  }

  // Execute HTLC with 1inch swap completion
  async executeHTLCWithSwap(
    htlcId: string,
    secret: string,
    actualAmount: string,
    signer: ethers.Signer,
    onProgress?: (status: string, data?: unknown) => void
  ): Promise<BridgeTransaction> {
    try {
      onProgress?.('Executing HTLC with swap...');
      
      // Get HTLC details
      const htlc = await this.getHTLCDetails(htlcId);
      
      if (!htlc) {
        throw new Error('HTLC not found');
      }
      
      if (htlc.executed) {
        throw new Error('HTLC already executed');
      }
      
      if (htlc.refunded) {
        throw new Error('HTLC already refunded');
      }
      
      if (!htlc.orderSubmitted) {
        throw new Error('1inch order not submitted');
      }
      
      // Check if timelock has expired
      if (Date.now() / 1000 >= htlc.timelock) {
        throw new Error('HTLC timelock has expired');
      }
      
      // Execute HTLC with swap
      const tx = await this.htlcContract.connect(signer).executeHTLCWithSwap(
        htlcId,
        secret,
        ethers.parseUnits(actualAmount, 18)
      );
      
      onProgress?.('Waiting for HTLC execution confirmation...');
      const receipt = await tx.wait();
      
      onProgress?.('HTLC executed with swap successfully!');
      
      return {
        id: htlcId,
        status: 'completed',
        fromToken: htlc.fromToken,
        toToken: htlc.toToken,
        fromAmount: ethers.formatUnits(htlc.amount, 18),
        toAmount: actualAmount,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        timestamp: Date.now(),
        htlcId,
        secret,
        actualAmount
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to execute HTLC with swap');
    }
  }

  // Refund HTLC if timelock has expired
  async refundHTLC(
    htlcId: string,
    signer: ethers.Signer,
    onProgress?: (status: string, data?: unknown) => void
  ): Promise<BridgeTransaction> {
    try {
      onProgress?.('Refunding HTLC...');
      
      // Get HTLC details
      const htlc = await this.getHTLCDetails(htlcId);
      
      if (!htlc) {
        throw new Error('HTLC not found');
      }
      
      if (htlc.executed) {
        throw new Error('HTLC already executed');
      }
      
      if (htlc.refunded) {
        throw new Error('HTLC already refunded');
      }
      
      // Check if timelock has expired
      if (Date.now() / 1000 < htlc.timelock) {
        throw new Error('HTLC timelock has not expired yet');
      }
      
      // Refund HTLC
      const tx = await this.htlcContract.connect(signer).refundHTLC(htlcId);
      
      onProgress?.('Waiting for HTLC refund confirmation...');
      const receipt = await tx.wait();
      
      onProgress?.('HTLC refunded successfully!');
      
      return {
        id: htlcId,
        status: 'refunded',
        fromToken: htlc.fromToken,
        toToken: htlc.toToken,
        fromAmount: ethers.formatUnits(htlc.amount, 18),
        toAmount: '0',
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        timestamp: Date.now(),
        htlcId
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to refund HTLC');
    }
  }

  // Get HTLC details
  async getHTLCDetails(htlcId: string): Promise<{
    initiator: string;
    resolver: string;
    fromToken: string;
    toToken: string;
    amount: bigint;
    expectedAmount: bigint;
    secretHash: string;
    timelock: number;
    executed: boolean;
    refunded: boolean;
    orderId: string;
    orderSubmitted: boolean;
  } | null> {
    try {
      const exists = await this.htlcContract.htlcExists(htlcId);
      if (!exists) {
        return null;
      }
      
      const htlc = await this.htlcContract.getHTLC(htlcId);
      
      return {
        initiator: htlc[0],
        resolver: htlc[1],
        fromToken: htlc[2],
        toToken: htlc[3],
        amount: htlc[4],
        expectedAmount: htlc[5],
        secretHash: htlc[6],
        timelock: Number(htlc[7]),
        executed: htlc[8],
        refunded: htlc[9],
        orderId: htlc[10],
        orderSubmitted: htlc[11]
      };
    } catch (error) {
      console.error('Error getting HTLC details:', error);
      return null;
    }
  }

  // Monitor 1inch order status
  async monitorOrderStatus(
    orderId: string,
    onProgress?: (status: string, data?: unknown) => void
  ): Promise<FusionOrderStatusResponse> {
    try {
      onProgress?.('Checking 1inch order status...');
      
      const status = await fusionAPI.getOrderStatus(orderId);
      
      onProgress?.(`Order status: ${status.orderStatus}`);
      
      return status;
    } catch (error) {
      throw this.handleError(error, 'Failed to monitor order status');
    }
  }

  // Get all HTLCs for a user
  async getUserHTLCs(
    userAddress: string,
    filter?: 'all' | 'pending' | 'executed' | 'refunded'
  ): Promise<Array<{
    htlcId: string;
    initiator: string;
    resolver: string;
    fromToken: string;
    toToken: string;
    amount: string;
    expectedAmount: string;
    timelock: number;
    executed: boolean;
    refunded: boolean;
    orderId: string;
    orderSubmitted: boolean;
  }>> {
    try {
      // Note: This is a simplified implementation
      // In production, you would need to index events or use a subgraph
      // For now, we'll return an empty array
      console.log('Getting HTLCs for user:', userAddress, 'filter:', filter);
      
      return [];
    } catch (error) {
      console.error('Error getting user HTLCs:', error);
      return [];
    }
  }

  // Handle errors
  private handleError(error: unknown, defaultMessage: string): BridgeError {
    console.error('HTLC 1inch service error:', error);
    
    if (error instanceof Error) {
      return {
        code: BridgeErrorCode.UNKNOWN,
        message: error.message || defaultMessage,
        details: error
      };
    }
    
    return {
      code: BridgeErrorCode.UNKNOWN,
      message: defaultMessage,
      details: error
    };
  }
}

// Export singleton instance
export function initializeHTLC1inchService(
  ethereumRpcUrl: string,
  htlcContractAddress: string
): HTLC1inchService {
  return new HTLC1inchService(ethereumRpcUrl, htlcContractAddress);
} 