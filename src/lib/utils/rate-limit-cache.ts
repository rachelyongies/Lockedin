// Shared rate limiting and caching utilities for 1inch API endpoints

// In-memory cache for API responses
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting
const requestTimes = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 15; // Slightly higher limit

export interface RateLimitResult {
  isLimited: boolean;
  retryAfter?: number;
}

export function checkRateLimit(clientId: string): RateLimitResult {
  const now = Date.now();
  const times = requestTimes.get(clientId) || [];
  
  // Remove old requests outside the window
  const validTimes = times.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (validTimes.length >= MAX_REQUESTS_PER_MINUTE) {
    const oldestTime = Math.min(...validTimes);
    const retryAfter = Math.ceil((oldestTime + RATE_LIMIT_WINDOW - now) / 1000);
    return { isLimited: true, retryAfter };
  }
  
  validTimes.push(now);
  requestTimes.set(clientId, validTimes);
  return { isLimited: false };
}

export function getCachedResponse(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { ...cached.data, cached: true };
  }
  
  // Clean up expired entries
  if (cached && Date.now() - cached.timestamp >= CACHE_DURATION) {
    cache.delete(key);
  }
  
  return null;
}

export function setCachedResponse(key: string, data: any): void {
  cache.set(key, { data: { ...data, cached: false }, timestamp: Date.now() });
}

export function getClientId(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const userAgent = request.headers.get('user-agent') || '';
  
  // Create a more unique identifier combining IP and user agent hash
  const baseId = forwardedFor || realIp || 'default';
  const agentHash = userAgent.slice(0, 10); // Simple hash
  
  return `${baseId}_${agentHash}`;
}

// Clean up old entries periodically
let lastCleanup = 0;
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

export function performCleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  
  // Clean up old rate limit entries
  for (const [clientId, times] of requestTimes.entries()) {
    const validTimes = times.filter(time => now - time < RATE_LIMIT_WINDOW);
    if (validTimes.length === 0) {
      requestTimes.delete(clientId);
    } else {
      requestTimes.set(clientId, validTimes);
    }
  }
  
  // Clean up old cache entries
  for (const [key, cached] of cache.entries()) {
    if (now - cached.timestamp >= CACHE_DURATION) {
      cache.delete(key);
    }
  }
  
  console.log(`🧹 Cleaned up rate limit and cache entries. Active: ${requestTimes.size} clients, ${cache.size} cached responses`);
}