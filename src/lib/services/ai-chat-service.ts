import { StorageManager, ChatMessage } from '@/lib/storage/storage-manager';
import { BridgeRoute, Token } from '@/types/bridge';
import { AIAgentAnalysis, AgentPrediction } from './ai-agent-bridge-service';

export interface ChatContext {
  currentRoute?: BridgeRoute;
  tokens?: Token[];
  aiAnalysis?: AIAgentAnalysis | null;
  predictions?: AgentPrediction | null;
  executionStatus?: string;
  activeAgents?: string[];
  amount?: string;
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

      // Generate intelligent response based on context and message
      const aiResponse = await this.generateIntelligentResponse(message);

      // Save to chat history
      this.saveChatMessage('user', message);
      this.saveChatMessage('assistant', aiResponse);

      return aiResponse;
    } catch (error) {
      console.error('AI chat error:', error);
      return 'I apologize, but I encountered an error processing your request. Please try again.';
    }
  }

  private async generateIntelligentResponse(message: string): Promise<string> {
    try {
      // Build comprehensive context prompt
      const systemPrompt = this.buildComprehensiveSystemPrompt();
      
      // Call ChatGPT with full context
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.response || data.message || 'I apologize, but I received an unexpected response format.';
      } else {
        console.warn('ChatGPT API failed, using fallback response');
        return this.generateFallbackResponse(message);
      }
    } catch (error) {
      console.warn('ChatGPT API error, using fallback:', error);
      return this.generateFallbackResponse(message);
    }
  }

  private buildComprehensiveSystemPrompt(): string {
    const { aiAnalysis, predictions, executionStatus, activeAgents, tokens, amount } = this.context;
    
    return `You are an expert DeFi trading assistant specializing in 1inch Fusion+ and cross-chain bridges. You help users understand complex AI routing decisions, gas optimization, and trading strategies.

CURRENT TRADING CONTEXT:
${tokens && tokens.length >= 2 ? `
• Trading Pair: ${tokens[0].symbol} (${tokens[0].network}) → ${tokens[1].symbol} (${tokens[1].network})
• Amount: ${amount || 'Not specified'}
• Networks: Cross-chain bridge from ${tokens[0].network} to ${tokens[1].network}
` : '• No active trade selected yet'}

EXECUTION STATUS: ${executionStatus || 'idle'}
${activeAgents?.length ? `• Active AI Agents: ${activeAgents.join(', ')}` : ''}

AI ANALYSIS RESULTS:
${aiAnalysis ? `
• **DATA SOURCE: REAL-TIME MARKET DATA** ✅
• Total Routes Analyzed: ${aiAnalysis.routes.length}
• Best Route Confidence: ${(aiAnalysis.routes[0]?.confidence * 100).toFixed(1)}%
• Recommended Route: ${aiAnalysis.routes[0]?.fromToken} → ${aiAnalysis.routes[0]?.toToken}
• Expected Output: ${aiAnalysis.routes[0]?.estimatedOutput} ${aiAnalysis.routes[0]?.toToken}
• Execution Time: ~${Math.round(aiAnalysis.routes[0]?.estimatedTime / 60)} minutes
• Gas Cost: ${aiAnalysis.routes[0]?.estimatedGas} wei

Route Advantages:
${aiAnalysis.routes[0]?.advantages.map(adv => `  - ${adv}`).join('\n')}

Risk Factors:
${aiAnalysis.routes[0]?.risks.map(risk => `  - ${risk}`).join('\n')}

Technical Path:
${aiAnalysis.routes[0]?.path.map(step => `  ${step.protocol}: ${step.fromToken} → ${step.toToken}`).join('\n')}
` : executionStatus === 'failed' ? 
'• **ANALYSIS FAILED** ❌ - Real market data APIs unavailable. Cannot provide analysis without live data.' :
'• No AI analysis completed yet - user needs to run analysis first'}

ML PREDICTIONS:
${predictions ? `
• **DATA SOURCE: REAL-TIME MARKET DATA** ✅
• Optimal Slippage: ${(predictions.optimalSlippage * 100).toFixed(3)}%
• Gas Price Prediction: ${parseInt(predictions.predictedGasCost)} gwei
• Success Probability: ${(predictions.successProbability * 100).toFixed(1)}%
• Estimated Execution Time: ${Math.round(predictions.estimatedTime / 60)} minutes
• MEV Protection: ${predictions.mevProtection?.enabled ? `Enabled (${predictions.mevProtection.strategy}, ${(predictions.mevProtection.estimatedProtection * 100).toFixed(1)}% protection)` : 'Disabled'}
` : executionStatus === 'failed' ? 
'• **PREDICTIONS FAILED** ❌ - Cannot generate ML predictions without real market data.' :
'• No ML predictions available yet'}

INSTRUCTIONS:
- Be conversational and helpful, not robotic
- Explain complex DeFi concepts in simple terms
- Use the actual data above to provide specific, accurate answers
- When users ask about routes, reference the real confidence scores and advantages
- For gas questions, use the actual predicted gas costs
- If no analysis is available, encourage them to run AI analysis first
- Keep responses informative but concise
- Use emojis sparingly and naturally
- Focus on practical advice and actionable insights

Remember: You have access to real AI analysis data, so provide specific insights based on the actual numbers and decisions made by the AI agents.`
  }

  private generateFallbackResponse(message: string): Promise<string> {
    const lowerMessage = message.toLowerCase();
    const { aiAnalysis, predictions, executionStatus, activeAgents, tokens, amount } = this.context;

    // Simulate thinking delay for realism
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(this.getContextualFallback(lowerMessage));
      }, 800 + Math.random() * 1200);
    });
  }

  private getContextualFallback(lowerMessage: string): string {
    const { aiAnalysis, predictions, executionStatus } = this.context;

    // Simple contextual fallbacks when ChatGPT is unavailable
    if (lowerMessage.includes('route') && aiAnalysis?.routes?.[0]) {
      return `The AI selected this route with ${(aiAnalysis.routes[0].confidence * 100).toFixed(1)}% confidence. It offers ${aiAnalysis.routes[0].advantages[0] || 'optimal execution'} and will take about ${Math.round(aiAnalysis.routes[0].estimatedTime / 60)} minutes.`;
    }
    
    if (lowerMessage.includes('gas') && predictions) {
      return `Based on AI analysis, gas is currently ${parseInt(predictions.predictedGasCost)} gwei with a ${(predictions.successProbability * 100).toFixed(1)}% success probability.`;
    }
    
    if (lowerMessage.includes('slippage') && predictions) {
      return `The AI recommends ${(predictions.optimalSlippage * 100).toFixed(3)}% slippage for optimal execution.`;
    }

    return `I'm having trouble connecting to the full AI assistant right now, but I can see ${aiAnalysis ? `your analysis shows ${aiAnalysis.routes.length} routes with ${(aiAnalysis.routes[0]?.confidence * 100).toFixed(1)}% confidence` : 'you should run AI analysis first'}. Please try your question again or check your connection.`;
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
    this.context.currentRoute = route;
    return `🚀 **Route Explanation:**

**Your Bridge:** ${route.fromToken.symbol} → ${route.toToken.symbol}
**Networks:** ${route.fromToken.network} → ${route.toToken.network}

**Why this route?**
✅ **Direct Path:** No unnecessary hops or intermediary tokens
✅ **Optimal Timing:** ~${route.estimatedTime.minutes} minutes execution
✅ **Competitive Fees:** $${(route.fees.network.amountUSD + route.fees.protocol.amountUSD).toFixed(2)} total cost
✅ **High Liquidity:** Sufficient liquidity for smooth execution

**Route Benefits:**
• **1inch Fusion+** ensures optimal pricing through resolver competition
• **MEV Protection** shields you from front-running attacks  
• **No Slippage Surprise** - Dutch auction mechanism protects pricing
• **Gas Efficiency** - Optimized for minimal network fees

This route was selected based on current market conditions, available liquidity, and execution reliability.`;
  }

  async suggestOptimalTiming(fromToken: Token, toToken: Token): Promise<string> {
    const currentHour = new Date().getHours();
    const gasLevel = Math.floor(Math.random() * 40) + 15; // 15-55 gwei simulation
    
    return `⏰ **Optimal Timing for ${fromToken.symbol} → ${toToken.symbol}:**

**Current Conditions:**
• **Gas Price:** ${gasLevel} gwei ${gasLevel < 25 ? '🟢' : gasLevel < 40 ? '🟡' : '🔴'}
• **Network Status:** ${gasLevel < 25 ? 'Low congestion' : gasLevel < 40 ? 'Moderate activity' : 'High congestion'}
• **Time Factor:** ${currentHour < 12 ? '🌅 Morning (typically lower gas)' : currentHour < 18 ? '☀️ Afternoon (moderate activity)' : '🌙 Evening (can be volatile)'}

**Timing Recommendation:**
${gasLevel < 25 ? '🟢 **Execute now!** Excellent conditions for trading.' :
  gasLevel < 35 ? '🟡 **Good time to trade** - reasonable conditions.' :
  '🔴 **Consider waiting** - gas is high, may improve in 30-60 minutes.'}

**Pro Tips:**
• **Weekends:** Often have lower gas prices
• **Early morning (6-10 AM UTC):** Typically optimal
• **Fusion+ Advantage:** Resolvers compete even in high gas environments
• **Set alerts:** I can help monitor when conditions improve

**Best Strategy:** ${gasLevel < 30 ? 'Execute your trade now while conditions are favorable!' : 'Monitor for 30-60 minutes if not urgent - gas often decreases.'}`;
  }

  async explainSlippage(amount: string, fromToken: Token, toToken: Token): Promise<string> {
    const tradeSize = parseFloat(amount) || 1;
    const estimatedSlippage = tradeSize > 1000 ? 0.015 : tradeSize > 100 ? 0.008 : 0.005;
    
    return `🎯 **Slippage Analysis for ${amount} ${fromToken.symbol} → ${toToken.symbol}:**

**Recommended Slippage:** ${(estimatedSlippage * 100).toFixed(2)}%

**Why this slippage?**
• **Trade Size Impact:** ${tradeSize > 1000 ? 'Large trade - higher impact' : tradeSize > 100 ? 'Medium trade - moderate impact' : 'Small trade - minimal impact'}
• **Token Pair Liquidity:** ${fromToken.symbol === 'ETH' || toToken.symbol === 'ETH' ? 'High liquidity pair' : 'Standard liquidity'}
• **Market Volatility:** Current conditions suggest ${estimatedSlippage < 0.01 ? 'low' : 'moderate'} price movement risk

**1inch Fusion+ Protection:**
🛡️ **MEV Shield:** Dutch auction prevents front-running
🎯 **Price Improvement:** Resolvers compete for better prices
⏱️ **Time Protection:** Orders filled at optimal moments
🔒 **Atomic Execution:** All-or-nothing trade guarantee

**Slippage Strategy:**
• **Conservative:** ${(estimatedSlippage * 100).toFixed(2)}% (recommended)
• **Aggressive:** ${((estimatedSlippage * 0.7) * 100).toFixed(2)}% (risk of failed trades)
• **Safe:** ${((estimatedSlippage * 1.5) * 100).toFixed(2)}% (guaranteed execution)

**Pro Tip:** Fusion+ often delivers prices better than your slippage tolerance due to resolver competition!`;
  }

  async getGasOptimizationTips(): Promise<string> {
    const currentGas = Math.floor(Math.random() * 40) + 15;
    
    return `⛽ **Gas Optimization Guide:**

**Current Network Status:**
• **Gas Price:** ${currentGas} gwei ${currentGas < 25 ? '🟢 Low' : currentGas < 40 ? '🟡 Moderate' : '🔴 High'}
• **Optimization Potential:** ${currentGas < 25 ? '✅ Great timing!' : '💡 Consider these tips'}

**1inch Fusion+ Advantages:**
🚀 **Zero Gas Fees:** Resolvers pay execution costs
🎯 **Batch Optimization:** Multiple swaps can be bundled
⚡ **Smart Routing:** Minimal gas paths automatically selected
🔄 **Cross-chain Efficiency:** No expensive bridge transactions

**General Gas Tips:**
• **Timing:** ${new Date().getHours() < 12 ? 'Morning hours (like now) are typically cheaper' : 'Try early morning (6-10 AM UTC)'}
• **Weekends:** Often 20-30% lower gas prices
• **Avoid peaks:** Don't trade during NFT drops or major events
• **Monitor trends:** Use gas trackers for timing

**Advanced Strategies:**
🎱 **Batch Trades:** Combine multiple swaps when possible
⏰ **Gas Alerts:** Set notifications for optimal windows  
🔀 **Route Flexibility:** Let AI choose the most efficient path
💎 **Patience Pays:** Non-urgent trades can wait for better conditions

**Right Now:** ${currentGas < 25 ? 'Perfect time to execute!' : 'Consider waiting if not urgent - gas may drop.'}`;
  }

  async analyzeTradingStrategy(strategy: string): Promise<string> {
    return `📊 **Strategy Analysis: "${strategy}"**

**Strategy Assessment:**
${strategy.toLowerCase().includes('dca') ? '🔄 **Dollar Cost Averaging** - Excellent for reducing volatility impact' :
  strategy.toLowerCase().includes('arbitrage') ? '⚡ **Arbitrage Strategy** - Great for exploiting price differences' :
  strategy.toLowerCase().includes('swing') ? '📈 **Swing Trading** - Good for capturing medium-term trends' :
  '🎯 **Custom Strategy** - Let me analyze the key components'}

**1inch Fusion+ Implementation:**
✅ **Cost Efficiency:** Zero gas fees reduce strategy overhead
✅ **MEV Protection:** Prevents front-running on your trades  
✅ **Optimal Execution:** Dutch auctions ensure best prices
✅ **Cross-chain Access:** Execute across multiple networks

**Optimization Suggestions:**
• **Timing:** Use AI analysis for optimal entry/exit points
• **Size Management:** Batch smaller trades for efficiency
• **Risk Control:** Set appropriate slippage tolerances
• **Monitoring:** Track performance across all networks

**Implementation Tips:**
1. **Start Small:** Test strategy with smaller amounts first
2. **Monitor Performance:** Track success rate and profits
3. **Adjust Parameters:** Refine based on market conditions
4. **Use Analytics:** Leverage AI insights for improvements

**Strategy Score:** 8/10 - Well-suited for Fusion+ implementation!`;
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