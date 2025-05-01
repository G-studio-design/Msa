// src/services/task-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';

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

    const newTask: Task = {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: taskData.title,
        status: 'Pending Input', // Initial status according to workflow
        progress: 5, // Start with a small progress percentage
        assignedDivision: 'Owner', // First step belongs to the Owner
        nextAction: 'Input Project Data', // First action for the Owner
        workflowHistory: [
            { division: taskData.createdBy, action: 'Created Task', timestamp: now },
            // Add history entry for initial file uploads if any
            ...filesWithTimestamps.map(file => ({
                 division: file.uploadedBy,
                 action: `Uploaded initial file: ${file.name}`,
                 timestamp: file.timestamp,
            }))
        ],
        files: filesWithTimestamps, // Save initial files with timestamps
        createdAt: now,
        createdBy: taskData.createdBy,
    };

    tasks.push(newTask);
    await writeTasks(tasks);
    console.log(`Task "${newTask.title}" (ID: ${newTask.id}) added successfully. Assigned to Owner for Input.`);

    // TODO: Trigger notification to Owner for 'Pending Input'
    await notifyUser('Owner', `New task "${newTask.title}" requires your input.`);

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
    // (though typically the updatedTask object should contain the merged history/files)
    const originalTask = tasks[taskIndex]; // Store original for comparison
    tasks[taskIndex] = {
        ...originalTask,     // Keep existing fields
        ...updatedTask,     // Overwrite with new values
        workflowHistory: updatedTask.workflowHistory || originalTask.workflowHistory,
        files: updatedTask.files || originalTask.files,
    };

    await writeTasks(tasks);
    console.log(`Task ${updatedTask.id} updated successfully.`);

     // TODO: Trigger notification based on status change or next assigned division
     if (tasks[taskIndex].assignedDivision !== originalTask.assignedDivision && tasks[taskIndex].assignedDivision) {
       await notifyUser(tasks[taskIndex].assignedDivision, `Task "${tasks[taskIndex].title}" requires your action: ${tasks[taskIndex].nextAction}`);
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

// --- Placeholder Notification Function ---
// Replace with actual notification logic
async function notifyUser(roleOrUserId: string, message: string) {
    console.log(`NOTIFICATION to ${roleOrUserId}: ${message}`);
    // Implement email, in-app, or other notification methods
}
