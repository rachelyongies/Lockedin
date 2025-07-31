'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Send, 
  X, 
  Bot, 
  Sparkles,
  TrendingUp,
  Clock,
  Shield,
  HelpCircle,
  RefreshCw,
  Zap
} from 'lucide-react';
import { AIChatService } from '@/lib/services/ai-chat-service';
import { StorageManager } from '@/lib/storage/storage-manager';
import { Token, BridgeRoute } from '@/types/bridge';
import { cn } from '@/lib/utils/helpers';

interface TradingCompanionProps {
  currentRoute?: BridgeRoute;
  fromToken?: Token;
  toToken?: Token;
  amount?: string;
}

export function TradingCompanion({ 
  currentRoute, 
  fromToken, 
  toToken, 
  amount 
}: TradingCompanionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>>([]);

  const chatService = AIChatService.getInstance();
  const storage = StorageManager.getInstance();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load chat history on mount
    setChatHistory(chatService.getChatHistory());
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = message;
    setMessage('');
    setIsTyping(true);

    // Add user message to UI immediately
    const newUserMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user' as const,
      content: userMessage,
      timestamp: Date.now()
    };
    setChatHistory(prev => [...prev, newUserMessage]);

    try {
      // Send message with context
      const response = await chatService.sendMessage(userMessage, {
        currentRoute,
        tokens: fromToken && toToken ? [fromToken, toToken] : undefined
      });

      // Add AI response to UI
      const newAssistantMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant' as const,
        content: response,
        timestamp: Date.now()
      };
      setChatHistory(prev => [...prev, newAssistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    setIsTyping(true);
    try {
      let response = '';
      
      switch (action) {
        case 'explain_route':
          if (currentRoute) {
            response = await chatService.explainRoute(currentRoute);
          } else {
            response = 'Please select a route first to get an explanation.';
          }
          break;
        
        case 'optimal_timing':
          if (fromToken && toToken) {
            response = await chatService.suggestOptimalTiming(fromToken, toToken);
          } else {
            response = 'Please select tokens first to get timing suggestions.';
          }
          break;
        
        case 'gas_tips':
          response = await chatService.getGasOptimizationTips();
          break;
        
        case 'slippage':
          if (amount && fromToken && toToken) {
            response = await chatService.explainSlippage(amount, fromToken, toToken);
          } else {
            response = 'Please enter an amount and select tokens to get slippage recommendations.';
          }
          break;
        
        case 'fusion_info':
          response = await chatService.answerFusionQuestion('what is fusion and how does it work?');
          break;
      }

      // Add quick action as user message
      const actionLabels: Record<string, string> = {
        explain_route: 'Explain current route',
        optimal_timing: 'When should I trade?',
        gas_tips: 'Gas optimization tips',
        slippage: 'Recommended slippage',
        fusion_info: 'What is 1inch Fusion+?'
      };

      const userMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'user' as const,
        content: actionLabels[action] || action,
        timestamp: Date.now()
      };
      setChatHistory(prev => [...prev, userMessage]);

      // Add AI response
      const assistantMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant' as const,
        content: response,
        timestamp: Date.now()
      };
      setChatHistory(prev => [...prev, assistantMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    chatService.clearChatHistory();
    setChatHistory([]);
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 w-14 h-14 rounded-full",
          "bg-gradient-to-r from-blue-500 to-purple-500",
          "flex items-center justify-center shadow-lg z-40",
          "hover:shadow-xl transition-shadow"
        )}
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 h-[600px] bg-gray-900 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-800"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Bot className="w-8 h-8 text-blue-400" />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
                    />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">AI Trading Companion</h3>
                    <p className="text-gray-400 text-xs">Powered by GPT-4 & 1inch Fusion+</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick actions */}
            <div className="p-3 border-b border-gray-800">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleQuickAction('explain_route')}
                  disabled={!currentRoute}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    "bg-gray-800 hover:bg-gray-700",
                    !currentRoute && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Zap className="w-3 h-3 inline mr-1" />
                  Explain Route
                </button>
                <button
                  onClick={() => handleQuickAction('optimal_timing')}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-800 hover:bg-gray-700 transition-all"
                >
                  <Clock className="w-3 h-3 inline mr-1" />
                  Best Time
                </button>
                <button
                  onClick={() => handleQuickAction('gas_tips')}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-800 hover:bg-gray-700 transition-all"
                >
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  Gas Tips
                </button>
                <button
                  onClick={() => handleQuickAction('slippage')}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-800 hover:bg-gray-700 transition-all"
                >
                  <Shield className="w-3 h-3 inline mr-1" />
                  Slippage
                </button>
                <button
                  onClick={() => handleQuickAction('fusion_info')}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-800 hover:bg-gray-700 transition-all"
                >
                  <HelpCircle className="w-3 h-3 inline mr-1" />
                  Fusion+
                </button>
              </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center text-gray-400 mt-8">
                  <Sparkles className="w-8 h-8 mx-auto mb-3 text-gray-600" />
                  <p className="text-sm">Hi! I&apos;m your AI trading companion.</p>
                  <p className="text-xs mt-2">Ask me about routes, gas optimization, or 1inch Fusion+!</p>
                </div>
              )}

              {chatHistory.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex",
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5",
                      msg.role === 'user'
                        ? "bg-blue-500 text-white"
                        : "bg-gray-800 text-gray-100"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-gray-800 rounded-2xl px-4 py-3">
                    <div className="flex space-x-2">
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="p-4 border-t border-gray-800">
              <div className="flex items-center space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask about routes, gas, or strategies..."
                  className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isTyping}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isTyping}
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    message.trim() && !isTyping
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-500 cursor-not-allowed"
                  )}
                >
                  <Send className="w-4 h-4" />
                </button>
                <button
                  onClick={clearChat}
                  className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all"
                  title="Clear chat"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}