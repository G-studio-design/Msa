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

// Helper function to sanitize text for use in a path component
function sanitizeForPath(text: string): string {
  // Replace spaces with underscores, remove non-alphanumeric characters (except underscore and hyphen)
  return text
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');
}

// Define the structure of an uploaded file entry
export interface FileEntry {
    name: string;
    uploadedBy: string; // Username or ID of the uploader
    timestamp: string; // ISO string
    path: string; // Simulated folder path, e.g., projects/project_id-project_title/filename.ext
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
        // Ensure path property exists for all files, construct if missing
        return (parsedData as Project[]).map(project => ({
            ...project,
            files: project.files.map(file => ({
                ...file,
                // Construct path if missing (for older data or initial load)
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
 * Generates a simulated folder path for project files.
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
    // Define the base path for this project's files (simulated folder)
    const basePath = `projects/${projectId}-${projectTitleSanitized}`;

    // Add timestamps and paths to initial files
    const filesWithMetadata: FileEntry[] = projectData.initialFiles.map(file => ({
        ...file,
        timestamp: now,
        path: `${basePath}/${file.name}`, // Assign the generated path
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
        files: filesWithMetadata, // Use files with added path and timestamp
        createdAt: now,
        createdBy: projectData.createdBy,
    };

    projects.push(newProject);
    await writeProjects(projects);
    console.log(`Project "${newProject.title}" (ID: ${newProject.id}) added successfully. Path: ${basePath}. Assigned to ${initialAssignedDivision} for ${initialNextAction}.`);

    // Notify Admin Proyek
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
    // Sort by creation date descending before returning
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
 * Generates paths for any new files added during the update.
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
    // Define the base path using the potentially updated title
    const basePath = `projects/${updatedProject.id}-${projectTitleSanitized}`;

    // Ensure new files added in this update get a path
    const updatedFilesWithPath = updatedProject.files.map(file => {
        // Check if this file entry already has a path (from original project or previous updates)
        // and if it lacks one (meaning it's newly added in this `updatedProject` payload)
        if (!file.path) {
            console.log(`Assigning path to new file "${file.name}" in project ${updatedProject.id}`);
            return {
                ...file,
                path: `${basePath}/${file.name}` // Assign the correct path
            };
        }
        // If title changed, existing paths might need updating (handled in updateProjectTitle)
        // For this update function, we primarily focus on assigning paths to *new* files.
        // However, we should ensure the path uses the potentially updated title.
         const currentFileName = file.name; // Get the filename
         const expectedPath = `${basePath}/${currentFileName}`;
         if (file.path !== expectedPath) {
            console.log(`Correcting path for existing file "${file.name}" due to potential title change. Old: ${file.path}, New: ${expectedPath}`);
            return { ...file, path: expectedPath };
         }

        return file; // Return existing file entry as is if path exists and matches
    });


    projects[projectIndex] = {
        ...originalProject, // Keep original fields not explicitly updated
        ...updatedProject, // Apply all updates from the payload
        files: updatedFilesWithPath, // Use files with paths assigned/corrected
        workflowHistory: updatedProject.workflowHistory || originalProject.workflowHistory, // Merge history if needed
    };

    await writeProjects(projects);
    console.log(`Project ${updatedProject.id} updated successfully.`);

     // Notify the newly assigned division if it changed
     const newlyAssignedDivision = projects[projectIndex].assignedDivision;
     if (newlyAssignedDivision && newlyAssignedDivision !== originalProject.assignedDivision) {
        const nextActionDesc = projects[projectIndex].nextAction || 'action';
       await notifyUsersByRole(newlyAssignedDivision, `Project "${projects[projectIndex].title}" requires your ${nextActionDesc}.`, projects[projectIndex].id);
     }
}


/**
 * Updates the title of a specific project.
 * Updates the `path` property for all existing files within that project.
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

     const originalProject = projects[projectIndex];
     const oldTitleSanitized = sanitizeForPath(originalProject.title);
     const newTitleSanitized = sanitizeForPath(newTitle);

     // Only proceed with path updates if the sanitized title actually changes
     if (oldTitleSanitized !== newTitleSanitized) {
         console.log(`Sanitized title changed for project ${projectId}. Updating file paths.`);
         const oldBasePath = `projects/${projectId}-${oldTitleSanitized}`;
         const newBasePath = `projects/${projectId}-${newTitleSanitized}`;

         // Update file paths for all existing files
         projects[projectIndex].files = originalProject.files.map(file => {
             // Construct the expected new path based on the new title
             const expectedNewPath = `${newBasePath}/${file.name}`;
             // Log the change
             console.log(` -> Updating path for file "${file.name}": From "${file.path}" to "${expectedNewPath}"`);
             return {
                 ...file,
                 path: expectedNewPath // Update the path
             };
         });
     } else {
        console.log(`Sanitized title for project ${projectId} remains the same. No file path update needed.`);
     }

    // Update the project title itself
    projects[projectIndex].title = newTitle;


     await writeProjects(projects);
     console.log(`Title for project ${projectId} updated successfully.`);
}
