// HTTP Connection Manager for Performance Optimization
export class HttpConnectionManager {
  private static instance: HttpConnectionManager;
  private agents = new Map<string, any>();
  private defaultOptions = {
    keepAlive: true,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 30000,
    freeSocketTimeout: 30000,
    maxTotalSockets: 100
  };

  private constructor() {
    // Initialize for both HTTP and HTTPS
    if (typeof window === 'undefined') {
      // Server-side only
      const http = require('http');
      const https = require('https');
      
      this.agents.set('http:', new http.Agent(this.defaultOptions));
      this.agents.set('https:', new https.Agent(this.defaultOptions));
    }
  }

  static getInstance(): HttpConnectionManager {
    if (!HttpConnectionManager.instance) {
      HttpConnectionManager.instance = new HttpConnectionManager();
    }
    return HttpConnectionManager.instance;
  }

  // Get optimized fetch function with connection pooling
  getOptimizedFetch() {
    if (typeof window !== 'undefined') {
      // Browser environment - use native fetch
      return this.browserFetch.bind(this);
    } else {
      // Server environment - use connection pooling
      return this.serverFetch.bind(this);
    }
  }

  private async browserFetch(url: string, options: RequestInit = {}): Promise<Response> {
    // Browser optimization - add connection hints
    const optimizedOptions: RequestInit = {
      ...options,
      keepalive: true,
      headers: {
        'Connection': 'keep-alive',
        ...options.headers
      }
    };

    return fetch(url, optimizedOptions);
  }

  private async serverFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const urlObj = new URL(url);
    const agent = this.agents.get(urlObj.protocol);

    const optimizedOptions: RequestInit = {
      ...options,
      // @ts-ignore - Node.js specific
      agent,
      headers: {
        'Connection': 'keep-alive',
        'Accept-Encoding': 'gzip, deflate',
        ...options.headers
      }
    };

    return fetch(url, optimizedOptions);
  }

  // Batch multiple requests with connection reuse
  async batchFetch(requests: Array<{ url: string; options?: RequestInit }>): Promise<Response[]> {
    const fetchFn = this.getOptimizedFetch();
    
    return Promise.all(
      requests.map(req => fetchFn(req.url, req.options))
    );
  }

  // Get connection statistics
  getStats() {
    if (typeof window !== 'undefined') {
      return { environment: 'browser', connectionPooling: false };
    }

    const stats: any = { environment: 'server', connectionPooling: true };
    
    for (const [protocol, agent] of this.agents) {
      if (agent && typeof agent.getCurrentSocket === 'function') {
        stats[protocol] = {
          totalSocketCount: agent.totalSocketCount || 0,
          freeSocketCount: Object.keys(agent.freeSockets || {}).length,
          socketsCount: Object.keys(agent.sockets || {}).length
        };
      }
    }

    return stats;
  }

  // Cleanup connections
  destroy() {
    for (const [_, agent] of this.agents) {
      if (agent && typeof agent.destroy === 'function') {
        agent.destroy();
      }
    }
    this.agents.clear();
  }
}

// Optimized fetch wrapper for external APIs
export class OptimizedApiClient {
  private connectionManager: HttpConnectionManager;
  private baseOptions: RequestInit;

  constructor(baseOptions: RequestInit = {}) {
    this.connectionManager = HttpConnectionManager.getInstance();
    this.baseOptions = {
      timeout: 30000,
      ...baseOptions
    };
  }

  async get(url: string, options: RequestInit = {}): Promise<Response> {
    const fetchFn = this.connectionManager.getOptimizedFetch();
    return fetchFn(url, {
      method: 'GET',
      ...this.baseOptions,
      ...options
    });
  }

  async post(url: string, data: any, options: RequestInit = {}): Promise<Response> {
    const fetchFn = this.connectionManager.getOptimizedFetch();
    return fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.baseOptions.headers,
        ...options.headers
      },
      body: JSON.stringify(data),
      ...this.baseOptions,
      ...options
    });
  }

  // Batch multiple API calls efficiently
  async batchGet(urls: string[], options: RequestInit = {}): Promise<Response[]> {
    const requests = urls.map(url => ({
      url,
      options: { method: 'GET', ...this.baseOptions, ...options }
    }));

    return this.connectionManager.batchFetch(requests);
  }
}

// Specialized clients for different APIs
export const ApiClients = {
  coingecko: new OptimizedApiClient({
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'UniteDefi/1.0'
    }
  }),
  
  defillama: new OptimizedApiClient({
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'UniteDefi/1.0'
    }
  }),
  
  oneInch: new OptimizedApiClient({
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_1INCH_API_KEY || ''}`
    }
  })
};