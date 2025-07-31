import { TransactionLog } from './storage-manager';

interface PerformanceMetric {
  id: string;
  timestamp: number;
  route: string;
  gasUsed: number;
  slippage: number;
  executionTime: number;
  success: boolean;
  tokenPair: string;
}

interface WhaleTransaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  valueUSD: number;
  token: string;
  method: string;
  timestamp: number;
  gasUsed: string;
  blockNumber: number;
}

export class IndexedDBHelper {
  private static instance: IndexedDBHelper;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'IntelligentRouterDB';
  private readonly DB_VERSION = 1;

  static getInstance(): IndexedDBHelper {
    if (!IndexedDBHelper.instance) {
      IndexedDBHelper.instance = new IndexedDBHelper();
    }
    return IndexedDBHelper.instance;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('timestamp', 'timestamp', { unique: false });
          txStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('performance')) {
          const perfStore = db.createObjectStore('performance', { keyPath: 'id' });
          perfStore.createIndex('timestamp', 'timestamp', { unique: false });
          perfStore.createIndex('tokenPair', 'tokenPair', { unique: false });
        }

        if (!db.objectStoreNames.contains('whales')) {
          const whaleStore = db.createObjectStore('whales', { keyPath: 'id' });
          whaleStore.createIndex('timestamp', 'timestamp', { unique: false });
          whaleStore.createIndex('valueUSD', 'valueUSD', { unique: false });
        }
      };
    });
  }

  // Transaction logs
  async saveTransaction(transaction: TransactionLog): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['transactions'], 'readwrite');
      const store = tx.objectStore('transactions');
      const request = store.put(transaction);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save transaction'));
    });
  }

  async getTransactions(limit: number = 100): Promise<TransactionLog[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['transactions'], 'readonly');
      const store = tx.objectStore('transactions');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      
      const transactions: TransactionLog[] = [];
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && count < limit) {
          transactions.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(transactions);
        }
      };

      request.onerror = () => reject(new Error('Failed to get transactions'));
    });
  }

  // Performance metrics
  async savePerformanceMetric(metric: PerformanceMetric): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['performance'], 'readwrite');
      const store = tx.objectStore('performance');
      const request = store.put(metric);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save performance metric'));
    });
  }

  async getPerformanceMetrics(tokenPair?: string): Promise<PerformanceMetric[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['performance'], 'readonly');
      const store = tx.objectStore('performance');
      
      let request: IDBRequest;
      if (tokenPair) {
        const index = store.index('tokenPair');
        request = index.getAll(tokenPair);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get performance metrics'));
    });
  }

  // Whale transactions
  async saveWhaleTransaction(whale: WhaleTransaction): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['whales'], 'readwrite');
      const store = tx.objectStore('whales');
      const request = store.put(whale);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save whale transaction'));
    });
  }

  async getWhaleTransactions(minValueUSD: number = 100000): Promise<WhaleTransaction[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['whales'], 'readonly');
      const store = tx.objectStore('whales');
      const index = store.index('valueUSD');
      const range = IDBKeyRange.lowerBound(minValueUSD);
      const request = index.openCursor(range, 'prev');
      
      const whales: WhaleTransaction[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          whales.push(cursor.value);
          cursor.continue();
        } else {
          resolve(whales);
        }
      };

      request.onerror = () => reject(new Error('Failed to get whale transactions'));
    });
  }

  // Analytics helpers
  async calculateSuccessRate(tokenPair?: string): Promise<number> {
    const metrics = await this.getPerformanceMetrics(tokenPair);
    if (metrics.length === 0) return 0;
    
    const successful = metrics.filter(m => m.success).length;
    return (successful / metrics.length) * 100;
  }

  async getAverageGasUsed(tokenPair?: string): Promise<number> {
    const metrics = await this.getPerformanceMetrics(tokenPair);
    if (metrics.length === 0) return 0;
    
    const totalGas = metrics.reduce((sum, m) => sum + m.gasUsed, 0);
    return totalGas / metrics.length;
  }

  async getAverageSlippage(tokenPair?: string): Promise<number> {
    const metrics = await this.getPerformanceMetrics(tokenPair);
    if (metrics.length === 0) return 0;
    
    const totalSlippage = metrics.reduce((sum, m) => sum + m.slippage, 0);
    return totalSlippage / metrics.length;
  }

  // Cleanup old data (keep last 30 days)
  async cleanupOldData(): Promise<void> {
    if (!this.db) await this.init();

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    const stores = ['transactions', 'performance', 'whales'];
    for (const storeName of stores) {
      const tx = this.db!.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(thirtyDaysAgo);
      
      const request = index.openCursor(range);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
    }
  }

  // Clear all data
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    const stores = ['transactions', 'performance', 'whales'];
    for (const storeName of stores) {
      const tx = this.db!.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();
    }
  }
}