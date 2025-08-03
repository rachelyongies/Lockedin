// HTTP Connection Manager for Performance Optimization
import * as http from 'http';
import * as https from 'https';

export class HttpConnectionManager {
  private static instance: HttpConnectionManager;
  private agents = new Map<string, http.Agent | https.Agent>();
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
        'User-Agent': 'UniteDefi/1.0 (compatible)',
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, optimizedOptions);
      
      // Check if response was successful but had protocol issues
      if (response.status === 200 && response.body) {
        return response;
      }
      
      return response;
    } catch (error) {
      // Handle HTTP/2 protocol errors by retrying with a simpler request
      if (error instanceof TypeError && 
          (error.message.includes('ERR_HTTP2_PROTOCOL_ERROR') || 
           error.message.includes('Failed to fetch'))) {
        
        console.warn(`🔄 HTTP/2 error detected for ${url}, retrying with fallback options`);
        
        // Retry without keep-alive and with simpler headers
        const fallbackOptions: RequestInit = {
          ...options,
          keepalive: false,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; UniteDefi/1.0)',
            ...options.headers
          }
        };
        
        return fetch(url, fallbackOptions);
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  private async serverFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const urlObj = new URL(url);
    const agent = this.agents.get(urlObj.protocol);

    const optimizedOptions: RequestInit = {
      ...options,
      // @ts-expect-error - Node.js specific
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

    const stats: Record<string, unknown> = { environment: 'server', connectionPooling: true };
    
    for (const [protocol, agent] of this.agents) {
      if (agent) {
        stats[protocol] = {
          totalSocketCount: (agent as unknown as Record<string, unknown>).totalSocketCount as number || 0,
          freeSocketCount: Object.keys((agent as unknown as Record<string, unknown>).freeSockets as Record<string, unknown> || {}).length,
          socketsCount: Object.keys((agent as unknown as Record<string, unknown>).sockets as Record<string, unknown> || {}).length
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
      ...baseOptions
    };
  }

  async get(url: string, options: RequestInit = {}): Promise<Response> {
    const fetchFn = this.connectionManager.getOptimizedFetch();
    
    try {
      const response = await fetchFn(url, {
        method: 'GET',
        ...this.baseOptions,
        ...options
      });
      
      return response;
    } catch (error) {
      // Log the error for debugging but still throw it for handling upstream
      console.warn(`🔴 API request failed for ${url}:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  async post(url: string, data: unknown, options: RequestInit = {}): Promise<Response> {
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