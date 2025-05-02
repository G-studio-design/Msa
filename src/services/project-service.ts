// src/services/project-service.ts
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

// Define the structure of a Project // Renamed interface
export interface Project { // Renamed interface
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

// Define the structure for adding a new project // Renamed interface
// Make initialFiles properties match FileEntry (except timestamp, which will be added)
export interface AddProjectData { // Renamed interface
    title: string;
    initialFiles: Omit<FileEntry, 'timestamp'>[]; // Files provided at creation
    createdBy: string;
}


const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'projects.json'); // Renamed file

// --- Helper Functions ---

/**
 * Reads the project data from the JSON file.
 * @returns A promise that resolves to an array of Project objects.
 */
async function readProjects(): Promise<Project[]> { // Renamed function and return type
    try {
        await fs.access(DB_PATH); // Check if file exists
    } catch (error) {
        // If the file doesn't exist, create it with an empty array
        console.log("Project database file not found, creating a new one."); // Updated log message
        await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
        return [];
    }

    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        const parsedData = JSON.parse(data);
        if (!Array.isArray(parsedData)) {
            console.error("Project database file does not contain a valid JSON array. Resetting."); // Updated log message
            await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        // Basic validation/migration could happen here if needed
        return parsedData as Project[]; // Renamed type
    } catch (error) {
        console.error("Error reading or parsing project database:", error); // Updated log message
         try {
             console.log("Attempting to reset project database due to read/parse error."); // Updated log message
             await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
             return [];
         } catch (writeError) {
             console.error("Failed to reset project database:", writeError); // Updated log message
             throw new Error('Failed to read or reset project data.'); // Updated error message
         }
    }
}

/**
 * Writes the project data to the JSON file.
 * @param projects An array of Project objects to write.
 * @returns A promise that resolves when the write operation is complete.
 */
async function writeProjects(projects: Project[]): Promise<void> { // Renamed function and parameter
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(projects, null, 2), 'utf8');
        console.log("Project data written to DB_PATH successfully."); // Updated log message
    } catch (error) {
        console.error("Error writing project database:", error); // Updated log message
        throw new Error('Failed to save project data.'); // Updated error message
    }
}

// --- Main Service Functions ---

/**
 * Adds a new project to the database.
 * Initializes the project with the starting workflow state.
 * Notifies the 'Admin Proyek' division using the notification service.
 * @param projectData Data for the new project.
 * @returns A promise that resolves to the newly created Project object.
 */
export async function addProject(projectData: AddProjectData): Promise<Project> { // Renamed function and parameter types
    console.log('Adding new project:', projectData.title, 'by', projectData.createdBy); // Updated log message
    const projects = await readProjects(); // Renamed variable
    const now = new Date().toISOString();

    // Add timestamps to initial files
    const filesWithTimestamps = projectData.initialFiles.map(file => ({
        ...file,
        timestamp: now,
    }));

    // Define the initial workflow state
    const initialStatus = 'Pending Offer'; // Project starts by needing an offer
    const initialAssignedDivision = 'Admin Proyek'; // Assigned to Project Admin
    const initialNextAction = 'Upload Offer Document'; // Next step for Project Admin

    const newProject: Project = { // Renamed variable and type
        id: `project_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, // Updated ID prefix
        title: projectData.title,
        status: initialStatus,
        progress: 10, // Start progress slightly higher as initial step is done
        assignedDivision: initialAssignedDivision,
        nextAction: initialNextAction,
        workflowHistory: [
            { division: projectData.createdBy, action: 'Created Project', timestamp: now }, // Updated action text
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
        createdBy: projectData.createdBy,
    };

    projects.push(newProject); // Renamed variable
    await writeProjects(projects); // Renamed function call
    console.log(`Project "${newProject.title}" (ID: ${newProject.id}) added successfully. Assigned to ${initialAssignedDivision} for ${initialNextAction}.`); // Updated log message

    // --- Notify Admin Proyek using Notification Service ---
    // Notify the 'Admin Proyek' division that a new project requires an offer document.
    await notifyUsersByRole(initialAssignedDivision, `New project "${newProject.title}" created. Please upload the offer document.`, newProject.id); // Updated notification message
    // --- End Notification ---

    return newProject; // Renamed variable
}

/**
 * Retrieves all projects from the database.
 * @returns A promise that resolves to an array of all Project objects.
 */
export async function getAllProjects(): Promise<Project[]> { // Renamed function and return type
    console.log("Fetching all projects from database."); // Updated log message
    const projects = await readProjects(); // Renamed variable
    // Sort projects by creation date, newest first (optional)
    projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return projects; // Renamed variable
}

/**
 * Finds a specific project by its ID.
 * @param projectId The ID of the project to find.
 * @returns A promise that resolves to the Project object or null if not found.
 */
export async function getProjectById(projectId: string): Promise<Project | null> { // Renamed function, parameter, and return type
    console.log(`Fetching project with ID: ${projectId}`); // Updated log message
    const projects = await readProjects(); // Renamed variable
    const project = projects.find(p => p.id === projectId) || null; // Renamed variable
    if (!project) { // Renamed variable
        console.warn(`Project with ID "${projectId}" not found.`); // Updated log message
    }
    return project; // Renamed variable
}

/**
 * Updates an existing project in the database.
 * Use this for updating status, progress, adding files, history, etc.
 * Notifies the newly assigned division if the assignment changes.
 * @param updatedProject The full project object with updated values.
 * @returns A promise that resolves when the update is complete.
 * @throws An error if the project to update is not found.
 */
export async function updateProject(updatedProject: Project): Promise<void> { // Renamed function and parameter type
    console.log(`Updating project with ID: ${updatedProject.id}`); // Updated log message
    let projects = await readProjects(); // Renamed variable
    const projectIndex = projects.findIndex(p => p.id === updatedProject.id); // Renamed variable

    if (projectIndex === -1) {
        console.error(`Project with ID "${updatedProject.id}" not found for update.`); // Updated log message
        throw new Error('PROJECT_NOT_FOUND'); // Updated error message
    }

    // Ensure workflow history and files are preserved if not explicitly overwritten
    const originalProject = projects[projectIndex]; // Store original for comparison // Renamed variable
    projects[projectIndex] = { // Renamed variable
        ...originalProject,     // Keep existing fields // Renamed variable
        ...updatedProject,     // Overwrite with new values
        workflowHistory: updatedProject.workflowHistory || originalProject.workflowHistory, // Renamed variable
        files: updatedProject.files || originalProject.files, // Renamed variable
    };

    await writeProjects(projects); // Renamed function call
    console.log(`Project ${updatedProject.id} updated successfully.`); // Updated log message

     // Notify the newly assigned division if it changed and is not empty
     const newlyAssignedDivision = projects[projectIndex].assignedDivision; // Renamed variable
     if (newlyAssignedDivision && newlyAssignedDivision !== originalProject.assignedDivision) { // Renamed variable
        const nextActionDesc = projects[projectIndex].nextAction || 'action'; // Provide a fallback if nextAction is null // Renamed variable
       await notifyUsersByRole(newlyAssignedDivision, `Project "${projects[projectIndex].title}" requires your ${nextActionDesc}.`, projects[projectIndex].id); // Updated notification message // Renamed variable
     }
}


/**
 * Updates the title of a specific project.
 * @param projectId The ID of the project to update.
 * @param newTitle The new title for the project.
 * @returns A promise that resolves when the update is complete.
 * @throws An error if the project is not found.
 */
export async function updateProjectTitle(projectId: string, newTitle: string): Promise<void> { // Renamed function and parameter
    console.log(`Updating title for project ID: ${projectId} to "${newTitle}"`); // Updated log message
     let projects = await readProjects(); // Renamed variable
     const projectIndex = projects.findIndex(p => p.id === projectId); // Renamed variable

     if (projectIndex === -1) {
         console.error(`Project with ID "${projectId}" not found for title update.`); // Updated log message
         throw new Error('PROJECT_NOT_FOUND'); // Updated error message
     }

     projects[projectIndex].title = newTitle; // Renamed variable

     await writeProjects(projects); // Renamed function call
     console.log(`Title for project ${projectId} updated successfully.`); // Updated log message
}
