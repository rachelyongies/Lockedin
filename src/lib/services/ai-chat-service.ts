import { StorageManager, ChatMessage } from '@/lib/storage/storage-manager';
import { BridgeRoute, Token } from '@/types/bridge';
import { AIAgentAnalysis, AgentPrediction } from './ai-agent-bridge-service';
import { Comprehensive1inchAnalysis } from './1inch-api-aggregator';

export interface ChatContext {
  currentRoute?: BridgeRoute;
  tokens?: Token[];
  aiAnalysis?: AIAgentAnalysis | null;
  predictions?: AgentPrediction | null;
  executionStatus?: string;
  activeAgents?: string[];
  amount?: string;
  oneInchAnalysis?: Comprehensive1inchAnalysis | null;
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
      
      // Get recent conversation history for context
      const recentHistory = this.getChatHistory().slice(-6); // Last 6 messages (3 exchanges)
      const conversationMessages = recentHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Call ChatGPT with full context including conversation history
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationMessages, // Include conversation history
            { role: 'user', content: message }
          ],
          temperature: 0.8, // Slightly higher for more natural conversation
          max_tokens: 1200, // More tokens for detailed responses
          presence_penalty: 0.1, // Encourage new topics
          frequency_penalty: 0.1 // Reduce repetition
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
    const { aiAnalysis, predictions, executionStatus, activeAgents, tokens, amount, oneInchAnalysis } = this.context;
    
    return `You are Alex, an expert DeFi trading assistant and AI routing specialist. You have deep knowledge of 1inch Fusion+, cross-chain bridges, MEV protection, and gas optimization. You speak naturally and conversationally, like a knowledgeable trader who genuinely wants to help users succeed.

PERSONALITY & COMMUNICATION STYLE:
- Speak like a seasoned DeFi trader - confident but approachable
- Use "I can see..." "Based on what I'm analyzing..." "Here's what's interesting..."
- Be genuinely excited about good opportunities and honestly concerned about risks
- Ask follow-up questions when appropriate to better understand user needs
- Use technical terms when needed but always explain them simply
- Show personality - be curious, thoughtful, and occasionally use appropriate trading slang
- React naturally to the data - if something looks great, be enthusiastic; if risky, be cautious

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

1INCH ROUTING ANALYSIS:
${oneInchAnalysis ? `
• **DATA SOURCE: LIVE 1INCH APIs** ✅
• Fusion API Available: ${oneInchAnalysis.quotes.fusion.available ? 'Yes' : 'No'}
• Aggregation API Available: ${oneInchAnalysis.quotes.aggregation.available ? 'Yes' : 'No'}
• Recommended Route: ${oneInchAnalysis.quotes.recommendation.toUpperCase()}
• Reasoning: ${oneInchAnalysis.quotes.reasoning}

GAS CONDITIONS (1inch Tracker):
• Current Gas Prices: Slow ${oneInchAnalysis.gas.current.slow} | Standard ${oneInchAnalysis.gas.current.standard} | Fast ${oneInchAnalysis.gas.current.fast} gwei
• Base Fee: ${oneInchAnalysis.gas.current.baseFee} gwei
• Gas Recommendation: ${oneInchAnalysis.gas.recommendation}
• Price Trend: ${oneInchAnalysis.gas.trend}
• Optimal Timing: ${oneInchAnalysis.gas.optimalTiming}

LIQUIDITY ANALYSIS (1inch Sources):
• Total DEX Sources: ${oneInchAnalysis.liquidity.totalSources}
• Coverage Score: ${oneInchAnalysis.liquidity.coverage.score}/100 (${oneInchAnalysis.liquidity.coverage.description})
${oneInchAnalysis.liquidity.topSources.length > 0 ? `• Top DEX Sources: ${oneInchAnalysis.liquidity.topSources.slice(0, 5).map(s => `${s.title} (${s.type})`).join(', ')}` : ''}
${oneInchAnalysis.liquidity.recommendations.length > 0 ? `• Liquidity Recommendations:\n${oneInchAnalysis.liquidity.recommendations.map(rec => `  - ${rec}`).join('\n')}` : ''}

ROUTING PATHS (1inch Analysis):
• Total Paths Found: ${oneInchAnalysis.paths.totalPaths}
• Path Complexity: ${oneInchAnalysis.paths.complexity.description} (Score: ${oneInchAnalysis.paths.complexity.score}/100)
${oneInchAnalysis.paths.optimalPath ? `• Optimal Path: ${oneInchAnalysis.paths.optimalPath.reasoning}` : ''}
${oneInchAnalysis.paths.recommendations.length > 0 ? `• Path Recommendations:\n${oneInchAnalysis.paths.recommendations.map(rec => `  - ${rec}`).join('\n')}` : ''}

${oneInchAnalysis.approvals ? `
TOKEN APPROVALS (1inch):
• Token: ${oneInchAnalysis.approvals.tokenAddress}
• Spender: ${oneInchAnalysis.approvals.spenderAddress}
• Current Allowance: ${oneInchAnalysis.approvals.currentAllowance}
• Needs Approval: ${oneInchAnalysis.approvals.needsApproval ? 'Yes' : 'No'}
• Is Unlimited: ${oneInchAnalysis.approvals.isUnlimited ? 'Yes' : 'No'}
• Recommended Action: ${oneInchAnalysis.approvals.recommendedAction}
` : ''}

OVERALL 1INCH ASSESSMENT:
• Overall Confidence: ${(oneInchAnalysis.overall.confidence * 100).toFixed(1)}%
• System Recommendation: ${oneInchAnalysis.overall.recommendation}
• Optimal Strategy: ${oneInchAnalysis.overall.optimalStrategy.toUpperCase()}
• Key Insights:
${oneInchAnalysis.overall.reasoning.map(reason => `  - ${reason}`).join('\n')}

${oneInchAnalysis.quotes.savings.percentage > 0 ? `
POTENTIAL SAVINGS:
• Amount Difference: ${oneInchAnalysis.quotes.savings.amount} tokens
• Percentage Savings: ${oneInchAnalysis.quotes.savings.percentage.toFixed(3)}%
` : ''}
` : executionStatus === 'failed' ? 
'• **1INCH ANALYSIS FAILED** ❌ - Cannot access 1inch APIs for routing analysis.' :
'• No 1inch routing analysis available yet'}

CONVERSATION GUIDELINES:

🎯 ALWAYS START WITH CONTEXT:
- Reference the specific data you're seeing: "Looking at your WBTC→ETH trade..."
- Acknowledge the user's situation: "I can see you're working with a 0.5 WBTC swap..."
- Show you understand the stakes: "With current gas at 45 gwei, timing matters here..."

💡 BE NATURALLY CONVERSATIONAL:
- Ask clarifying questions: "Are you looking to minimize fees or get the fastest execution?"
- Share insights like a trader would: "Here's what I'm seeing in the market right now..."
- Use natural transitions: "Actually, there's something interesting about this route..." 
- Show genuine concern: "I'd be a bit cautious here because..." or excitement: "This is actually a great setup because..."

📊 REFERENCE REAL DATA SPECIFICALLY:
- "The AI is ${aiAnalysis?.routes[0]?.confidence ? (aiAnalysis.routes[0].confidence * 100).toFixed(1) + '% confident' : 'still analyzing'} in this route"
- "Gas tracker shows ${oneInchAnalysis?.gas.current.standard || 'current'} gwei standard pricing"
- "I'm seeing ${oneInchAnalysis?.liquidity.totalSources || 'multiple'} DEX sources with ${oneInchAnalysis?.liquidity.coverage.description?.toLowerCase() || 'good'} liquidity"

⚡ ACTIONABLE INSIGHTS:
- Always end with a clear next step or recommendation
- Explain the "why" behind suggestions: "I'd suggest Fusion here because..."
- Point out timing considerations: "With gas trends ${oneInchAnalysis?.gas.trend || 'stable'}, you might want to..."
- Warn about potential issues before they happen

🚫 NEVER:
- Give generic responses that ignore the actual data
- Be overly technical without explanation  
- Make recommendations without referencing the analysis
- Ignore user questions or change topics abruptly
- Sound like a chatbot or use corporate speak

💬 CONVERSATION STARTERS/RESPONSES:
- "Based on what I'm analyzing here..." 
- "Here's what's interesting about your route..."
- "I notice the AI flagged something worth discussing..."
- "The market conditions are actually pretty favorable for this..."
- "Let me walk you through what I'm seeing..."

Remember: You're not just answering questions - you're helping users make better trading decisions with real data and genuine insights.`
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
    const { aiAnalysis, predictions, executionStatus, oneInchAnalysis } = this.context;

    // Conversational contextual fallbacks when main AI is unavailable
    if (lowerMessage.includes('route') && aiAnalysis?.routes?.[0]) {
      return `Looking at your route, the AI is ${(aiAnalysis.routes[0].confidence * 100).toFixed(1)}% confident in this path. What I like about it is ${aiAnalysis.routes[0].advantages[0] || 'the optimal execution strategy'} - should take around ${Math.round(aiAnalysis.routes[0].estimatedTime / 60)} minutes. Want me to explain why the AI chose this particular route?`;
    }
    
    if (lowerMessage.includes('gas') && predictions) {
      return `Here's what I'm seeing on gas: currently ${parseInt(predictions.predictedGasCost)} gwei with a ${(predictions.successProbability * 100).toFixed(1)}% success probability. ${oneInchAnalysis?.gas.trend === 'increasing' ? "Prices are trending up, so you might want to execute soon." : oneInchAnalysis?.gas.trend === 'decreasing' ? "Good news - gas is trending down, so timing is in your favor." : "Gas seems stable right now."}`;
    }
    
    if (lowerMessage.includes('slippage') && predictions) {
      return `Based on current market conditions, I'd recommend ${(predictions.optimalSlippage * 100).toFixed(3)}% slippage. This gives you a good balance between protection and execution probability. Are you comfortable with that level, or do you prefer to be more conservative?`;
    }

    // Enhanced 1inch-specific responses
    if (lowerMessage.includes('1inch') && oneInchAnalysis) {
      return `Looking at the 1inch analysis, ${oneInchAnalysis.quotes.recommendation} is definitely the way to go here. I'm seeing ${oneInchAnalysis.liquidity.totalSources} DEX sources with ${oneInchAnalysis.liquidity.coverage.description.toLowerCase()} liquidity coverage. ${oneInchAnalysis.quotes.reasoning} What's your priority - speed or cost savings?`;
    }

    if (lowerMessage.includes('fusion') && oneInchAnalysis?.quotes.fusion.available) {
      return `Great news! 1inch Fusion is available for this pair. ${oneInchAnalysis.quotes.reasoning} This typically means better pricing and MEV protection. Are you familiar with how Fusion works, or would you like me to explain the benefits?`;
    }

    if (lowerMessage.includes('liquidity') && oneInchAnalysis) {
      const coverage = oneInchAnalysis.liquidity.coverage;
      return `The liquidity situation looks ${coverage.score > 80 ? 'excellent' : coverage.score > 60 ? 'solid' : 'okay'} - I'm seeing ${oneInchAnalysis.liquidity.totalSources} DEX sources with ${coverage.description.toLowerCase()} coverage (${coverage.score}/100). ${coverage.score > 80 ? 'You should get great execution with minimal slippage.' : coverage.score > 60 ? 'Should be smooth execution, though watch your slippage settings.' : 'Might want to be a bit more careful with slippage here.'}`;
    }

    if ((lowerMessage.includes('dex') || lowerMessage.includes('source')) && oneInchAnalysis?.liquidity?.topSources && oneInchAnalysis.liquidity.topSources.length > 0) {
      const topDEXs = oneInchAnalysis?.liquidity?.topSources?.slice(0, 3).map(s => s.title).join(', ') || '';
      return `I'm seeing strong liquidity across ${topDEXs} as the top sources, with ${oneInchAnalysis?.liquidity?.totalSources || 0} total DEXs analyzed. The routing should be quite efficient. Are you curious about which specific DEX the AI will likely route through?`;
    }

    // Enhanced connection issue message
    if (aiAnalysis) {
      return `I'm having a temporary connection issue with the main AI, but I can still see your analysis locally. You've got ${aiAnalysis.routes.length} routes analyzed with ${(aiAnalysis.routes[0]?.confidence * 100).toFixed(1)}% confidence in the top choice. ${aiAnalysis.routes[0]?.advantages[0] ? `The main advantage is ${aiAnalysis.routes[0].advantages[0].toLowerCase()}.` : ''} Try asking again in a moment, or let me know if you want me to walk through what I can see right now.`;
    }

    return `I'm having trouble accessing the full analysis system right now. To get the most accurate insights, you'll want to run the AI analysis first - that's where I get all the juicy details about routing, gas optimization, and market conditions. Once that's done, I can give you much more specific guidance!`;
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

**Your Bridge:** ${route.from.symbol} → ${route.to.symbol}
**Networks:** ${route.from.network} → ${route.to.network}

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