// src/services/project-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import { notifyUsersByRole } from './notification-service';
import { sanitizeForPath } from '@/lib/path-utils';
import { PROJECT_FILES_BASE_DIR } from '@/config/file-constants';
import type { Workflow, WorkflowStep, WorkflowStepTransition } from './workflow-service'; // Assuming these types are exported from workflow-service
import { getWorkflowById, getFirstStep, getTransitionInfo } from './workflow-service';


// Define the structure of a Workflow History entry
export interface WorkflowHistoryEntry {
    division: string; // The role/division that performed the action
    action: string; // Description of the action taken
    timestamp: string; // ISO string
    note?: string; // Optional note for revisions or other actions
}

// Define the structure of an uploaded file entry
export interface FileEntry {
    name: string; // Original filename
    uploadedBy: string; // Username or ID of the uploader
    timestamp: string; // ISO string
    path: string; // Path relative to PROJECT_FILES_BASE_DIR
}

// Define the structure of a Project
export interface Project {
    id: string;
    title: string;
    status: string;
    progress: number;
    assignedDivision: string;
    nextAction: string | null;
    workflowHistory: WorkflowHistoryEntry[];
    files: FileEntry[];
    createdAt: string;
    createdBy: string;
    workflowId: string; // ID of the workflow this project is using
    scheduleDetails?: { // Optional schedule details
        date: string;
        time: string;
        location: string;
    };
}

// Define the structure for adding a new project
export interface AddProjectData {
    title: string;
    workflowId: string;
    initialFiles: Omit<FileEntry, 'timestamp' | 'path'>[];
    createdBy: string;
}

// Structure for updating project (used by client-side actions)
export interface UpdateProjectParams {
    projectId: string;
    updaterRole: string;
    updaterUsername: string;
    actionTaken: string; // e.g., "submitted", "approved", "rejected", "scheduled"
    files?: Omit<FileEntry, 'timestamp'>[]; // New files uploaded in this step
    note?: string;
    scheduleDetails?: { date: string; time: string; location: string };
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
            files: project.files?.map(file => { // Add null check for project.files
                if (!file.path && project.id && project.title && file.name) { // Add null checks
                    const projectTitleSanitized = sanitizeForPath(project.title);
                    const relativePath = `${project.id}-${projectTitleSanitized}/${sanitizeForPath(file.name)}`;
                    console.warn(`File "${file.name}" in project "${project.id}" was missing a path. Assigning: ${relativePath}`);
                    return { ...file, path: relativePath };
                }
                return file;
            }) || [], // Default to empty array if project.files is undefined
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
        console.log(`Project data successfully written to: ${DB_PATH}. Total projects: ${projects.length}`);
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
    console.log(`Adding new project: "${projectData.title}", Workflow: ${projectData.workflowId}, by: ${projectData.createdBy}`);
    await ensureProjectFilesBaseDirExists();

    const projects = await readProjects();
    const now = new Date().toISOString();
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const projectTitleSanitized = sanitizeForPath(projectData.title);

    const projectRelativeFolderPath = `${projectId}-${projectTitleSanitized}`;
    const projectAbsoluteFolderPath = path.join(PROJECT_FILES_BASE_DIR, projectRelativeFolderPath);

    try {
        await fs.mkdir(projectAbsoluteFolderPath, { recursive: true });
    } catch (error) {
        console.error(`Error creating folder for project ${projectId}:`, error);
    }

    const filesWithMetadata: FileEntry[] = projectData.initialFiles.map(file => ({
        name: file.name,
        uploadedBy: projectData.createdBy, // Initial files are uploaded by the creator
        timestamp: now,
        path: `${projectRelativeFolderPath}/${sanitizeForPath(file.name)}`,
    }));

    const firstStep = await getFirstStep(projectData.workflowId);
    if (!firstStep) {
        console.error(`Cannot create project: Workflow ID "${projectData.workflowId}" not found or has no steps.`);
        throw new Error('WORKFLOW_INVALID');
    }

    const newProject: Project = {
        id: projectId,
        title: projectData.title,
        status: firstStep.status,
        progress: firstStep.progress,
        assignedDivision: firstStep.assignedDivision,
        nextAction: firstStep.nextActionDescription,
        workflowId: projectData.workflowId,
        workflowHistory: [
            { division: projectData.createdBy, action: 'Created Project', timestamp: now },
            ...filesWithMetadata.map(file => ({
                 division: file.uploadedBy,
                 action: `Registered initial file: ${file.name}`,
                 timestamp: file.timestamp,
            })),
            { division: 'System', action: `Assigned to ${firstStep.assignedDivision} for ${firstStep.nextActionDescription || 'initial step'}`, timestamp: now }
        ],
        files: filesWithMetadata,
        createdAt: now,
        createdBy: projectData.createdBy,
    };

    projects.push(newProject);
    await writeProjects(projects);
    console.log(`Project "${newProject.title}" (ID: ${newProject.id}) added successfully. Assigned to ${firstStep.assignedDivision} for ${firstStep.nextActionDescription}.`);

    if (firstStep.assignedDivision) {
        await notifyUsersByRole(
            firstStep.assignedDivision,
            `New project "${newProject.title}" created. Please ${firstStep.nextActionDescription || 'proceed with the first step'}.`,
            newProject.id
        );
    }
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

export async function updateProject(params: UpdateProjectParams): Promise<Project> {
    const {
        projectId,
        updaterRole,
        updaterUsername,
        actionTaken, // e.g., "submitted", "approved", "rejected", "scheduled"
        files: newFilesData = [], // New files uploaded in this step
        note,
        scheduleDetails
    } = params;

    console.log(`Updating project ID: ${projectId}. Action: "${actionTaken}" by ${updaterRole} (${updaterUsername}). Note: "${note || 'N/A'}"`);
    await ensureProjectFilesBaseDirExists();
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`Project with ID "${projectId}" not found for update.`);
        throw new Error('PROJECT_NOT_FOUND');
    }

    const currentProject = projects[projectIndex];
    const now = new Date().toISOString();

    const transitionInfo = await getTransitionInfo(currentProject.workflowId, currentProject.status, currentProject.progress, actionTaken);

    if (!transitionInfo && !['Completed', 'Canceled'].includes(currentProject.status) ) {
         // Allow updates to files/notes even if no specific state transition, but only if not terminal
        console.warn(`No specific transition info for action "${actionTaken}" from status "${currentProject.status}". Updating files/notes if any.`);
    }


    const projectTitleSanitized = sanitizeForPath(currentProject.title);
    const projectRelativeFolderPath = `${currentProject.id}-${projectTitleSanitized}`;

    const uploadedFileEntries: FileEntry[] = newFilesData.map(fileData => ({
        name: fileData.name,
        uploadedBy: updaterUsername,
        timestamp: now,
        path: `${projectRelativeFolderPath}/${sanitizeForPath(fileData.name)}`,
    }));

    const newWorkflowHistoryEntry: WorkflowHistoryEntry = {
        division: updaterRole, // Could be updaterUsername if more granularity is needed
        action: `${updaterUsername} (${updaterRole}) ${actionTaken} ${currentProject.nextAction || 'progress'}.`, // More descriptive action
        timestamp: now,
        note: note,
    };
     if (actionTaken === 'scheduled' && scheduleDetails) {
        newWorkflowHistoryEntry.action = `${updaterUsername} (${updaterRole}) scheduled Sidang for ${new Date(scheduleDetails.date + 'T' + scheduleDetails.time).toISOString()}`;
        newWorkflowHistoryEntry.note = `Location: ${scheduleDetails.location}. ${note ? `Note: ${note}` : ''}`;
    }


    let updatedProject: Project = {
        ...currentProject,
        files: [...currentProject.files, ...uploadedFileEntries],
        workflowHistory: [...currentProject.workflowHistory, newWorkflowHistoryEntry],
    };

    if (transitionInfo) {
        updatedProject.status = transitionInfo.targetStatus;
        updatedProject.assignedDivision = transitionInfo.targetAssignedDivision;
        updatedProject.nextAction = transitionInfo.targetNextActionDescription;
        updatedProject.progress = transitionInfo.targetProgress;
    }
    
    if (actionTaken === 'scheduled' && scheduleDetails) {
        updatedProject.scheduleDetails = scheduleDetails;
    }


    projects[projectIndex] = updatedProject;
    await writeProjects(projects);
    console.log(`Project ${projectId} updated. New status: ${updatedProject.status}, Assigned to: ${updatedProject.assignedDivision}`);

    if (transitionInfo && transitionInfo.notification && transitionInfo.targetAssignedDivision) {
        const message = transitionInfo.notification.message
            .replace('{projectName}', updatedProject.title)
            .replace('{newStatus}', updatedProject.status); // Simple replacement, can be more dynamic
        await notifyUsersByRole(transitionInfo.targetAssignedDivision, message, projectId);
    }

    return updatedProject;
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
                await fs.access(oldProjectAbsoluteFolderPath);
                await fs.rename(oldProjectAbsoluteFolderPath, newProjectAbsoluteFolderPath);
                console.log(`Renamed folder from "${oldProjectAbsoluteFolderPath}" to "${newProjectAbsoluteFolderPath}"`);
             } catch (renameError: any) {
                 if (renameError.code === 'ENOENT') {
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


export async function reviseProject(
    projectId: string,
    reviserUsername: string,
    reviserRole: string,
    revisionNote?: string
): Promise<Project> {
    console.log(`Revising project ID: ${projectId} by ${reviserRole} (${reviserUsername}). Note: "${revisionNote || 'N/A'}"`);
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`Project with ID "${projectId}" not found for revision.`);
        throw new Error('PROJECT_NOT_FOUND');
    }

    const currentProject = projects[projectIndex];
    const workflow = await getWorkflowById(currentProject.workflowId);

    if (!workflow) {
        console.error(`Workflow with ID "${currentProject.workflowId}" for project "${projectId}" not found.`);
        throw new Error('WORKFLOW_NOT_FOUND');
    }

    // Try to find a 'revise' transition from the current step
    const revisionTransition = await getTransitionInfo(currentProject.workflowId, currentProject.status, currentProject.progress, 'revise');

    if (revisionTransition) {
        const historyEntry: WorkflowHistoryEntry = {
            division: reviserRole,
            action: `${reviserUsername} (${reviserRole}) requested revision. Project sent to ${revisionTransition.targetAssignedDivision} for ${revisionTransition.targetNextActionDescription || 'revision'}.`,
            timestamp: new Date().toISOString(),
            note: revisionNote,
        };

        projects[projectIndex] = {
            ...currentProject,
            status: revisionTransition.targetStatus,
            assignedDivision: revisionTransition.targetAssignedDivision,
            nextAction: revisionTransition.targetNextActionDescription,
            progress: revisionTransition.targetProgress,
            workflowHistory: [...currentProject.workflowHistory, historyEntry],
        };

        await writeProjects(projects);
        console.log(`Project ${projectId} revised via workflow. New status: ${projects[projectIndex].status}, Assigned to: ${projects[projectIndex].assignedDivision}`);

        if (revisionTransition.notification && revisionTransition.targetAssignedDivision) {
            const message = revisionTransition.notification.message
                .replace('{projectName}', projects[projectIndex].title)
                .replace('{newStatus}', projects[projectIndex].status)
                .replace('{reasonNote}', revisionNote || 'N/A');
            await notifyUsersByRole(revisionTransition.targetAssignedDivision, message, projectId);
        }
        return projects[projectIndex];

    } else {
        // Fallback to older, less flexible revision logic if 'revise' transition is not defined
        console.warn(`No explicit 'revise' transition found for project ${projectId} status ${currentProject.status}. Attempting fallback revision logic.`);
        let previousStatus = '';
        let previousAssignedDivision = '';
        let previousNextAction = '';
        let newProgress = currentProject.progress;

        // This fallback logic might need significant updates to be truly workflow-aware
        // For now, it's a simplified version of your previous logic.
        // Ideally, all revision paths should be defined in the workflow transitions.
        const currentStepIndex = workflow.steps.findIndex(s => s.status === currentProject.status && s.progress === currentProject.progress);
        if (currentStepIndex > 0) {
            const previousStep = workflow.steps[currentStepIndex - 1];
            previousStatus = previousStep.status;
            previousAssignedDivision = previousStep.assignedDivision;
            previousNextAction = `Revise: ${previousStep.nextActionDescription || previousStep.stepName}`;
            newProgress = previousStep.progress;
        } else {
            console.error(`Cannot determine previous step for project ${projectId} in status ${currentProject.status}. Cannot revise.`);
            throw new Error('CANNOT_DETERMINE_PREVIOUS_STEP_FOR_REVISION');
        }


        const historyEntry: WorkflowHistoryEntry = {
            division: reviserRole,
            action: `${reviserUsername} (${reviserRole}) requested revision. Project sent back to ${previousAssignedDivision} for ${previousNextAction}.`,
            timestamp: new Date().toISOString(),
            note: revisionNote,
        };

        projects[projectIndex] = {
            ...currentProject,
            status: previousStatus,
            assignedDivision: previousAssignedDivision,
            nextAction: previousNextAction,
            progress: newProgress,
            workflowHistory: [...currentProject.workflowHistory, historyEntry],
        };

        await writeProjects(projects);
        console.log(`Project ${projectId} revised (fallback). New status: ${previousStatus}, Assigned to: ${previousAssignedDivision}`);
        
        if (previousAssignedDivision) {
            await notifyUsersByRole(
                previousAssignedDivision,
                `Project "${projects[projectIndex].title}" requires revision for: ${previousNextAction}. ${revisionNote ? `Note: ${revisionNote}` : ''}`,
                projectId
            );
        }
        return projects[projectIndex];
    }
}

export async function manuallyUpdateProjectStatusAndAssignment({
    projectId,
    newStatus,
    newAssignedDivision,
    newNextAction,
    newProgress,
    adminUsername,
    reasonNote
}: {
    projectId: string;
    newStatus: string;
    newAssignedDivision: string;
    newNextAction: string | null;
    newProgress: number;
    adminUsername: string;
    reasonNote: string;
}): Promise<Project> {
    console.log(`Manually updating project ID: ${projectId} by admin ${adminUsername}. New Status: ${newStatus}, New Division: ${newAssignedDivision}`);
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`Project with ID "${projectId}" not found for manual update.`);
        throw new Error('PROJECT_NOT_FOUND');
    }

    const currentProject = projects[projectIndex];

    const historyEntry: WorkflowHistoryEntry = {
        division: adminUsername, // Or a generic 'Admin' role
        action: `Manually changed status to "${newStatus}" and assigned to "${newAssignedDivision}".`,
        timestamp: new Date().toISOString(),
        note: `Reason: ${reasonNote}`,
    };

    const updatedProjectData: Project = {
        ...currentProject,
        status: newStatus,
        assignedDivision: newAssignedDivision,
        nextAction: newNextAction,
        progress: newProgress,
        workflowHistory: [...currentProject.workflowHistory, historyEntry],
    };

    projects[projectIndex] = updatedProjectData;
    await writeProjects(projects);
    console.log(`Project ${projectId} manually updated. New status: ${newStatus}, Assigned to: ${newAssignedDivision}`);

    // Notify the new assigned division if it's different and the project is not completed/canceled
    if (newAssignedDivision && newAssignedDivision !== currentProject.assignedDivision && newStatus !== 'Completed' && newStatus !== 'Canceled') {
        const notificationMessage = `Project "${updatedProjectData.title}" has been manually assigned to your division with status "${newStatus}". Next action: ${newNextAction || 'Review project'}. Reason: ${reasonNote}`;
        await notifyUsersByRole(newAssignedDivision, notificationMessage, projectId);
    } else if (newAssignedDivision && newAssignedDivision === currentProject.assignedDivision && (newStatus !== currentProject.status || newNextAction !== currentProject.nextAction ) && newStatus !== 'Completed' && newStatus !== 'Canceled') {
         const notificationMessage = `Project "${updatedProjectData.title}" status has been manually changed to "${newStatus}". Next action: ${newNextAction || 'Review project'}. Reason: ${reasonNote}`;
        await notifyUsersByRole(newAssignedDivision, notificationMessage, projectId);
    }


    return projects[projectIndex];
}

    