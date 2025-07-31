'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Edit3, 
  Clock, 
  TrendingUp, 
  Activity,
  Zap,
  Shield,
  Bell,
  Upload,
  Download,
  ChevronRight,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { StorageManager, StorageStrategy } from '@/lib/storage/storage-manager';
import { StrategyEngine } from '@/lib/strategies/StrategyEngine';
import { cn } from '@/lib/utils/helpers';

export function StrategyManager() {
  const [strategies, setStrategies] = useState<StorageStrategy[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<StorageStrategy | null>(null);
  const [executions, setExecutions] = useState<Record<string, unknown[]>>({});
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const storage = StorageManager.getInstance();
  const engine = StrategyEngine.getInstance();

  useEffect(() => {
    loadStrategies();
    checkNotificationPermission();
    
    // Set up periodic refresh
    const interval = setInterval(loadExecutions, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadStrategies = () => {
    const savedStrategies = storage.getStrategies();
    setStrategies(savedStrategies);
    
    // Start enabled strategies
    savedStrategies.forEach(strategy => {
      if (strategy.enabled) {
        engine.startStrategy(strategy.id);
      }
    });
  };

  const loadExecutions = () => {
    const executionHistory: Record<string, unknown[]> = {};
    strategies.forEach(strategy => {
      executionHistory[strategy.id] = engine.getExecutionHistory(strategy.id);
    });
    setExecutions(executionHistory);
  };

  const checkNotificationPermission = async () => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await engine.requestNotificationPermission();
    setNotificationsEnabled(granted);
  };

  const toggleStrategy = (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    if (!strategy) return;

    strategy.enabled = !strategy.enabled;
    storage.saveStrategy(strategy);

    if (strategy.enabled) {
      engine.startStrategy(strategyId);
    } else {
      engine.stopStrategy(strategyId);
    }

    loadStrategies();
  };

  const deleteStrategy = (strategyId: string) => {
    engine.stopStrategy(strategyId);
    storage.deleteStrategy(strategyId);
    loadStrategies();
  };

  const exportStrategies = () => {
    const data = JSON.stringify(strategies, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trading-strategies.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importStrategies = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          imported.forEach(strategy => {
            strategy.id = Math.random().toString(36).substr(2, 9);
            strategy.enabled = false;
            storage.saveStrategy(strategy);
          });
          loadStrategies();
        }
      } catch (error) {
        console.error('Failed to import strategies:', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Brain className="w-8 h-8 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Strategy Orchestrator</h2>
              <p className="text-gray-400">Automate your trading with AI-powered strategies</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {!notificationsEnabled && (
              <button
                onClick={handleEnableNotifications}
                className="px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Bell className="w-4 h-4" />
                <span className="text-sm">Enable Notifications</span>
              </button>
            )}
            
            <label className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg cursor-pointer transition-colors flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span className="text-sm">Import</span>
              <input
                type="file"
                accept=".json"
                onChange={importStrategies}
                className="hidden"
              />
            </label>
            
            <button
              onClick={exportStrategies}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">Export</span>
            </button>
            
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Strategy</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Active Strategies</span>
              <Activity className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {strategies.filter(s => s.enabled).length}
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Executions</span>
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {strategies.reduce((sum, s) => sum + s.executionCount, 0)}
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Success Rate</span>
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {calculateSuccessRate()}%
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Notifications</span>
              <Bell className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {notificationsEnabled ? 'On' : 'Off'}
            </p>
          </div>
        </div>
      </div>

      {/* Strategies List */}
      <div className="space-y-4">
        {strategies.length === 0 ? (
          <div className="bg-gray-800/30 rounded-2xl p-12 text-center border border-gray-700/50">
            <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Strategies Yet</h3>
            <p className="text-gray-400 mb-6">Create your first automated trading strategy</p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl transition-all"
            >
              Create Strategy
            </button>
          </div>
        ) : (
          strategies.map((strategy) => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              executions={executions[strategy.id] || []}
              onToggle={() => toggleStrategy(strategy.id)}
              onEdit={() => setEditingStrategy(strategy)}
              onDelete={() => deleteStrategy(strategy.id)}
            />
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {(isCreating || editingStrategy) && (
          <StrategyModal
            strategy={editingStrategy}
            onSave={(strategy) => {
              if (editingStrategy) {
                storage.saveStrategy(strategy);
              } else {
                strategy.id = Math.random().toString(36).substr(2, 9);
                strategy.createdAt = Date.now();
                strategy.executionCount = 0;
                strategy.enabled = false;
                storage.saveStrategy(strategy);
              }
              loadStrategies();
              setIsCreating(false);
              setEditingStrategy(null);
            }}
            onClose={() => {
              setIsCreating(false);
              setEditingStrategy(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );

  function calculateSuccessRate(): number {
    const allExecutions = Object.values(executions).flat();
    if (allExecutions.length === 0) return 100;
    
    const successful = allExecutions.filter(e => (e as { success: boolean }).success).length;
    return Math.round((successful / allExecutions.length) * 100);
  }
}

// Strategy Card Component
function StrategyCard({
  strategy,
  executions,
  onToggle,
  onEdit,
  onDelete
}: {
  strategy: StorageStrategy;
  executions: unknown[];
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const successRate = executions.length > 0
    ? Math.round((executions.filter(e => (e as { success: boolean }).success).length / executions.length) * 100)
    : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggle}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
              strategy.enabled
                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
            )}
          >
            {strategy.enabled ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          
          <div>
            <h3 className="text-lg font-semibold text-white">{strategy.name}</h3>
            <p className="text-sm text-gray-400">
              Created {new Date(strategy.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conditions */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Conditions</h4>
        <div className="flex flex-wrap gap-2">
          {strategy.conditions.price && (
            <div className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-sm">
              {strategy.conditions.price.token} 
              {strategy.conditions.price.above && ` > $${strategy.conditions.price.above}`}
              {strategy.conditions.price.below && ` < $${strategy.conditions.price.below}`}
            </div>
          )}
          {strategy.conditions.time && (
            <div className="px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg text-sm">
              <Clock className="w-3 h-3 inline mr-1" />
              {strategy.conditions.time.interval}
            </div>
          )}
          {strategy.conditions.gas && (
            <div className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-sm">
              Gas &lt; {strategy.conditions.gas.below} gwei
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Actions</h4>
        <div className="flex flex-wrap gap-2">
          {strategy.actions.swap && (
            <div className="px-3 py-1.5 bg-orange-500/10 text-orange-400 rounded-lg text-sm">
              Swap {strategy.actions.swap.amount} {strategy.actions.swap.from} → {strategy.actions.swap.to}
            </div>
          )}
          {strategy.actions.notify && (
            <div className="px-3 py-1.5 bg-yellow-500/10 text-yellow-400 rounded-lg text-sm">
              <Bell className="w-3 h-3 inline mr-1" />
              Notify
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700/50">
        <div>
          <p className="text-xs text-gray-400">Executions</p>
          <p className="text-lg font-semibold text-white">{strategy.executionCount}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Success Rate</p>
          <p className="text-lg font-semibold text-white">{successRate}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Last Run</p>
          <p className="text-lg font-semibold text-white">
            {strategy.lastExecuted 
              ? new Date(strategy.lastExecuted).toLocaleTimeString()
              : 'Never'
            }
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Strategy Modal Component
function StrategyModal({
  strategy,
  onSave,
  onClose
}: {
  strategy: StorageStrategy | null;
  onSave: (strategy: StorageStrategy) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<StorageStrategy>>({
    name: strategy?.name || '',
    conditions: strategy?.conditions || {},
    actions: strategy?.actions || {},
    enabled: strategy?.enabled || false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as StorageStrategy);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-semibold text-white mb-6">
          {strategy ? 'Edit Strategy' : 'Create New Strategy'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Strategy Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., DCA Bitcoin"
              required
            />
          </div>

          {/* Conditions */}
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3">Conditions</h4>
            
            {/* Price Condition */}
            <div className="mb-4">
              <label className="flex items-center space-x-2 text-sm text-gray-300 mb-2">
                <input
                  type="checkbox"
                  checked={!!formData.conditions?.price}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          price: { token: 'BTC' }
                        }
                      });
                    } else {
                      const { price, ...rest } = formData.conditions || {};
                      setFormData({ ...formData, conditions: rest });
                    }
                  }}
                  className="rounded"
                />
                <span>Price Condition</span>
              </label>
              
              {formData.conditions?.price && (
                <div className="ml-6 space-y-2">
                  <input
                    type="text"
                    value={formData.conditions.price.token}
                    onChange={(e) => setFormData({
                      ...formData,
                      conditions: {
                        ...formData.conditions,
                        price: { ...formData.conditions?.price, token: e.target.value }
                      }
                    })}
                    className="w-full bg-gray-700 text-white rounded px-3 py-1.5 text-sm"
                    placeholder="Token symbol"
                  />
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={formData.conditions.price.below || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          price: { token: '', ...formData.conditions?.price, below: parseFloat(e.target.value) }
                        }
                      })}
                      className="flex-1 bg-gray-700 text-white rounded px-3 py-1.5 text-sm"
                      placeholder="Below price"
                    />
                    <input
                      type="number"
                      value={formData.conditions.price.above || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          price: { token: '', ...formData.conditions?.price, above: parseFloat(e.target.value) }
                        }
                      })}
                      className="flex-1 bg-gray-700 text-white rounded px-3 py-1.5 text-sm"
                      placeholder="Above price"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Time Interval */}
            <div className="mb-4">
              <label className="flex items-center space-x-2 text-sm text-gray-300 mb-2">
                <input
                  type="checkbox"
                  checked={!!formData.conditions?.time}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          time: { interval: 'daily' }
                        }
                      });
                    } else {
                      const { time, ...rest } = formData.conditions || {};
                      setFormData({ ...formData, conditions: rest });
                    }
                  }}
                  className="rounded"
                />
                <span>Time Interval</span>
              </label>
              
              {formData.conditions?.time && (
                <div className="ml-6">
                  <select
                    value={formData.conditions.time.interval}
                    onChange={(e) => setFormData({
                      ...formData,
                      conditions: {
                        ...formData.conditions,
                        time: { interval: e.target.value as 'hourly' | 'daily' | 'weekly' }
                      }
                    })}
                    className="w-full bg-gray-700 text-white rounded px-3 py-1.5 text-sm"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3">Actions</h4>
            
            {/* Swap Action */}
            <div className="mb-4">
              <label className="flex items-center space-x-2 text-sm text-gray-300 mb-2">
                <input
                  type="checkbox"
                  checked={!!formData.actions?.swap}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        actions: {
                          ...formData.actions,
                          swap: { from: 'USDC', to: 'ETH', amount: '100' }
                        }
                      });
                    } else {
                      const { swap, ...rest } = formData.actions || {};
                      setFormData({ ...formData, actions: rest });
                    }
                  }}
                  className="rounded"
                />
                <span>Swap Tokens</span>
              </label>
              
              {formData.actions?.swap && (
                <div className="ml-6 space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={formData.actions.swap.from}
                      onChange={(e) => setFormData({
                        ...formData,
                        actions: {
                          ...formData.actions,
                          swap: { from: e.target.value, to: formData.actions?.swap?.to || '', amount: formData.actions?.swap?.amount || '' }
                        }
                      })}
                      className="flex-1 bg-gray-700 text-white rounded px-3 py-1.5 text-sm"
                      placeholder="From token"
                    />
                    <span className="text-gray-400 self-center">→</span>
                    <input
                      type="text"
                      value={formData.actions.swap.to}
                      onChange={(e) => setFormData({
                        ...formData,
                        actions: {
                          ...formData.actions,
                          swap: { from: formData.actions?.swap?.from || '', to: e.target.value, amount: formData.actions?.swap?.amount || '' }
                        }
                      })}
                      className="flex-1 bg-gray-700 text-white rounded px-3 py-1.5 text-sm"
                      placeholder="To token"
                    />
                  </div>
                  <input
                    type="text"
                    value={formData.actions.swap.amount}
                    onChange={(e) => setFormData({
                      ...formData,
                      actions: {
                        ...formData.actions,
                        swap: { from: formData.actions?.swap?.from || '', to: formData.actions?.swap?.to || '', amount: e.target.value }
                      }
                    })}
                    className="w-full bg-gray-700 text-white rounded px-3 py-1.5 text-sm"
                    placeholder="Amount"
                  />
                </div>
              )}
            </div>

            {/* Notification Action */}
            <div>
              <label className="flex items-center space-x-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={!!formData.actions?.notify}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        actions: {
                          ...formData.actions,
                          notify: { message: 'Strategy executed successfully!' }
                        }
                      });
                    } else {
                      const { notify, ...rest } = formData.actions || {};
                      setFormData({ ...formData, actions: rest });
                    }
                  }}
                  className="rounded"
                />
                <span>Send Notification</span>
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all"
            >
              {strategy ? 'Save Changes' : 'Create Strategy'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}