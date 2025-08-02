// Debug logger utility for tracking wallet and bridge issues

export class DebugLogger {
  private static instance: DebugLogger;
  private logs: Array<{ timestamp: string; level: string; message: string; data?: any }> = [];

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, data };
    
    this.logs.push(logEntry);
    
    // Also log to console
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
    
    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Global debug logger instance
export const debugLogger = DebugLogger.getInstance();

// Helper functions for common debug scenarios
export const logWalletConnection = (walletType: string, success: boolean, error?: any) => {
  if (success) {
    debugLogger.info(`Wallet connection successful: ${walletType}`);
  } else {
    debugLogger.error(`Wallet connection failed: ${walletType}`, error);
  }
};

export const logNetworkDetection = (chainId: number, networkName: string) => {
  debugLogger.info(`Network detected: ${networkName} (Chain ID: ${chainId})`);
};

export const logBalanceFetch = (address: string, balance: string, success: boolean, error?: any) => {
  if (success) {
    debugLogger.info(`Balance fetched for ${address}: ${balance} ETH`);
  } else {
    debugLogger.error(`Balance fetch failed for ${address}`, error);
  }
};

export const logRPCConnection = (rpcUrl: string, success: boolean, error?: any) => {
  if (success) {
    debugLogger.info(`RPC connection successful: ${rpcUrl}`);
  } else {
    debugLogger.error(`RPC connection failed: ${rpcUrl}`, error);
  }
};

// Add debug info to window object for easy access
if (typeof window !== 'undefined') {
  (window as any).debugLogger = debugLogger;
  (window as any).logWalletConnection = logWalletConnection;
  (window as any).logNetworkDetection = logNetworkDetection;
  (window as any).logBalanceFetch = logBalanceFetch;
  (window as any).logRPCConnection = logRPCConnection;
} 