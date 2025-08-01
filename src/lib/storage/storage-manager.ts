export interface StorageStrategy {
  id: string;
  name: string;
  conditions: {
    price?: { token: string; above?: number; below?: number };
    time?: { interval: 'hourly' | 'daily' | 'weekly' };
    volume?: { token: string; above?: number };
    gas?: { below?: number };
  };
  actions: {
    swap?: { from: string; to: string; amount: string };
    notify?: { message: string };
  };
  enabled: boolean;
  createdAt: number;
  lastExecuted?: number;
  executionCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    route?: Record<string, unknown>;
    tokens?: Array<Record<string, unknown>>;
  };
}

export interface TransactionLog {
  id: string;
  hash: string;
  from: string;
  to: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  gasUsed: string;
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
  route: string[];
}

export class StorageManager {
  private static instance: StorageManager;
  private readonly MAX_CHAT_HISTORY_SIZE = 50; // Limit chat history entries
  private readonly MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB limit (leaving 1MB buffer)
  
  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  // Custom JSON serializer that handles BigInt and other special types
  private safeStringify(data: unknown): string {
    return JSON.stringify(data, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString() + 'n'; // Mark as BigInt
      }
      if (value instanceof Date) {
        return { __date: value.toISOString() };
      }
      if (value instanceof Map) {
        return { __map: Array.from(value.entries()) };
      }
      if (value instanceof Set) {
        return { __set: Array.from(value) };
      }
      // Remove circular references and functions
      if (typeof value === 'function') {
        return undefined;
      }
      return value;
    });
  }

  // Custom JSON parser that reconstructs special types
  private safeParse(jsonString: string): unknown {
    return JSON.parse(jsonString, (key, value) => {
      if (typeof value === 'string' && value.endsWith('n')) {
        const numStr = value.slice(0, -1);
        if (/^-?\d+$/.test(numStr)) {
          return BigInt(numStr);
        }
      }
      if (value && typeof value === 'object') {
        if (value.__date) {
          return new Date(value.__date);
        }
        if (value.__map) {
          return new Map(value.__map);
        }
        if (value.__set) {
          return new Set(value.__set);
        }
      }
      return value;
    });
  }

  // Get storage size estimation
  private getStorageSize(): number {
    let totalSize = 0;
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const value = sessionStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      }
    }
    return totalSize;
  }

  // LocalStorage methods (5MB limit)
  saveToLocal<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('LocalStorage save failed:', e);
      // Clear old data if storage is full
      this.clearOldLocalData();
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {
        throw new Error('Storage quota exceeded');
      }
    }
  }

  getFromLocal<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error('LocalStorage read failed:', e);
      return null;
    }
  }

  removeFromLocal(key: string): void {
    localStorage.removeItem(key);
  }

  // SessionStorage methods (5MB limit)
  saveToSession<T>(key: string, data: T): void {
    try {
      const serializedData = this.safeStringify(data);
      
      // Check if this would exceed our size limit
      const estimatedSize = this.getStorageSize() + key.length + serializedData.length;
      if (estimatedSize > this.MAX_STORAGE_SIZE) {
        console.warn('Storage size approaching limit, cleaning up old data');
        this.clearOldSessionData();
      }
      
      sessionStorage.setItem(key, serializedData);
    } catch (e) {
      console.error('SessionStorage save failed:', e);
      
      // More aggressive cleanup
      this.clearOldSessionData();
      this.clearLargeSessionData();
      
      try {
        const serializedData = this.safeStringify(data);
        sessionStorage.setItem(key, serializedData);
      } catch (retryError) {
        console.error('SessionStorage retry failed:', retryError);
        throw new Error('Session storage quota exceeded after cleanup');
      }
    }
  }

  getFromSession<T>(key: string): T | null {
    try {
      const item = sessionStorage.getItem(key);
      return item ? this.safeParse(item) as T : null;
    } catch (e) {
      console.error('SessionStorage parse failed:', e);
      // Remove corrupted data
      sessionStorage.removeItem(key);
      return null;
    }
  }

  // Strategy storage
  saveStrategies(strategies: StorageStrategy[]): void {
    this.saveToLocal('trading_strategies', strategies);
  }

  getStrategies(): StorageStrategy[] {
    return this.getFromLocal<StorageStrategy[]>('trading_strategies') || [];
  }

  saveStrategy(strategy: StorageStrategy): void {
    const strategies = this.getStrategies();
    const index = strategies.findIndex(s => s.id === strategy.id);
    
    if (index >= 0) {
      strategies[index] = strategy;
    } else {
      strategies.push(strategy);
    }
    
    this.saveStrategies(strategies);
  }

  deleteStrategy(id: string): void {
    const strategies = this.getStrategies().filter(s => s.id !== id);
    this.saveStrategies(strategies);
  }

  // Chat history storage (SessionStorage) with size limiting
  saveChatHistory(messages: ChatMessage[]): void {
    // Limit chat history size to prevent storage overflow
    const limitedHistory = messages.slice(-this.MAX_CHAT_HISTORY_SIZE);
    
    // Remove large content from old messages to save space
    const compactHistory = limitedHistory.map((msg, index) => {
      if (index < limitedHistory.length - 10) { // Keep last 10 messages full
        return {
          ...msg,
          content: msg.content.length > 500 ? msg.content.substring(0, 500) + '...' : msg.content
        };
      }
      return msg;
    });
    
    this.saveToSession('chat_history', {
      messages: compactHistory,
      timestamp: Date.now()
    });
  }

  getChatHistory(): ChatMessage[] {
    const stored = this.getFromSession<{ messages: ChatMessage[]; timestamp: number } | ChatMessage[]>('chat_history');
    
    // Handle both old and new format
    if (Array.isArray(stored)) {
      return stored; // Old format
    }
    
    return stored?.messages || []; // New format
  }

  // User preferences
  savePreferences(prefs: Record<string, unknown>): void {
    this.saveToLocal('user_preferences', prefs);
  }

  getPreferences(): Record<string, unknown> {
    return this.getFromLocal<Record<string, unknown>>('user_preferences') || {
      slippageTolerance: 0.5,
      gasPreference: 'standard',
      theme: 'dark',
      notifications: true,
    };
  }

  // Cleanup methods
  private clearOldLocalData(): void {
    const keysToCheck = ['old_transactions', 'temp_data'];
    keysToCheck.forEach(key => {
      localStorage.removeItem(key);
    });
  }

  private clearOldSessionData(): void {
    try {
      const cutoffTime = Date.now() - (60 * 60 * 1000); // 1 hour ago
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith('chat_') || key?.startsWith('analysis_')) {
          try {
            const data = sessionStorage.getItem(key);
            if (data) {
              const parsed = this.safeParse(data) as { timestamp?: number };
              if (parsed.timestamp && parsed.timestamp < cutoffTime) {
                keysToRemove.push(key);
              }
            }
          } catch {
            // If we can't parse it, it's corrupted, remove it
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
      console.log(`Cleared ${keysToRemove.length} old session storage items`);
    } catch (e) {
      console.error('Failed to clear old session data:', e);
    }
  }

  // Clear large session data items to free up space
  private clearLargeSessionData(): void {
    try {
      const itemSizes: Array<{ key: string; size: number }> = [];
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          const value = sessionStorage.getItem(key);
          if (value) {
            itemSizes.push({ key, size: value.length });
          }
        }
      }
      
      // Sort by size (largest first) and remove the largest items
      itemSizes.sort((a, b) => b.size - a.size);
      const itemsToRemove = itemSizes.slice(0, Math.ceil(itemSizes.length * 0.3)); // Remove 30% of largest items
      
      itemsToRemove.forEach(item => {
        sessionStorage.removeItem(item.key);
      });
      
      console.log(`Cleared ${itemsToRemove.length} large session storage items`);
    } catch (e) {
      console.error('Failed to clear large session data:', e);
    }
  }

  // Storage size monitoring
  getStorageSize(): { local: number; session: number } {
    let localSize = 0;
    let sessionSize = 0;

    // Calculate LocalStorage size
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        localSize += localStorage[key].length + key.length;
      }
    }

    // Calculate SessionStorage size
    for (const key in sessionStorage) {
      if (sessionStorage.hasOwnProperty(key)) {
        sessionSize += sessionStorage[key].length + key.length;
      }
    }

    return {
      local: localSize,
      session: sessionSize
    };
  }

  // Clear all storage
  clearAll(): void {
    localStorage.clear();
    sessionStorage.clear();
  }
}