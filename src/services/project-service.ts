// src/services/project-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import { notifyUsersByRole } from './notification-service'; // Import notification service
import { sanitizeForPath } from '@/lib/path-utils';
import { PROJECT_FILES_BASE_DIR } from '@/config/file-constants'; // Import from new location

// Define the structure of a Workflow History entry
export interface WorkflowHistoryEntry {
    division: string;
    action: string;
    timestamp: string; // ISO string
    note?: string; // Optional note for revisions or other actions
}

// Define the structure of an uploaded file entry
export interface FileEntry {
    name: string; // Original filename
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
    initialFiles: Omit<FileEntry, 'timestamp' | 'path' >[]; 
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
        if (data.trim() === "") {
            console.warn("Project database file is empty. Initializing with an empty array.");
            await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        const parsedData = JSON.parse(data);
        if (!Array.isArray(parsedData)) {
            console.error("Project database file does not contain a valid JSON array. Resetting.");
            await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        return (parsedData as Project[]).map(project => ({
            ...project,
            files: project.files.map(file => {
                if (!file.path) {
                    const projectTitleSanitized = sanitizeForPath(project.title);
                    const relativePath = `${project.id}-${projectTitleSanitized}/${sanitizeForPath(file.name)}`; // Sanitize file name in path
                    console.warn(`File "${file.name}" in project "${project.id}" was missing a path. Assigning: ${relativePath}`);
                    return { ...file, path: relativePath };
                }
                return file;
            })
        }));
    } catch (error: any) {
        console.error("Error reading or parsing project database:", error);
         if (error instanceof SyntaxError) {
            console.warn(`SyntaxError in project database: ${error.message}. Attempting to reset.`);
        }
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

export async function ensureProjectFilesBaseDirExists(): Promise<void> {
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
    await ensureProjectFilesBaseDirExists(); 

    const projects = await readProjects();
    const now = new Date().toISOString();
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const projectTitleSanitized = sanitizeForPath(projectData.title);
    
    const projectRelativeFolderPath = `${projectId}-${projectTitleSanitized}`;
    const projectAbsoluteFolderPath = path.join(PROJECT_FILES_BASE_DIR, projectRelativeFolderPath);

    try {
        await fs.mkdir(projectAbsoluteFolderPath, { recursive: true });
        console.log(`Created folder for project ${projectId} at: ${projectAbsoluteFolderPath}`);
    } catch (error) {
        console.error(`Error creating folder for project ${projectId} at ${projectAbsoluteFolderPath}:`, error);
        // No need to throw here, as we still want to save the project metadata
    }

    const filesWithMetadata: FileEntry[] = projectData.initialFiles.map(file => ({
        name: file.name, 
        uploadedBy: file.uploadedBy, 
        timestamp: now,
        path: `${projectRelativeFolderPath}/${sanitizeForPath(file.name)}`, // Sanitize individual file names for path
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
                 action: `Registered initial file: ${file.name}`,
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
    
    projects[projectIndex] = {
        ...updatedProject,
        workflowHistory: updatedProject.workflowHistory || projects[projectIndex].workflowHistory,
    };

    await writeProjects(projects);
    console.log(`Project ${updatedProject.id} updated successfully.`);

     const newlyUpdatedProject = projects[projectIndex]; 
     const newlyAssignedDivision = newlyUpdatedProject.assignedDivision;
     const currentStatus = newlyUpdatedProject.status;
     
     // To get the previous state accurately for comparison, we should read it *before* modification
     // However, for simplicity here, we'll assume the notification logic only needs the new state
     // For a more robust system, one might pass previousAssignedDivision or fetch it before updating `projects[projectIndex]`

     if (newlyAssignedDivision && 
        currentStatus !== 'Completed' && currentStatus !== 'Canceled'
        ) {
        const nextActionDesc = newlyUpdatedProject.nextAction || 'action';
        // We need to ensure we are not re-notifying the same division if only other details changed
        // This simple check might not be enough if a project is revised back to a division.
        // A more complex notification logic might be needed if re-notification is an issue.
       await notifyUsersByRole(newlyAssignedDivision, `Project "${newlyUpdatedProject.title}" requires your ${nextActionDesc}.`, newlyUpdatedProject.id);
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
        console.log(`Sanitized title changed for project ${projectId}. Attempting to rename folder and update file paths.`);
        try {
             try {
                await fs.access(oldProjectAbsoluteFolderPath); // Check if old folder exists
                await fs.rename(oldProjectAbsoluteFolderPath, newProjectAbsoluteFolderPath);
                console.log(`Renamed folder from "${oldProjectAbsoluteFolderPath}" to "${newProjectAbsoluteFolderPath}"`);
             } catch (renameError: any) {
                 if (renameError.code === 'ENOENT') { // ENOENT: No such file or directory
                    console.warn(`Old project folder "${oldProjectAbsoluteFolderPath}" not found. Creating new folder "${newProjectAbsoluteFolderPath}" instead.`);
                    await fs.mkdir(newProjectAbsoluteFolderPath, { recursive: true });
                 } else {
                    console.error(`Error during folder rename operation for project ${projectId}:`, renameError);
                 }
             }

            projects[projectIndex].files = originalProject.files.map(file => {
                const sanitizedFileName = sanitizeForPath(file.name);
                const updatedRelativePath = `${newProjectRelativeFolderPath}/${sanitizedFileName}`;
                console.log(` -> Updating path for file "${file.name}": To "${updatedRelativePath}"`);
                return { ...file, path: updatedRelativePath };
            });
        } catch (error) {
            console.error(`Error processing folder rename or file path updates for project ${projectId}:`, error);
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
            if (currentProject.progress === 20) { 
                previousStatus = 'Pending Offer';
                previousAssignedDivision = 'Admin Proyek';
                previousNextAction = 'Revise & Re-submit Offer Document';
                newProgress = 15; 
            } else if (currentProject.progress === 30) { 
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
            previousNextAction = 'Re-Approve Offer (Issue with DP Gen)'; 
            newProgress = 20; 
            break;
        case 'Pending Admin Files':
            previousStatus = 'Pending Approval'; 
            previousAssignedDivision = 'Owner'; 
            previousNextAction = 'Re-Approve DP Invoice (Issue with Admin Files)';
            newProgress = 30; 
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
