import React, { useEffect, useState } from 'react';
import { Ghost, Plus, Trash2, PlayCircle, CheckCircle2, Loader2, Settings2, AlertTriangle, Shield } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { generateReference, assignTask, getTasks, executeTasks, deleteReference } from './api';
import type { Task } from './types';
import { TASK_SUGGESTIONS } from './types';
import { NftVerification } from './components/NftVerification';
import { VerificationPage } from './components/VerificationPage';

function App() {
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState<number>(-1);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [taskConfig, setTaskConfig] = useState<Required<NonNullable<Task['config']>>>({
    priority: 'medium',
    executionDelay: 0,
    retryAttempts: 1,
    disclosureLevel: 'anonymous',
    storageType: 'chain'
  });
  const [activeTab, setActiveTab] = useState<'tasks' | 'nft-verification'>('nft-verification');
  const [verificationProofId, setVerificationProofId] = useState<string | null>(null);

  // Check if we're on a verification page
  useEffect(() => {
    const path = window.location.pathname;
    const hashPath = window.location.hash;
    
    // Check for path-based routing
    const pathMatch = path.match(/\/verify\/([a-zA-Z0-9-]+)/);
    
    // Check for hash-based routing
    const hashMatch = hashPath.match(/#\/verify\/([a-zA-Z0-9-]+)/);
    
    if (pathMatch && pathMatch[1]) {
      setVerificationProofId(pathMatch[1]);
    } else if (hashMatch && hashMatch[1]) {
      setVerificationProofId(hashMatch[1]);
    }
  }, []);

  useEffect(() => {
    const initializeReference = async () => {
      try {
        const refId = await generateReference();
        setReferenceId(refId);
        toast.success('Anonymous reference ID generated');
        fetchTasks(refId);
      } catch (error) {
        toast.error('Failed to generate reference ID');
        console.error('Error generating reference:', error);
      }
    };

    if (!referenceId) {
      initializeReference();
    }
  }, []);

  const fetchTasks = async (refId: string) => {
    try {
      const tasksList = await getTasks(refId);
      setTasks(tasksList);
    } catch (error) {
      toast.error('Failed to fetch tasks');
      console.error('Error fetching tasks:', error);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim() || !referenceId) return;

    try {
      const suggestion = TASK_SUGGESTIONS.find(s => s.description === newTask);
      await assignTask(referenceId, newTask, suggestion?.defaultConfig);
      setNewTask('');
      setShowSuggestions(false);
      toast.success('Task added to queue');
      fetchTasks(referenceId);
    } catch (error) {
      toast.error('Failed to add task');
      console.error('Error assigning task:', error);
    }
  };

  const handleExecuteTasks = async () => {
    if (!referenceId) return;

    // Check if all tasks are configured
    const unconfiguredTasks = tasks.filter(task => 
      task.status === 'pending' && !task.config
    );

    if (unconfiguredTasks.length > 0) {
      toast.error('Some tasks are not configured. Please configure all tasks before execution.', {
        duration: 4000,
      });
      return;
    }
    
    setIsExecuting(true);
    
    try {
      await executeTasks(referenceId);
      await fetchTasks(referenceId);
      toast.success('All tasks completed');
    } catch (error) {
      toast.error('Failed to execute tasks');
      console.error('Error executing tasks:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSelfDestruct = async () => {
    if (!referenceId) return;
    
    try {
      await deleteReference(referenceId);
      setReferenceId(null);
      setTasks([]);
      toast.success('Reference destroyed');
      
      const newRefId = await generateReference();
      setReferenceId(newRefId);
      toast.success('New anonymous reference ID generated');
      fetchTasks(newRefId);
    } catch (error) {
      toast.error('Failed to delete reference');
      console.error('Error deleting reference:', error);
    }
  };

  const handleTaskInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewTask(value);
    setShowSuggestions(value.length > 0);
    setSelectedTaskIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedTaskIndex(prev => 
        prev < TASK_SUGGESTIONS.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedTaskIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter' && selectedTaskIndex >= 0) {
      e.preventDefault();
      setNewTask(TASK_SUGGESTIONS[selectedTaskIndex].description);
      setShowSuggestions(false);
      setSelectedTaskIndex(-1);
    }
  };

  const handleConfigureTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setTaskConfig({
        priority: task.config?.priority || 'medium',
        executionDelay: task.config?.executionDelay || 0,
        retryAttempts: task.config?.retryAttempts || 1,
        disclosureLevel: task.config?.disclosureLevel || 'anonymous',
        storageType: task.config?.storageType || 'chain'
      });
      setConfiguring(taskId);
    }
  };

  const handleSaveConfig = async (taskId: string) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId 
        ? { ...task, config: taskConfig }
        : task
    );
    setTasks(updatedTasks);
    setConfiguring(null);
    toast.success('Task configuration updated');
  };

  const filteredSuggestions = TASK_SUGGESTIONS.filter(suggestion =>
    suggestion.description.toLowerCase().includes(newTask.toLowerCase())
  );

  // If we're on a verification page, render the VerificationPage component
  if (verificationProofId) {
    return (
      <div className="min-h-screen bg-gray-900">
        <VerificationPage proofId={verificationProofId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="bg-gray-800 shadow-md border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Ghost className="h-8 w-8 text-purple-400" />
              <h1 className="ml-2 text-2xl font-bold">Ghost Agent</h1>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'tasks'
                    ? 'bg-purple-900/50 text-purple-300'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                Tasks
              </button>
              <button
                onClick={() => setActiveTab('nft-verification')}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                  activeTab === 'nft-verification'
                    ? 'bg-purple-900/50 text-purple-300'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Shield className="h-4 w-4 mr-1" />
                NFT Verification
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: '#2D3748',
              color: '#E2E8F0',
              borderColor: '#4A5568'
            }
          }}
        />
        
        {activeTab === 'tasks' ? (
          <div className="bg-gray-800 shadow-md rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-8">
              <Ghost className="w-8 h-8 text-purple-400" />
              <h1 className="text-2xl font-bold">Ghost Agent</h1>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm text-gray-400">Reference ID</h2>
                  <code className="text-purple-400">{referenceId}</code>
                </div>
                <button
                  onClick={handleSelfDestruct}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Self Destruct
                </button>
              </div>
            </div>

            <form onSubmit={handleAddTask} className="mb-8 relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newTask}
                    onChange={handleTaskInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter task description..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                  />
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute w-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10">
                      {filteredSuggestions.map((suggestion, index) => (
                        <div
                          key={suggestion.description}
                          className={`px-4 py-2 cursor-pointer ${
                            index === selectedTaskIndex
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'hover:bg-gray-600'
                          }`}
                          onClick={() => {
                            setNewTask(suggestion.description);
                            setShowSuggestions(false);
                          }}
                        >
                          {suggestion.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Task
                </button>
              </div>
            </form>

            <div className="bg-gray-700 rounded-lg p-6 border border-gray-600">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Task Queue</h2>
                <button
                  onClick={handleExecuteTasks}
                  disabled={isExecuting || tasks.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExecuting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                  Execute All
                </button>
              </div>

              {tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No tasks in queue
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id}>
                      <div className="flex items-center gap-3 bg-gray-800 p-4 rounded-md border border-gray-700">
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                        ) : !task.config ? (
                          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className={task.status === 'completed' ? 'text-gray-400' : ''}>
                            {task.description}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(task.timestamp).toLocaleString()}
                          </p>
                          {task.status === 'pending' && !task.config && (
                            <p className="text-sm text-yellow-400 mt-1">
                              Configuration required
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            task.status === 'completed' 
                              ? 'bg-green-500/10 text-green-400'
                              : !task.config
                              ? 'bg-yellow-500/10 text-yellow-400'
                              : 'bg-yellow-500/10 text-yellow-400'
                          }`}>
                            {task.status === 'pending' && !task.config ? 'unconfigured' : task.status}
                          </span>
                          {task.status === 'pending' && (
                            <button
                              onClick={() => handleConfigureTask(task.id)}
                              className="p-1 hover:bg-gray-600 rounded"
                            >
                              <Settings2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {configuring === task.id && (
                        <div className="mt-2 p-4 bg-gray-800 rounded-md border border-gray-700">
                          <h3 className="text-sm font-medium mb-3">Task Configuration</h3>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm text-gray-400 mb-1">Priority</label>
                              <select
                                value={taskConfig?.priority || 'medium'}
                                onChange={(e) => setTaskConfig({
                                  ...taskConfig,
                                  priority: e.target.value as 'low' | 'medium' | 'high'
                                })}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm text-gray-400 mb-1">
                                Execution Delay (ms)
                              </label>
                              <input
                                type="number"
                                value={taskConfig?.executionDelay || 0}
                                onChange={(e) => setTaskConfig({
                                  ...taskConfig,
                                  executionDelay: parseInt(e.target.value)
                                })}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-400 mb-1">
                                Retry Attempts
                              </label>
                              <input
                                type="number"
                                value={taskConfig?.retryAttempts || 1}
                                onChange={(e) => setTaskConfig({
                                  ...taskConfig,
                                  retryAttempts: parseInt(e.target.value)
                                })}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white"
                              />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                              <button
                                onClick={() => setConfiguring(null)}
                                className="px-3 py-1 text-sm bg-gray-600 rounded hover:bg-gray-500"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveConfig(task.id)}
                                className="px-3 py-1 text-sm bg-purple-600 rounded hover:bg-purple-500"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <NftVerification />
        )}
      </main>
    </div>
  );
}

export default App;