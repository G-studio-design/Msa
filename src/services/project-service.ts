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

// Helper function to sanitize text for use in a path
function sanitizeForPath(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
}

// Define the structure of an uploaded file entry
export interface FileEntry {
    name: string;
    uploadedBy: string; // Username or ID of the uploader
    timestamp: string; // ISO string
    path?: string; // Simulated folder path, e.g., projects/project_id-project_title/filename.ext
    // In a real app, you'd store a URL or file ID here
    // url?: string;
}

// Define the structure of a Project
export interface Project {
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
}

// Define the structure for adding a new project
// Make initialFiles properties match FileEntry (except timestamp and path, which will be added)
export interface AddProjectData {
    title: string;
    initialFiles: Omit<FileEntry, 'timestamp' | 'path'>[]; // Files provided at creation
    createdBy: string;
}


const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'projects.json');

// --- Helper Functions ---

/**
 * Reads the project data from the JSON file.
 * @returns A promise that resolves to an array of Project objects.
 */
async function readProjects(): Promise<Project[]> {
    try {
        await fs.access(DB_PATH); // Check if file exists
    } catch (error) {
        // If the file doesn't exist, create it with an empty array
        console.log("Project database file not found, creating a new one.");
        await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
        return [];
    }

    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        const parsedData = JSON.parse(data);
        if (!Array.isArray(parsedData)) {
            console.error("Project database file does not contain a valid JSON array. Resetting.");
            await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        return (parsedData as Project[]).map(project => ({
            ...project,
            files: project.files.map(file => ({
                ...file,
                // Ensure path exists, construct if missing (for older data)
                path: file.path || `projects/${project.id}-${sanitizeForPath(project.title)}/${file.name}`
            }))
        }));
    } catch (error) {
        console.error("Error reading or parsing project database:", error);
         try {
             console.log("Attempting to reset project database due to read/parse error.");
             await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
             return [];
         } catch (writeError) {
             console.error("Failed to reset project database:", writeError);
             throw new Error('Failed to read or reset project data.');
         }
    }
}

/**
 * Writes the project data to the JSON file.
 * @param projects An array of Project objects to write.
 * @returns A promise that resolves when the write operation is complete.
 */
async function writeProjects(projects: Project[]): Promise<void> {
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(projects, null, 2), 'utf8');
        console.log("Project data written to DB_PATH successfully.");
    } catch (error) {
        console.error("Error writing project database:", error);
        throw new Error('Failed to save project data.');
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
export async function addProject(projectData: AddProjectData): Promise<Project> {
    console.log('Adding new project:', projectData.title, 'by', projectData.createdBy);
    const projects = await readProjects();
    const now = new Date().toISOString();
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const projectTitleSanitized = sanitizeForPath(projectData.title);
    const basePath = `projects/${projectId}-${projectTitleSanitized}`;

    // Add timestamps and paths to initial files
    const filesWithMetadata: FileEntry[] = projectData.initialFiles.map(file => ({
        ...file,
        timestamp: now,
        path: `${basePath}/${file.name}`,
    }));

    // Define the initial workflow state
    const initialStatus = 'Pending Offer'; // Project starts by needing an offer
    const initialAssignedDivision = 'Admin Proyek'; // Assigned to Project Admin
    const initialNextAction = 'Upload Offer Document'; // Next step for Project Admin

    const newProject: Project = {
        id: projectId,
        title: projectData.title,
        status: initialStatus,
        progress: 10, // Start progress slightly higher as initial step is done
        assignedDivision: initialAssignedDivision,
        nextAction: initialNextAction,
        workflowHistory: [
            { division: projectData.createdBy, action: 'Created Project', timestamp: now },
            ...filesWithMetadata.map(file => ({
                 division: file.uploadedBy,
                 action: `Uploaded initial file: ${file.name}`,
                 timestamp: file.timestamp,
            })),
            { division: 'System', action: `Assigned to ${initialAssignedDivision} for ${initialNextAction}`, timestamp: now }
        ],
        files: filesWithMetadata,
        createdAt: now,
        createdBy: projectData.createdBy,
    };

    projects.push(newProject);
    await writeProjects(projects);
    console.log(`Project "${newProject.title}" (ID: ${newProject.id}) added successfully. Assigned to ${initialAssignedDivision} for ${initialNextAction}.`);

    await notifyUsersByRole(initialAssignedDivision, `New project "${newProject.title}" created. Please upload the offer document.`, newProject.id);

    return newProject;
}

/**
 * Retrieves all projects from the database.
 * @returns A promise that resolves to an array of all Project objects.
 */
export async function getAllProjects(): Promise<Project[]> {
    console.log("Fetching all projects from database.");
    const projects = await readProjects();
    projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return projects;
}

/**
 * Finds a specific project by its ID.
 * @param projectId The ID of the project to find.
 * @returns A promise that resolves to the Project object or null if not found.
 */
export async function getProjectById(projectId: string): Promise<Project | null> {
    console.log(`Fetching project with ID: ${projectId}`);
    const projects = await readProjects();
    const project = projects.find(p => p.id === projectId) || null;
    if (!project) {
        console.warn(`Project with ID "${projectId}" not found.`);
    }
    return project;
}

/**
 * Updates an existing project in the database.
 * Use this for updating status, progress, adding files, history, etc.
 * Notifies the newly assigned division if the assignment changes.
 * @param updatedProject The full project object with updated values.
 * @returns A promise that resolves when the update is complete.
 * @throws An error if the project to update is not found.
 */
export async function updateProject(updatedProject: Project): Promise<void> {
    console.log(`Updating project with ID: ${updatedProject.id}`);
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === updatedProject.id);

    if (projectIndex === -1) {
        console.error(`Project with ID "${updatedProject.id}" not found for update.`);
        throw new Error('PROJECT_NOT_FOUND');
    }

    const originalProject = projects[projectIndex];
    const projectTitleSanitized = sanitizeForPath(updatedProject.title);
    const basePath = `projects/${updatedProject.id}-${projectTitleSanitized}`;

    // Ensure new files get a path
    const updatedFilesWithPath = updatedProject.files.map(file => {
        if (!file.path) { // If a new file from an update doesn't have a path yet
            return {
                ...file,
                path: `${basePath}/${file.name}`
            };
        }
        return file;
    });


    projects[projectIndex] = {
        ...originalProject,
        ...updatedProject,
        files: updatedFilesWithPath, // Use files with new paths
        workflowHistory: updatedProject.workflowHistory || originalProject.workflowHistory,
    };

    await writeProjects(projects);
    console.log(`Project ${updatedProject.id} updated successfully.`);

     const newlyAssignedDivision = projects[projectIndex].assignedDivision;
     if (newlyAssignedDivision && newlyAssignedDivision !== originalProject.assignedDivision) {
        const nextActionDesc = projects[projectIndex].nextAction || 'action';
       await notifyUsersByRole(newlyAssignedDivision, `Project "${projects[projectIndex].title}" requires your ${nextActionDesc}.`, projects[projectIndex].id);
     }
}


/**
 * Updates the title of a specific project.
 * Also updates file paths if the title changes.
 * @param projectId The ID of the project to update.
 * @param newTitle The new title for the project.
 * @returns A promise that resolves when the update is complete.
 * @throws An error if the project is not found.
 */
export async function updateProjectTitle(projectId: string, newTitle: string): Promise<void> {
    console.log(`Updating title for project ID: ${projectId} to "${newTitle}"`);
     let projects = await readProjects();
     const projectIndex = projects.findIndex(p => p.id === projectId);

     if (projectIndex === -1) {
         console.error(`Project with ID "${projectId}" not found for title update.`);
         throw new Error('PROJECT_NOT_FOUND');
     }

     const oldTitleSanitized = sanitizeForPath(projects[projectIndex].title);
     const newTitleSanitized = sanitizeForPath(newTitle);

     projects[projectIndex].title = newTitle;

     // If title changed, update file paths
     if (oldTitleSanitized !== newTitleSanitized) {
        const oldBasePath = `projects/${projectId}-${oldTitleSanitized}`;
        const newBasePath = `projects/${projectId}-${newTitleSanitized}`;
        projects[projectIndex].files = projects[projectIndex].files.map(file => ({
            ...file,
            path: file.path?.replace(oldBasePath, newBasePath) // Update path if it existed
        }));
     }


     await writeProjects(projects);
     console.log(`Title for project ${projectId} updated successfully.`);
}

