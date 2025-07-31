import { StorageManager, ChatMessage } from '@/lib/storage/storage-manager';
import { BridgeRoute, Token } from '@/types/bridge';
import { fusionAPI } from './1inch-fusion';

export interface ChatContext {
  currentRoute?: BridgeRoute;
  tokens?: Token[];
  recentTransactions?: unknown[];
  marketConditions?: unknown;
}

export class AIChatService {
  private static instance: AIChatService;
  private storage: StorageManager;
  private context: ChatContext = {};

  static getInstance(): AIChatService {
    if (!AIChatService.instance) {
      AIChatService.instance = new AIChatService();
    }
    return AIChatService.instance;
  }

  private constructor() {
    this.storage = StorageManager.getInstance();
  }

  async sendMessage(message: string, context?: ChatContext): Promise<string> {
    try {
      // Update context if provided
      if (context) {
        this.context = { ...this.context, ...context };
      }

      // Prepare messages for OpenAI
      const systemPrompt = this.buildSystemPrompt();
      const messages = [
        { role: 'system', content: systemPrompt },
        ...this.getChatHistory().map(m => ({
          role: m.role,
          content: m.content
        })),
        { role: 'user', content: message }
      ];

      // Call OpenAI through proxy
      const response = await fetch('/api/proxy/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      // Save to chat history
      this.saveChatMessage('user', message);
      this.saveChatMessage('assistant', aiResponse);

      return aiResponse;
    } catch (error) {
      console.error('AI chat error:', error);
      return 'I apologize, but I encountered an error processing your request. Please try again.';
    }
  }

  private buildSystemPrompt(): string {
    return `You are an expert DeFi trading assistant specializing in 1inch Fusion+ protocol and cross-chain swaps. 
    You help users understand routing decisions, gas optimization, and trading strategies.
    
    Current context:
    - User is using an intelligent router for cross-chain swaps
    - The system uses 1inch Fusion+ for optimal routing
    - You have access to real-time market data and routing information
    
    ${this.context.currentRoute ? `Current route: ${JSON.stringify(this.context.currentRoute)}` : ''}
    
    Guidelines:
    - Explain routing decisions in simple terms
    - Provide actionable insights about gas optimization
    - Help users understand slippage and MEV protection
    - Answer questions about 1inch Fusion+ features
    - Suggest optimal trading times based on network conditions
    - Be concise and practical in your responses`;
  }

  async explainRoute(route: BridgeRoute): Promise<string> {
    const prompt = `Explain this routing decision in simple terms: 
    From: ${route.from.symbol} on ${route.from.network}
    To: ${route.to.symbol} on ${route.to.network}
    Direct route: ${route.from.symbol} → ${route.to.symbol}
    Estimated time: ${route.estimatedTime.minutes} minutes
    Total fees: $${(route.fees.network.amountUSD + route.fees.protocol.amountUSD).toFixed(2)}
    
    Why was this route chosen? What are the benefits?`;

    this.context.currentRoute = route;
    return this.sendMessage(prompt);
  }

  async suggestOptimalTiming(fromToken: Token, toToken: Token): Promise<string> {
    const prompt = `Based on current network conditions and historical patterns, when would be the optimal time to swap ${fromToken.symbol} to ${toToken.symbol}? Consider gas prices, network congestion, and typical trading patterns.`;
    
    return this.sendMessage(prompt);
  }

  async explainSlippage(amount: string, fromToken: Token, toToken: Token): Promise<string> {
    const prompt = `I want to swap ${amount} ${fromToken.symbol} to ${toToken.symbol}. What slippage tolerance should I set and why? How does 1inch Fusion+ protect against MEV?`;
    
    return this.sendMessage(prompt);
  }

  async getGasOptimizationTips(): Promise<string> {
    const prompt = `What are the best practices for gas optimization when using 1inch Fusion+ for cross-chain swaps? Include specific tips for the current network conditions.`;
    
    return this.sendMessage(prompt);
  }

  async analyzeTradingStrategy(strategy: string): Promise<string> {
    const prompt = `Analyze this trading strategy and provide suggestions for improvement: ${strategy}. How can I implement this effectively using 1inch Fusion+?`;
    
    return this.sendMessage(prompt);
  }

  private saveChatMessage(role: 'user' | 'assistant', content: string): void {
    const history = this.getChatHistory();
    const message: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role,
      content,
      timestamp: Date.now(),
      metadata: {
        route: this.context.currentRoute as unknown as Record<string, unknown>,
        tokens: this.context.tokens as unknown as Array<Record<string, unknown>>
      }
    };
    
    history.push(message);
    this.storage.saveChatHistory(history);
  }

  getChatHistory(): ChatMessage[] {
    return this.storage.getChatHistory();
  }

  clearChatHistory(): void {
    this.storage.saveChatHistory([]);
    this.context = {};
  }

  // Knowledge base responses for common questions
  async answerFusionQuestion(question: string): Promise<string> {
    const fusionKnowledge = {
      'what is fusion': '1inch Fusion+ is an intent-based cross-chain swap protocol that enables gas-free, secure swaps across multiple blockchains without traditional bridges.',
      'how does fusion work': 'Fusion+ uses resolvers who compete in a Dutch auction to fill your order at the best price. You sign an intent, and resolvers handle the execution.',
      'is fusion safe': 'Yes, Fusion+ is non-custodial and uses atomic swaps. You maintain control of your assets throughout the process.',
      'fusion vs bridge': 'Unlike bridges, Fusion+ doesn\'t lock assets in smart contracts. It uses atomic swaps for direct peer-to-peer exchanges, eliminating bridge risks.',
      'fusion fees': 'Fusion+ has no protocol fees. You only pay network gas fees, which are often covered by resolvers in exchange for a small spread.',
    };

    const lowerQuestion = question.toLowerCase();
    for (const [key, answer] of Object.entries(fusionKnowledge)) {
      if (lowerQuestion.includes(key)) {
        return answer;
      }
    }

    // If no direct match, use AI for comprehensive answer
    return this.sendMessage(question);
  }
}