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
    note?: string; // Optional note for revisions or other actions
}

// Helper function to sanitize text for use in a path component
function sanitizeForPath(text: string): string {
  // Replace spaces with underscores, remove non-alphanumeric characters (except underscore and hyphen)
  return text
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');
}

const PROJECT_FILES_BASE_DIR = path.resolve(process.cwd(), 'src', 'database', 'project_files');

// Define the structure of an uploaded file entry
export interface FileEntry {
    name: string;
    uploadedBy: string; // Username or ID of the uploader
    timestamp: string; // ISO string
    // Path relative to PROJECT_FILES_BASE_DIR, e.g., "project_id-sanitized_title/filename.ext"
    path: string; 
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
export interface AddProjectData {
    title: string;
    initialFiles: Omit<FileEntry, 'timestamp' | 'path' | 'size'>[]; // Files provided at creation
    createdBy: string;
}


const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'projects.json');

// --- Helper Functions ---

async function readProjects(): Promise<Project[]> {
    try {
        await fs.access(DB_PATH);
    } catch (error) {
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
        // Ensure files have a path. If not, construct one (legacy data handling).
        return (parsedData as Project[]).map(project => ({
            ...project,
            files: project.files.map(file => {
                if (!file.path) {
                    // Construct a path if missing, relative to the project files base dir
                    const projectTitleSanitized = sanitizeForPath(project.title);
                    const relativePath = `${project.id}-${projectTitleSanitized}/${file.name}`;
                    console.warn(`File "${file.name}" in project "${project.id}" was missing a path. Assigning: ${relativePath}`);
                    return { ...file, path: relativePath };
                }
                return file;
            })
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

async function writeProjects(projects: Project[]): Promise<void> {
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(projects, null, 2), 'utf8');
        console.log("Project data written to DB_PATH successfully.");
    } catch (error) {
        console.error("Error writing project database:", error);
        throw new Error('Failed to save project data.');
    }
}

// Ensure the base directory for project files exists
async function ensureProjectFilesBaseDirExists(): Promise<void> {
    try {
        await fs.mkdir(PROJECT_FILES_BASE_DIR, { recursive: true });
        console.log(`Project files base directory ensured at: ${PROJECT_FILES_BASE_DIR}`);
    } catch (error) {
        console.error(`Error creating project files base directory ${PROJECT_FILES_BASE_DIR}:`, error);
        throw new Error('Failed to create project files base directory.');
    }
}


// --- Main Service Functions ---

export async function addProject(projectData: AddProjectData): Promise<Project> {
    console.log('Adding new project:', projectData.title, 'by', projectData.createdBy);
    await ensureProjectFilesBaseDirExists(); // Ensure base directory exists

    const projects = await readProjects();
    const now = new Date().toISOString();
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const projectTitleSanitized = sanitizeForPath(projectData.title);
    
    // Folder path relative to PROJECT_FILES_BASE_DIR
    const projectRelativeFolderPath = `${projectId}-${projectTitleSanitized}`;
    // Absolute path for server-side operations
    const projectAbsoluteFolderPath = path.join(PROJECT_FILES_BASE_DIR, projectRelativeFolderPath);

    try {
        await fs.mkdir(projectAbsoluteFolderPath, { recursive: true });
        console.log(`Created folder for project ${projectId} at: ${projectAbsoluteFolderPath}`);
    } catch (error) {
        console.error(`Error creating folder for project ${projectId} at ${projectAbsoluteFolderPath}:`, error);
        // Decide if this is a critical error. For now, let's proceed but log heavily.
        // throw new Error('Failed to create project folder.'); 
    }


    const filesWithMetadata: FileEntry[] = projectData.initialFiles.map(file => ({
        ...file,
        timestamp: now,
        path: `${projectRelativeFolderPath}/${file.name}`, // Path relative to base dir
    }));

    const initialStatus = 'Pending Offer';
    const initialAssignedDivision = 'Admin Proyek';
    const initialNextAction = 'Upload Offer Document';

    const newProject: Project = {
        id: projectId,
        title: projectData.title,
        status: initialStatus,
        progress: 10,
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
    console.log(`Project "${newProject.title}" (ID: ${newProject.id}) added successfully. Relative folder path: ${projectRelativeFolderPath}. Assigned to ${initialAssignedDivision} for ${initialNextAction}.`);

    await notifyUsersByRole(initialAssignedDivision, `New project "${newProject.title}" created. Please upload the offer document.`, newProject.id);

    return newProject;
}

export async function getAllProjects(): Promise<Project[]> {
    console.log("Fetching all projects from database.");
    const projects = await readProjects();
    projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return projects;
}

export async function getProjectById(projectId: string): Promise<Project | null> {
    console.log(`Fetching project with ID: ${projectId}`);
    const projects = await readProjects();
    const project = projects.find(p => p.id === projectId) || null;
    if (!project) {
        console.warn(`Project with ID "${projectId}" not found.`);
    }
    return project;
}

export async function updateProject(updatedProject: Project): Promise<void> {
    console.log(`Updating project with ID: ${updatedProject.id}`);
    await ensureProjectFilesBaseDirExists();
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === updatedProject.id);

    if (projectIndex === -1) {
        console.error(`Project with ID "${updatedProject.id}" not found for update.`);
        throw new Error('PROJECT_NOT_FOUND');
    }

    const originalProject = projects[projectIndex];
    const projectTitleSanitized = sanitizeForPath(updatedProject.title);
    // Folder path relative to PROJECT_FILES_BASE_DIR
    const projectRelativeFolderPath = `${updatedProject.id}-${projectTitleSanitized}`;
    
    const updatedFilesWithRelativePath = updatedProject.files.map(file => {
        // If a file is newly added via updateProject, it might not have a path or an incorrect one.
        // We assume new files are just metadata (name, uploader) and need their path constructed.
        // Existing files should already have correct relative paths.
        // This logic primarily ensures new files get a path; existing paths are trusted unless title changes.
        if (!file.path || !file.path.startsWith(`${updatedProject.id}-`)) { // Simple check if it's a new file or path needs fixing
            console.log(`Assigning/Correcting path for file "${file.name}" in project ${updatedProject.id}`);
            return { ...file, path: `${projectRelativeFolderPath}/${file.name}` };
        }
        return file;
    });


    projects[projectIndex] = {
        ...updatedProject,
        files: updatedFilesWithRelativePath,
        workflowHistory: updatedProject.workflowHistory || originalProject.workflowHistory,
    };

    await writeProjects(projects);
    console.log(`Project ${updatedProject.id} updated successfully.`);

     const newlyAssignedDivision = projects[projectIndex].assignedDivision;
     if (newlyAssignedDivision && newlyAssignedDivision !== originalProject.assignedDivision && projects[projectIndex].status !== 'Completed' && projects[projectIndex].status !== 'Canceled') {
        const nextActionDesc = projects[projectIndex].nextAction || 'action';
       await notifyUsersByRole(newlyAssignedDivision, `Project "${projects[projectIndex].title}" requires your ${nextActionDesc}.`, projects[projectIndex].id);
     }
}

export async function updateProjectTitle(projectId: string, newTitle: string): Promise<void> {
    console.log(`Updating title for project ID: ${projectId} to "${newTitle}"`);
    await ensureProjectFilesBaseDirExists();
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`Project with ID "${projectId}" not found for title update.`);
        throw new Error('PROJECT_NOT_FOUND');
    }

    const originalProject = projects[projectIndex];
    const oldSanitizedTitle = sanitizeForPath(originalProject.title);
    const newSanitizedTitle = sanitizeForPath(newTitle);

    const oldProjectRelativeFolderPath = `${projectId}-${oldSanitizedTitle}`;
    const newProjectRelativeFolderPath = `${projectId}-${newSanitizedTitle}`;

    const oldProjectAbsoluteFolderPath = path.join(PROJECT_FILES_BASE_DIR, oldProjectRelativeFolderPath);
    const newProjectAbsoluteFolderPath = path.join(PROJECT_FILES_BASE_DIR, newProjectRelativeFolderPath);

    if (oldProjectRelativeFolderPath !== newProjectRelativeFolderPath) {
        console.log(`Sanitized title changed for project ${projectId}. Renaming folder and updating file paths.`);
        try {
            // Check if old folder exists before attempting to rename
             try {
                await fs.access(oldProjectAbsoluteFolderPath);
                await fs.rename(oldProjectAbsoluteFolderPath, newProjectAbsoluteFolderPath);
                console.log(`Renamed folder from "${oldProjectAbsoluteFolderPath}" to "${newProjectAbsoluteFolderPath}"`);
             } catch (renameError: any) {
                 if (renameError.code === 'ENOENT') {
                    console.warn(`Old project folder "${oldProjectAbsoluteFolderPath}" not found. Creating new folder "${newProjectAbsoluteFolderPath}" instead.`);
                    await fs.mkdir(newProjectAbsoluteFolderPath, { recursive: true });
                 } else {
                    throw renameError; // Re-throw other errors
                 }
             }

            projects[projectIndex].files = originalProject.files.map(file => {
                const updatedRelativePath = `${newProjectRelativeFolderPath}/${file.name}`;
                console.log(` -> Updating path for file "${file.name}": To "${updatedRelativePath}"`);
                return { ...file, path: updatedRelativePath };
            });
        } catch (error) {
            console.error(`Error renaming folder or updating file paths for project ${projectId}:`, error);
            // Potentially revert title change or handle error appropriately
            // For now, we'll proceed with title change in JSON but log the folder issue.
        }
    } else {
        console.log(`Sanitized title for project ${projectId} remains the same. No folder or file path update needed.`);
    }

    projects[projectIndex].title = newTitle;
    await writeProjects(projects);
    console.log(`Title for project ${projectId} updated successfully in JSON.`);
}


export async function reviseProject(projectId: string, reviserRole: string, revisionNote?: string): Promise<Project> {
    console.log(`Revising project ID: ${projectId} by ${reviserRole}. Note: "${revisionNote || 'N/A'}"`);
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`Project with ID "${projectId}" not found for revision.`);
        throw new Error('PROJECT_NOT_FOUND');
    }

    const currentProject = projects[projectIndex];
    let previousStatus = '';
    let previousAssignedDivision = '';
    let previousNextAction = '';
    let newProgress = currentProject.progress; 

    switch (currentProject.status) {
        case 'Pending Approval': 
            if (currentProject.progress === 20) { // Offer Approval stage
                previousStatus = 'Pending Offer';
                previousAssignedDivision = 'Admin Proyek';
                previousNextAction = 'Revise & Re-submit Offer Document';
                newProgress = 15; 
            } else if (currentProject.progress === 30) { // DP Invoice Approval stage
                previousStatus = 'Pending DP Invoice';
                previousAssignedDivision = 'General Admin';
                previousNextAction = 'Revise & Re-submit DP Invoice';
                newProgress = 25; 
            } else {
                throw new Error(`Cannot revise project in status "${currentProject.status}" with progress ${currentProject.progress}. Unknown approval type.`);
            }
            break;
        case 'Pending DP Invoice':
            previousStatus = 'Pending Approval'; 
            previousAssignedDivision = 'Owner';
            previousNextAction = 'Re-Approve Offer (Issue with DP Gen)'; // Owner needs to re-approve offer
            newProgress = 20; // Back to offer approval progress
            break;
        case 'Pending Admin Files':
            previousStatus = 'Pending Approval'; 
            previousAssignedDivision = 'Owner'; 
            previousNextAction = 'Re-Approve DP Invoice (Issue with Admin Files)';
            newProgress = 30; // Back to DP invoice approval progress
            break;
        case 'Pending Architect Files':
            previousStatus = 'Pending Admin Files';
            previousAssignedDivision = 'Admin Proyek';
            previousNextAction = 'Revise Admin Files';
            newProgress = 45;
            break;
        case 'Pending Structure Files':
            previousStatus = 'Pending Architect Files';
            previousAssignedDivision = 'Arsitek';
            previousNextAction = 'Revise Architect Files';
            newProgress = 65;
            break;
        case 'Pending Final Check':
            previousStatus = 'Pending Structure Files';
            previousAssignedDivision = 'Struktur';
            previousNextAction = 'Revise Structure Files';
            newProgress = 75;
            break;
        case 'Pending Scheduling':
            previousStatus = 'Pending Final Check';
            previousAssignedDivision = 'Admin Proyek';
            previousNextAction = 'Re-do Final Check';
            newProgress = 85;
            break;
        case 'Scheduled':
            previousStatus = 'Pending Scheduling';
            previousAssignedDivision = 'General Admin'; 
            previousNextAction = 'Reschedule Sidang';
            newProgress = 90; 
            break;
        default:
            console.error(`Project status "${currentProject.status}" is not revisable.`);
            throw new Error('PROJECT_STATUS_NOT_REVISABLE');
    }

    const revisionHistoryEntry: WorkflowHistoryEntry = {
        division: reviserRole,
        action: `Requested Revision. Sent back to ${previousAssignedDivision} for ${previousNextAction}.`,
        timestamp: new Date().toISOString(),
        note: revisionNote,
    };

    projects[projectIndex] = {
        ...currentProject,
        status: previousStatus,
        assignedDivision: previousAssignedDivision,
        nextAction: previousNextAction,
        progress: newProgress,
        workflowHistory: [...currentProject.workflowHistory, revisionHistoryEntry],
    };

    await writeProjects(projects);
    console.log(`Project ${projectId} revised. New status: ${previousStatus}, Assigned to: ${previousAssignedDivision}`);

    
    await notifyUsersByRole(
        previousAssignedDivision,
        `Project "${projects[projectIndex].title}" requires revision for: ${previousNextAction}. ${revisionNote ? `Note: ${revisionNote}` : ''}`,
        projectId
    );

    return projects[projectIndex];
}
