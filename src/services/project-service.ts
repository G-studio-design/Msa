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

// Define the structure of an uploaded file entry
export interface FileEntry {
    name: string;
    uploadedBy: string; // Username or ID of the uploader
    timestamp: string; // ISO string
    path: string; // Simulated folder path, e.g., projects/project_id-project_title/filename.ext
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
    initialFiles: Omit<FileEntry, 'timestamp' | 'path'>[]; // Files provided at creation
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
        return (parsedData as Project[]).map(project => ({
            ...project,
            files: project.files.map(file => ({
                ...file,
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

export async function addProject(projectData: AddProjectData): Promise<Project> {
    console.log('Adding new project:', projectData.title, 'by', projectData.createdBy);
    const projects = await readProjects();
    const now = new Date().toISOString();
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const projectTitleSanitized = sanitizeForPath(projectData.title);
    const basePath = `projects/${projectId}-${projectTitleSanitized}`;

    const filesWithMetadata: FileEntry[] = projectData.initialFiles.map(file => ({
        ...file,
        timestamp: now,
        path: `${basePath}/${file.name}`,
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
    console.log(`Project "${newProject.title}" (ID: ${newProject.id}) added successfully. Path: ${basePath}. Assigned to ${initialAssignedDivision} for ${initialNextAction}.`);

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
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === updatedProject.id);

    if (projectIndex === -1) {
        console.error(`Project with ID "${updatedProject.id}" not found for update.`);
        throw new Error('PROJECT_NOT_FOUND');
    }

    const originalProject = projects[projectIndex];
    const projectTitleSanitized = sanitizeForPath(updatedProject.title);
    const basePath = `projects/${updatedProject.id}-${projectTitleSanitized}`;

    const updatedFilesWithPath = updatedProject.files.map(file => {
        if (!file.path) {
            console.log(`Assigning path to new file "${file.name}" in project ${updatedProject.id}`);
            return { ...file, path: `${basePath}/${file.name}` };
        }
        const currentFileName = file.name;
        const expectedPath = `${basePath}/${currentFileName}`;
        if (file.path !== expectedPath && originalProject.title !== updatedProject.title) { // Only update if title actually changed
           console.log(`Correcting path for existing file "${file.name}" due to project title change. Old: ${file.path}, New: ${expectedPath}`);
           return { ...file, path: expectedPath };
        }
        return file;
    });

    projects[projectIndex] = {
        ...updatedProject, // Apply all updates from the payload first
        files: updatedFilesWithPath, // Then ensure files have correct paths
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
     let projects = await readProjects();
     const projectIndex = projects.findIndex(p => p.id === projectId);

     if (projectIndex === -1) {
         console.error(`Project with ID "${projectId}" not found for title update.`);
         throw new Error('PROJECT_NOT_FOUND');
     }

     const originalProject = projects[projectIndex];
     const oldTitleSanitized = sanitizeForPath(originalProject.title);
     const newTitleSanitized = sanitizeForPath(newTitle);

     if (oldTitleSanitized !== newTitleSanitized) {
         console.log(`Sanitized title changed for project ${projectId}. Updating file paths.`);
         const newBasePath = `projects/${projectId}-${newTitleSanitized}`;

         projects[projectIndex].files = originalProject.files.map(file => {
             const expectedNewPath = `${newBasePath}/${file.name}`;
             console.log(` -> Updating path for file "${file.name}": From "${file.path}" to "${expectedNewPath}"`);
             return { ...file, path: expectedNewPath };
         });
     } else {
        console.log(`Sanitized title for project ${projectId} remains the same. No file path update needed.`);
     }

    projects[projectIndex].title = newTitle;
    await writeProjects(projects);
    console.log(`Title for project ${projectId} updated successfully.`);
}

/**
 * Reverts a project to its previous workflow stage.
 * @param projectId The ID of the project to revise.
 * @param reviserRole The role of the user initiating the revision.
 * @param revisionNote An optional note explaining the reason for revision.
 * @returns A promise that resolves to the updated Project object.
 * @throws an error if the project is not found or if the status is not revisable.
 */
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
    let newProgress = currentProject.progress; // Default to current progress

    // Determine the previous state based on the current state
    switch (currentProject.status) {
        case 'Pending Approval': // Could be for Offer or DP Invoice
            if (currentProject.nextAction?.includes('Offer')) { // Assuming nextAction helps differentiate
                previousStatus = 'Pending Offer';
                previousAssignedDivision = 'Admin Proyek';
                previousNextAction = 'Revise & Re-submit Offer Document';
                newProgress = 15; // Slightly rolled back
            } else if (currentProject.nextAction?.includes('DP Invoice')) {
                previousStatus = 'Pending DP Invoice';
                previousAssignedDivision = 'General Admin';
                previousNextAction = 'Revise & Re-submit DP Invoice';
                newProgress = 25; // Slightly rolled back
            } else {
                throw new Error(`Cannot revise project in status "${currentProject.status}" with next action "${currentProject.nextAction}". Unknown approval type.`);
            }
            break;
        case 'Pending DP Invoice':
            previousStatus = 'Pending Offer'; // Assuming revision sends it way back to Offer stage for re-evaluation by Admin Proyek.
            previousAssignedDivision = 'Admin Proyek';
            previousNextAction = 'Re-evaluate/Revise Offer (DP Stage Revision)';
            newProgress = 15;
            break;
        case 'Pending Admin Files':
            previousStatus = 'Pending Approval'; // Assuming it means DP Invoice was approved, now AP needs to revise Admin files
            previousAssignedDivision = 'Owner'; // Send back to Owner to re-approve (or AP to fix files if Owner is the one revising)
            previousNextAction = 'Re-approve DP Invoice (Admin Files Revised)';
            // Or, more directly:
            // previousStatus = 'Pending Admin Files'; // Stays here
            // previousAssignedDivision = 'Admin Proyek';
            // previousNextAction = 'Revise Admin Files';
            // For now, let's assume it goes back to the step *before* Admin Files for simplicity
            previousStatus = 'Pending Approval'; // Assuming it means DP Invoice stage
            previousAssignedDivision = 'Owner'; // Re-approve DP
            previousNextAction = 'Re-Approve DP Invoice (Issue with Admin Files)';
            newProgress = 35;
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
            previousAssignedDivision = 'General Admin'; // Or Owner, depending on who schedules
            previousNextAction = 'Reschedule Sidang';
            newProgress = 90; // Keep high as it was already scheduled
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

    // Notify the division responsible for the revised step
    await notifyUsersByRole(
        previousAssignedDivision,
        `Project "${projects[projectIndex].title}" requires revision for: ${previousNextAction}. ${revisionNote ? `Note: ${revisionNote}` : ''}`,
        projectId
    );

    return projects[projectIndex];
}