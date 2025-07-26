import { ethers } from 'ethers';
import { Token, BridgeQuote, BridgeTransaction, BridgeError, BridgeErrorCode } from '@/types/bridge';
import { BitcoinBridge__factory } from '../contracts/typechain-types';

// HTLC-based bridge service
export class HTLCBridgeService {
  private ethereumProvider: ethers.Provider;
  private bridgeContract: any;
  private wbtcContract: any;
  private isInitialized = false;

  constructor(
    ethereumRpcUrl: string,
    bridgeContractAddress: string,
    wbtcContractAddress: string
  ) {
    this.ethereumProvider = new ethers.JsonRpcProvider(ethereumRpcUrl);
    this.bridgeContract = BitcoinBridge__factory.connect(
      bridgeContractAddress,
      this.ethereumProvider
    );
    this.wbtcContract = new ethers.Contract(
      wbtcContractAddress,
      [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function transferFrom(address from, address to, uint256 amount) returns (bool)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ],
      this.ethereumProvider
    );
  }

  // Initialize the bridge service
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Verify contract addresses
      const bridgeCode = await this.ethereumProvider.getCode(this.bridgeContract.target);
      if (bridgeCode === '0x') {
        throw new Error('HTLC bridge contract not found at specified address');
      }

      this.isInitialized = true;
      console.log('HTLC bridge service initialized');
    } catch (error) {
      console.error('Failed to initialize HTLC bridge service:', error);
      throw error;
    }
  }

  // Generate HTLC parameters
  private generateHTLCParams(): { id: string; hash: string; preimage: string; timelock: number } {
    // Generate random preimage (secret)
    const preimage = ethers.randomBytes(32);
    const hash = ethers.sha256(preimage);
    const id = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'uint256'],
      [hash, Date.now()]
    ));
    
    // 24 hour timelock
    const timelock = 24 * 60 * 60; // 24 hours in seconds
    
    return {
      id,
      hash: hash,
      preimage: ethers.hexlify(preimage),
      timelock
    };
  }

  // Get quote for Bitcoin to Ethereum bridge (HTLC)
  async getBitcoinToEthereumQuote(
    amount: string,
    walletAddress: string
  ): Promise<BridgeQuote> {
    try {
      await this.initialize();

      const amountBN = ethers.parseEther(amount); // ETH has 18 decimals
      
      // Calculate fees
      const networkFee = ethers.parseEther('0.001'); // 0.001 ETH fee
      const protocolFee = ethers.parseEther('0.0005'); // 0.0005 ETH protocol fee
      const totalFee = networkFee + protocolFee;
      
      // Calculate ETH amount after fees
      const ethAmount = amountBN - totalFee;
      
      return {
        id: Math.random().toString(36).substr(2, 9),
        fromToken: {
          id: 'btc-mainnet',
          symbol: 'BTC',
          name: 'Bitcoin',
          decimals: 8,
          logoUrl: '/images/tokens/btc.svg',
          coingeckoId: 'bitcoin',
          network: 'bitcoin',
          chainId: 'mainnet',
          isNative: true,
          isWrapped: false,
          verified: true,
          displayPrecision: 5,
          description: 'The original cryptocurrency',
          tags: ['native', 'store-of-value'],
        },
        toToken: {
          id: 'eth-mainnet',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          logoUrl: '/images/tokens/eth.svg',
          coingeckoId: 'ethereum',
          network: 'ethereum',
          chainId: 1,
          address: '0x0000000000000000000000000000000000000000',
          isNative: true,
          isWrapped: false,
          verified: true,
          displayPrecision: 5,
          description: 'Ethereum native token',
          tags: ['native', 'gas'],
        },
        fromAmount: amount,
        toAmount: ethers.formatEther(ethAmount),
        exchangeRate: '1', // 1:1 for now
        networkFee: ethers.formatEther(networkFee),
        protocolFee: ethers.formatEther(protocolFee),
        totalFee: ethers.formatEther(totalFee),
        estimatedTime: '10-30 minutes',
        minimumReceived: ethers.formatEther(ethAmount),
        priceImpact: '0.1',
        expiresAt: Date.now() + 300000, // 5 minutes
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to get Bitcoin to Ethereum quote');
    }
  }

  // Execute Bitcoin to Ethereum bridge using HTLC
  async executeBitcoinToEthereum(
    amount: string,
    bitcoinAddress: string,
    walletAddress: string,
    signer: ethers.Signer,
    onProgress?: (status: string, data?: any) => void
  ): Promise<BridgeTransaction> {
    try {
      await this.initialize();

      onProgress?.('Generating HTLC parameters...');

      // Generate HTLC parameters
      const { id, hash, preimage, timelock } = this.generateHTLCParams();
      
      const amountBN = ethers.parseEther(amount);

      onProgress?.('Creating HTLC on Ethereum...');

      // Connect contract with signer
      const bridgeContractWithSigner = this.bridgeContract.connect(signer);
      
      // Create HTLC transaction
      const txResponse = await bridgeContractWithSigner.initiate(
        id,
        walletAddress, // resolver (who can redeem)
        hash,
        timelock,
        { value: amountBN }
      );

      onProgress?.('Waiting for HTLC confirmation...');

      // Wait for transaction confirmation
      const receipt = await txResponse.wait();

      onProgress?.('HTLC created successfully!');

      return {
        id: Math.random().toString(36).substr(2, 9),
        from: {
          id: 'btc-mainnet',
          symbol: 'BTC',
          name: 'Bitcoin',
          decimals: 8,
          logoUrl: '/images/tokens/btc.svg',
          coingeckoId: 'bitcoin',
          network: 'bitcoin',
          chainId: 'mainnet',
          isNative: true,
          isWrapped: false,
          verified: true,
          displayPrecision: 5,
          description: 'The original cryptocurrency',
          tags: ['native', 'store-of-value'],
        },
        to: {
          id: 'eth-mainnet',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          logoUrl: '/images/tokens/eth.svg',
          coingeckoId: 'ethereum',
          network: 'ethereum',
          chainId: 1,
          address: '0x0000000000000000000000000000000000000000',
          isNative: true,
          isWrapped: false,
          verified: true,
          displayPrecision: 5,
          description: 'Ethereum native token',
          tags: ['native', 'gas'],
        },
        fromAmount: {
          raw: amount,
          bn: amountBN,
          decimals: 18,
          formatted: amount
        },
        toAmount: {
          raw: amount,
          bn: amountBN,
          decimals: 18,
          formatted: amount
        },
        fromAddress: walletAddress,
        toAddress: bitcoinAddress,
        status: 'pending',
        txIdentifier: {
          ethereum: receipt.hash,
          htlc: {
            id,
            hash,
            preimage, // Keep secret until Bitcoin transaction is sent
            timelock: Date.now() + (timelock * 1000)
          }
        },
        confirmations: 0,
        requiredConfirmations: 1,
        isConfirmed: false,
        timestamps: {
          created: Date.now(),
          updated: Date.now()
        },
        fees: {
          network: {
            amount: {
              raw: '0.001',
              bn: ethers.parseEther('0.001'),
              decimals: 18,
              formatted: '0.001'
            },
            amountUSD: 0
          },
          protocol: {
            amount: {
              raw: '0.0005',
              bn: ethers.parseEther('0.0005'),
              decimals: 18,
              formatted: '0.0005'
            },
            amountUSD: 0,
            percent: 0.005
          },
          total: {
            amount: {
              raw: '0.0015',
              bn: ethers.parseEther('0.0015'),
              decimals: 18,
              formatted: '0.0015'
            },
            amountUSD: 0
          }
        },
        retryCount: 0
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to execute Bitcoin to Ethereum bridge');
    }
  }

  // Redeem HTLC (called after Bitcoin transaction is sent)
  async redeemHTLC(
    htlcId: string,
    preimage: string,
    signer: ethers.Signer,
    onProgress?: (status: string, data?: any) => void
  ): Promise<BridgeTransaction> {
    try {
      await this.initialize();

      onProgress?.('Redeeming HTLC...');

      // Connect contract with signer
      const bridgeContractWithSigner = this.bridgeContract.connect(signer);
      
      // Redeem HTLC
      const txResponse = await bridgeContractWithSigner.redeem(
        htlcId,
        preimage
      );

      onProgress?.('Waiting for redemption confirmation...');

      // Wait for transaction confirmation
      const receipt = await txResponse.wait();

      onProgress?.('HTLC redeemed successfully!');

      return {
        id: Math.random().toString(36).substr(2, 9),
        from: {
          id: 'btc-mainnet',
          symbol: 'BTC',
          name: 'Bitcoin',
          decimals: 8,
          logoUrl: '/images/tokens/btc.svg',
          coingeckoId: 'bitcoin',
          network: 'bitcoin',
          chainId: 'mainnet',
          isNative: true,
          isWrapped: false,
          verified: true,
          displayPrecision: 5,
          description: 'The original cryptocurrency',
          tags: ['native', 'store-of-value'],
        },
        to: {
          id: 'eth-mainnet',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          logoUrl: '/images/tokens/eth.svg',
          coingeckoId: 'ethereum',
          network: 'ethereum',
          chainId: 1,
          address: '0x0000000000000000000000000000000000000000',
          isNative: true,
          isWrapped: false,
          verified: true,
          displayPrecision: 5,
          description: 'Ethereum native token',
          tags: ['native', 'gas'],
        },
        fromAmount: {
          raw: '0',
          bn: ethers.parseEther('0'),
          decimals: 18,
          formatted: '0'
        },
        toAmount: {
          raw: '0',
          bn: ethers.parseEther('0'),
          decimals: 18,
          formatted: '0'
        },
        fromAddress: '',
        toAddress: '',
        status: 'completed',
        txIdentifier: {
          ethereum: receipt.hash,
          htlc: {
            id: htlcId,
            redeemed: true
          }
        },
        confirmations: 1,
        requiredConfirmations: 1,
        isConfirmed: true,
        timestamps: {
          created: Date.now(),
          updated: Date.now()
        },
        fees: {
          network: {
            amount: {
              raw: '0',
              bn: ethers.parseEther('0'),
              decimals: 18,
              formatted: '0'
            },
            amountUSD: 0
          },
          protocol: {
            amount: {
              raw: '0',
              bn: ethers.parseEther('0'),
              decimals: 18,
              formatted: '0'
            },
            amountUSD: 0,
            percent: 0
          },
          total: {
            amount: {
              raw: '0',
              bn: ethers.parseEther('0'),
              decimals: 18,
              formatted: '0'
            },
            amountUSD: 0
          }
        },
        retryCount: 0
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to redeem HTLC');
    }
  }

  // Refund HTLC (if Bitcoin transaction fails or times out)
  async refundHTLC(
    htlcId: string,
    signer: ethers.Signer,
    onProgress?: (status: string, data?: any) => void
  ): Promise<BridgeTransaction> {
    try {
      await this.initialize();

      onProgress?.('Refunding HTLC...');

      // Connect contract with signer
      const bridgeContractWithSigner = this.bridgeContract.connect(signer);
      
      // Refund HTLC
      const txResponse = await bridgeContractWithSigner.refund(htlcId);

      onProgress?.('Waiting for refund confirmation...');

      // Wait for transaction confirmation
      const receipt = await txResponse.wait();

      onProgress?.('HTLC refunded successfully!');

      return {
        id: Math.random().toString(36).substr(2, 9),
        from: {
          id: 'btc-mainnet',
          symbol: 'BTC',
          name: 'Bitcoin',
          decimals: 8,
          logoUrl: '/images/tokens/btc.svg',
          coingeckoId: 'bitcoin',
          network: 'bitcoin',
          chainId: 'mainnet',
          isNative: true,
          isWrapped: false,
          verified: true,
          displayPrecision: 5,
          description: 'The original cryptocurrency',
          tags: ['native', 'store-of-value'],
        },
        to: {
          id: 'eth-mainnet',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          logoUrl: '/images/tokens/eth.svg',
          coingeckoId: 'ethereum',
          network: 'ethereum',
          chainId: 1,
          address: '0x0000000000000000000000000000000000000000',
          isNative: true,
          isWrapped: false,
          verified: true,
          displayPrecision: 5,
          description: 'Ethereum native token',
          tags: ['native', 'gas'],
        },
        fromAmount: {
          raw: '0',
          bn: ethers.parseEther('0'),
          decimals: 18,
          formatted: '0'
        },
        toAmount: {
          raw: '0',
          bn: ethers.parseEther('0'),
          decimals: 18,
          formatted: '0'
        },
        fromAddress: '',
        toAddress: '',
        status: 'refunded',
        txIdentifier: {
          ethereum: receipt.hash,
          htlc: {
            id: htlcId,
            refunded: true
          }
        },
        confirmations: 1,
        requiredConfirmations: 1,
        isConfirmed: true,
        timestamps: {
          created: Date.now(),
          updated: Date.now()
        },
        fees: {
          network: {
            amount: {
              raw: '0',
              bn: ethers.parseEther('0'),
              decimals: 18,
              formatted: '0'
            },
            amountUSD: 0
          },
          protocol: {
            amount: {
              raw: '0',
              bn: ethers.parseEther('0'),
              decimals: 18,
              formatted: '0'
            },
            amountUSD: 0,
            percent: 0
          },
          total: {
            amount: {
              raw: '0',
              bn: ethers.parseEther('0'),
              decimals: 18,
              formatted: '0'
            },
            amountUSD: 0
          }
        },
        retryCount: 0
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to refund HTLC');
    }
  }

  // Get HTLC status
  async getHTLCStatus(htlcId: string): Promise<{
    exists: boolean;
    executed: boolean;
    refunded: boolean;
    timelock: number;
    amount: string;
    initiator: string;
    resolver: string;
  }> {
    try {
      await this.initialize();

      const htlc = await this.bridgeContract.htlcs(htlcId);
      
      return {
        exists: htlc.initiator !== ethers.ZeroAddress,
        executed: htlc.executed,
        refunded: htlc.refunded,
        timelock: Number(htlc.timelock),
        amount: ethers.formatEther(htlc.amount),
        initiator: htlc.initiator,
        resolver: htlc.resolver
      };
    } catch (error) {
      console.error('Error getting HTLC status:', error);
      return {
        exists: false,
        executed: false,
        refunded: false,
        timelock: 0,
        amount: '0',
        initiator: '',
        resolver: ''
      };
    }
  }

  // Error handling
  private handleError(error: any, defaultMessage: string): BridgeError {
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
export let htlcBridgeService: HTLCBridgeService | null = null;

// Initialize the HTLC bridge service
export function initializeHTLCBridge(
  ethereumRpcUrl: string,
  bridgeContractAddress: string,
  wbtcContractAddress: string
) {
  htlcBridgeService = new HTLCBridgeService(
    ethereumRpcUrl,
    bridgeContractAddress,
    wbtcContractAddress
  );
  
  return htlcBridgeService;
} 