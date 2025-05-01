// src/services/task-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import { notifyUsersByRole } from './notification-service'; // Import notification service

// Define the structure of a Workflow History entry
export interface WorkflowHistoryEntry {
    division: string;
    action: string;
    timestamp: string; // ISO string
}

// Define the structure of an uploaded file entry
export interface FileEntry {
    name: string;
    uploadedBy: string; // Username or ID of the uploader
    timestamp: string; // ISO string
    // In a real app, you'd store a URL or file ID here
    // url?: string;
}

// Define the structure of a Task
export interface Task {
    id: string;
    title: string;
    status: string; // e.g., 'Pending Input', 'Pending Offer', 'In Progress', 'Completed', 'Canceled'
    progress: number; // Percentage (0-100)
    assignedDivision: string; // Role responsible for the next action
    nextAction: string | null; // Description of the next step
    workflowHistory: WorkflowHistoryEntry[];
    files: FileEntry[];
    createdAt: string; // ISO string
    createdBy: string; // Username or ID of the creator
    // Add other relevant fields as needed
    // projectDetails?: any;
    // deadline?: string;
}

// Define the structure for adding a new task
// Make initialFiles properties match FileEntry (except timestamp, which will be added)
export interface AddTaskData {
    title: string;
    initialFiles: Omit<FileEntry, 'timestamp'>[]; // Files provided at creation
    createdBy: string;
}


const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'tasks.json');

// --- Helper Functions ---

/**
 * Reads the task data from the JSON file.
 * @returns A promise that resolves to an array of Task objects.
 */
async function readTasks(): Promise<Task[]> {
    try {
        await fs.access(DB_PATH); // Check if file exists
    } catch (error) {
        // If the file doesn't exist, create it with an empty array
        console.log("Task database file not found, creating a new one.");
        await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
        return [];
    }

    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        const parsedData = JSON.parse(data);
        if (!Array.isArray(parsedData)) {
            console.error("Task database file does not contain a valid JSON array. Resetting.");
            await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        // Basic validation/migration could happen here if needed
        return parsedData as Task[];
    } catch (error) {
        console.error("Error reading or parsing task database:", error);
         try {
             console.log("Attempting to reset task database due to read/parse error.");
             await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
             return [];
         } catch (writeError) {
             console.error("Failed to reset task database:", writeError);
             throw new Error('Failed to read or reset task data.');
         }
    }
}

/**
 * Writes the task data to the JSON file.
 * @param tasks An array of Task objects to write.
 * @returns A promise that resolves when the write operation is complete.
 */
async function writeTasks(tasks: Task[]): Promise<void> {
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(tasks, null, 2), 'utf8');
        console.log("Task data written to DB_PATH successfully.");
    } catch (error) {
        console.error("Error writing task database:", error);
        throw new Error('Failed to save task data.');
    }
}

// --- Main Service Functions ---

/**
 * Adds a new task to the database.
 * Initializes the task with the starting workflow state.
 * Notifies the 'Admin Proyek' division using the notification service.
 * @param taskData Data for the new task.
 * @returns A promise that resolves to the newly created Task object.
 */
export async function addTask(taskData: AddTaskData): Promise<Task> {
    console.log('Adding new task:', taskData.title, 'by', taskData.createdBy);
    const tasks = await readTasks();
    const now = new Date().toISOString();

    // Add timestamps to initial files
    const filesWithTimestamps = taskData.initialFiles.map(file => ({
        ...file,
        timestamp: now,
    }));

    // Define the initial workflow state
    const initialStatus = 'Pending Offer'; // Task starts by needing an offer
    const initialAssignedDivision = 'Admin Proyek'; // Assigned to Project Admin
    const initialNextAction = 'Upload Offer Document'; // Next step for Project Admin

    const newTask: Task = {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: taskData.title,
        status: initialStatus,
        progress: 10, // Start progress slightly higher as initial step is done
        assignedDivision: initialAssignedDivision,
        nextAction: initialNextAction,
        workflowHistory: [
            { division: taskData.createdBy, action: 'Created Task', timestamp: now },
            // Add history entry for initial file uploads if any
            ...filesWithTimestamps.map(file => ({
                 division: file.uploadedBy,
                 action: `Uploaded initial file: ${file.name}`,
                 timestamp: file.timestamp,
            })),
            // Add initial assignment history entry
            { division: 'System', action: `Assigned to ${initialAssignedDivision} for ${initialNextAction}`, timestamp: now }
        ],
        files: filesWithTimestamps, // Save initial files with timestamps
        createdAt: now,
        createdBy: taskData.createdBy,
    };

    tasks.push(newTask);
    await writeTasks(tasks);
    console.log(`Task "${newTask.title}" (ID: ${newTask.id}) added successfully. Assigned to ${initialAssignedDivision} for ${initialNextAction}.`);

    // --- Notify Admin Proyek using Notification Service ---
    // Notify the 'Admin Proyek' division that a new task requires an offer document.
    await notifyUsersByRole(initialAssignedDivision, `New task "${newTask.title}" created. Please upload the offer document.`, newTask.id);
    // --- End Notification ---

    return newTask;
}

/**
 * Retrieves all tasks from the database.
 * @returns A promise that resolves to an array of all Task objects.
 */
export async function getAllTasks(): Promise<Task[]> {
    console.log("Fetching all tasks from database.");
    const tasks = await readTasks();
    // Sort tasks by creation date, newest first (optional)
    tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return tasks;
}

/**
 * Finds a specific task by its ID.
 * @param taskId The ID of the task to find.
 * @returns A promise that resolves to the Task object or null if not found.
 */
export async function getTaskById(taskId: string): Promise<Task | null> {
    console.log(`Fetching task with ID: ${taskId}`);
    const tasks = await readTasks();
    const task = tasks.find(t => t.id === taskId) || null;
    if (!task) {
        console.warn(`Task with ID "${taskId}" not found.`);
    }
    return task;
}

/**
 * Updates an existing task in the database.
 * Use this for updating status, progress, adding files, history, etc.
 * Notifies the newly assigned division if the assignment changes.
 * @param updatedTask The full task object with updated values.
 * @returns A promise that resolves when the update is complete.
 * @throws An error if the task to update is not found.
 */
export async function updateTask(updatedTask: Task): Promise<void> {
    console.log(`Updating task with ID: ${updatedTask.id}`);
    let tasks = await readTasks();
    const taskIndex = tasks.findIndex(t => t.id === updatedTask.id);

    if (taskIndex === -1) {
        console.error(`Task with ID "${updatedTask.id}" not found for update.`);
        throw new Error('TASK_NOT_FOUND');
    }

    // Ensure workflow history and files are preserved if not explicitly overwritten
    const originalTask = tasks[taskIndex]; // Store original for comparison
    tasks[taskIndex] = {
        ...originalTask,     // Keep existing fields
        ...updatedTask,     // Overwrite with new values
        workflowHistory: updatedTask.workflowHistory || originalTask.workflowHistory,
        files: updatedTask.files || originalTask.files,
    };

    await writeTasks(tasks);
    console.log(`Task ${updatedTask.id} updated successfully.`);

     // Notify the newly assigned division if it changed and is not empty
     const newlyAssignedDivision = tasks[taskIndex].assignedDivision;
     if (newlyAssignedDivision && newlyAssignedDivision !== originalTask.assignedDivision) {
        const nextActionDesc = tasks[taskIndex].nextAction || 'action'; // Provide a fallback if nextAction is null
       await notifyUsersByRole(newlyAssignedDivision, `Task "${tasks[taskIndex].title}" requires your ${nextActionDesc}.`, tasks[taskIndex].id);
     }
}


/**
 * Updates the title of a specific task.
 * @param taskId The ID of the task to update.
 * @param newTitle The new title for the task.
 * @returns A promise that resolves when the update is complete.
 * @throws An error if the task is not found.
 */
export async function updateTaskTitle(taskId: string, newTitle: string): Promise<void> {
    console.log(`Updating title for task ID: ${taskId} to "${newTitle}"`);
     let tasks = await readTasks();
     const taskIndex = tasks.findIndex(t => t.id === taskId);

     if (taskIndex === -1) {
         console.error(`Task with ID "${taskId}" not found for title update.`);
         throw new Error('TASK_NOT_FOUND');
     }

     tasks[taskIndex].title = newTitle;

     await writeTasks(tasks);
     console.log(`Title for task ${taskId} updated successfully.`);
}

// --- Placeholder Notification Function (Removed - Using notification-service) ---
// async function notifyUser(roleOrUserId: string, message: string) {
//     console.log(`NOTIFICATION to ${roleOrUserId}: ${message}`);
// }

