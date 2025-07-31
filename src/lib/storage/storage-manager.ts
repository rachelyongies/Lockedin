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
  
  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
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
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('SessionStorage save failed:', e);
      this.clearOldSessionData();
      try {
        sessionStorage.setItem(key, JSON.stringify(data));
      } catch {
        throw new Error('Session storage quota exceeded');
      }
    }
  }

  getFromSession<T>(key: string): T | null {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error('SessionStorage read failed:', e);
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

  // Chat history storage (SessionStorage)
  saveChatHistory(messages: ChatMessage[]): void {
    // Keep only last 100 messages to save space
    const recentMessages = messages.slice(-100);
    this.saveToSession('chat_history', recentMessages);
  }

  getChatHistory(): ChatMessage[] {
    return this.getFromSession<ChatMessage[]>('chat_history') || [];
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
    const keysToCheck = ['temp_calculations', 'old_chat'];
    keysToCheck.forEach(key => {
      sessionStorage.removeItem(key);
    });
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