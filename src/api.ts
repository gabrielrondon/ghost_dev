import { v4 as uuidv4 } from 'uuid';
import type { Task } from './types';

// Mock storage to persist data during development
const mockStorage = new Map<string, Task[]>();

const MOCK_DELAY = 500; // Simulate network delay

async function generateReference(): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    const referenceId = uuidv4();
    mockStorage.set(referenceId, []);
    return referenceId;
}

async function assignTask(
  referenceId: string,
  description: string,
  config?: Task['config']
): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    const taskId = uuidv4();
    const task: Task = {
        id: taskId,
        description,
        status: 'pending',
        timestamp: Date.now(),
        config
    };
    
    const tasks = mockStorage.get(referenceId) || [];
    tasks.push(task);
    mockStorage.set(referenceId, tasks);
    
    return taskId;
}

async function getTasks(referenceId: string): Promise<Task[]> {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    return mockStorage.get(referenceId) || [];
}

async function executeTasks(referenceId: string): Promise<Task[]> {
    const tasks = mockStorage.get(referenceId) || [];
    
    // Execute tasks according to their configuration
    for (const task of tasks) {
        if (task.status === 'pending') {
            if (task.config?.executionDelay) {
                await new Promise(resolve => setTimeout(resolve, task.config.executionDelay));
            }
            
            let attempts = 0;
            const maxAttempts = task.config?.retryAttempts || 1;
            
            while (attempts < maxAttempts) {
                try {
                    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
                    break;
                } catch (error) {
                    attempts++;
                    if (attempts === maxAttempts) {
                        throw error;
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
                }
            }
        }
    }
    
    const updatedTasks = tasks.map(task => ({
        ...task,
        status: 'completed' as const
    }));
    
    mockStorage.set(referenceId, updatedTasks);
    return updatedTasks;
}

async function deleteReference(referenceId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    return mockStorage.delete(referenceId);
}

export { generateReference, assignTask, getTasks, executeTasks, deleteReference };