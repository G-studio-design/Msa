// src/services/project-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import { notifyUsersByRole } from './notification-service';
import { sanitizeForPath } from '@/lib/path-utils';
import { PROJECT_FILES_BASE_DIR } from '@/config/file-constants';
import type { Workflow, WorkflowStep, WorkflowStepTransition } from './workflow-service';
import { getWorkflowById, getFirstStep, getTransitionInfo, DEFAULT_WORKFLOW_ID } from '@/config/workflow-constants'; // Import DEFAULT_WORKFLOW_ID from config

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
        date: string; // YYYY-MM-DD
        time: string; // HH:MM
        location: string;
    };
    surveyDetails?: { // Optional survey details
        date: string; // YYYY-MM-DD
        time: string; // HH:MM
        description: string;
    };
}

// Define the structure for adding a new project
export interface AddProjectData {
    title: string;
    workflowId: string; // User will select a workflow
    initialFiles: Omit<FileEntry, 'timestamp' | 'path'>[]; // Path will be constructed
    createdBy: string; // Username of the creator
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
    surveyDetails?: { date: string; time: string; description: string };
}

const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'projects.json');

// --- Helper Functions ---

async function readProjects(): Promise<Project[]> {
    try {
        await fs.access(DB_PATH);
    } catch (error) {
        console.log("[ProjectService] Project database file not found, creating a new one.");
        await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
        return [];
    }

    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        if (data.trim() === "") {
            console.warn("[ProjectService] Project database file is empty. Initializing with an empty array.");
            await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        const parsedData = JSON.parse(data);
        if (!Array.isArray(parsedData)) {
            console.error("[ProjectService] Project database file does not contain a valid JSON array. Resetting.");
            await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        return (parsedData as Project[]).map(project => ({
            ...project,
            files: project.files?.map(file => {
                if (!file.path && project.id && project.title && file.name) {
                    const projectTitleSanitized = sanitizeForPath(project.title);
                    const relativePath = `${project.id}-${projectTitleSanitized}/${sanitizeForPath(file.name)}`;
                    console.warn(`[ProjectService] File "${file.name}" in project "${project.id}" was missing a path. Assigning: ${relativePath}`);
                    return { ...file, path: relativePath };
                }
                return file;
            }) || [],
            workflowId: project.workflowId || DEFAULT_WORKFLOW_ID,
        }));
    } catch (error: any) {
        console.error("[ProjectService] Error reading or parsing project database:", error);
         if (error instanceof SyntaxError) {
            console.warn(`[ProjectService] SyntaxError in project database: ${error.message}. Attempting to reset.`);
        }
         try {
             console.log("[ProjectService] Attempting to reset project database due to read/parse error.");
             await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
             return [];
         } catch (writeError) {
             console.error("[ProjectService] Failed to reset project database:", writeError);
             throw new Error('Failed to read or reset project data.');
         }
    }
}

async function writeProjects(projects: Project[]): Promise<void> {
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(projects, null, 2), 'utf8');
        console.log(`[ProjectService] Project data successfully written to: ${DB_PATH}. Total projects: ${projects.length}`);
    } catch (error) {
        console.error("[ProjectService] Error writing project database:", error);
        throw new Error('Failed to save project data.');
    }
}

export async function ensureProjectFilesBaseDirExists(): Promise<void> {
    try {
        await fs.mkdir(PROJECT_FILES_BASE_DIR, { recursive: true });
        console.log(`[ProjectService] Project files base directory ensured at: ${PROJECT_FILES_BASE_DIR}`);
    } catch (error) {
        console.error(`[ProjectService] Error creating project files base directory ${PROJECT_FILES_BASE_DIR}:`, error);
        throw new Error('Failed to create project files base directory.');
    }
}

// --- Main Service Functions ---

export async function addProject(projectData: AddProjectData): Promise<Project> {
    console.log(`[ProjectService] Adding new project: "${projectData.title}", Workflow: ${projectData.workflowId}, by: ${projectData.createdBy}`);
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
        console.error(`[ProjectService] Error creating folder for project ${projectId}:`, error);
        // Continue even if folder creation fails, project metadata can still be saved.
    }

    const filesWithMetadata: FileEntry[] = projectData.initialFiles.map(file => ({
        name: file.name,
        uploadedBy: projectData.createdBy,
        timestamp: now,
        path: `${projectRelativeFolderPath}/${sanitizeForPath(file.name)}`, // Ensure files use sanitized name in path
    }));

    const workflow = await getWorkflowById(projectData.workflowId);
    const firstStep = workflow ? getFirstStep(workflow) : null;

    if (!firstStep) {
        console.error(`[ProjectService] Cannot create project: Workflow ID "${projectData.workflowId}" not found or has no steps.`);
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
    console.log(`[ProjectService] Project "${newProject.title}" (ID: ${newProject.id}) added successfully. Assigned to ${firstStep.assignedDivision} for ${firstStep.nextActionDescription}.`);

    if (firstStep.assignedDivision && firstStep.transitions?.submitted?.notification) {
        const notificationConfig = firstStep.transitions.submitted.notification;
        if (notificationConfig.division) {
            const message = notificationConfig.message.replace('{projectName}', newProject.title);
             await notifyUsersByRole(
                notificationConfig.division,
                message,
                newProject.id
            );
        }
    }
    return newProject;
}

export async function getAllProjects(): Promise<Project[]> {
    console.log("[ProjectService] Fetching all projects from database.");
    let projects = await readProjects();
    let projectsModified = false;

    projects = projects.map(project => {
        if (!project.workflowId) {
            console.warn(`[ProjectService] Project ID ${project.id} ("${project.title}") is missing a workflowId. Assigning default workflow: ${DEFAULT_WORKFLOW_ID}`);
            projectsModified = true;
            return { ...project, workflowId: DEFAULT_WORKFLOW_ID };
        }
        return project;
    });

    if (projectsModified) {
        console.log("[ProjectService] One or more projects were updated with a default workflowId. Saving changes to projects.json.");
        await writeProjects(projects);
    }

    projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return projects;
}

export async function getProjectById(projectId: string): Promise<Project | null> {
    console.log(`[ProjectService] Fetching project with ID: ${projectId}`);
    const projects = await readProjects();
    const project = projects.find(p => p.id === projectId) || null;
    if (project && !project.workflowId) {
        console.warn(`[ProjectService] Project with ID "${projectId}" was found but is missing a workflowId. Assigning default: ${DEFAULT_WORKFLOW_ID}`);
        return { ...project, workflowId: DEFAULT_WORKFLOW_ID };
    }
    if (!project) {
        console.warn(`[ProjectService] Project with ID "${projectId}" not found.`);
    }
    return project;
}

export async function updateProject(params: UpdateProjectParams): Promise<Project> {
    const {
        projectId,
        updaterRole,
        updaterUsername,
        actionTaken,
        files: newFilesData = [],
        note,
        scheduleDetails,
        surveyDetails // Added surveyDetails
    } = params;

    console.log(`[ProjectService] Updating project ID: ${projectId}. Action: "${actionTaken}" by ${updaterRole} (${updaterUsername}). Note: "${note || 'N/A'}"`);
    await ensureProjectFilesBaseDirExists();
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`[ProjectService] Project with ID "${projectId}" not found for update.`);
        throw new Error('PROJECT_NOT_FOUND');
    }

    const currentProject = projects[projectIndex];
    const projectWorkflowId = currentProject.workflowId || DEFAULT_WORKFLOW_ID;

    const now = new Date().toISOString();

    const transitionInfo = await getTransitionInfo(projectWorkflowId, currentProject.status, currentProject.progress, actionTaken);

    const projectTitleSanitized = sanitizeForPath(currentProject.title);
    const projectRelativeFolderPath = `${currentProject.id}-${projectTitleSanitized}`;

    const uploadedFileEntries: FileEntry[] = newFilesData.map(fileData => ({
        name: fileData.name,
        uploadedBy: updaterUsername,
        timestamp: now,
        path: `${projectRelativeFolderPath}/${sanitizeForPath(fileData.name)}`,
    }));

    let historyAction = `${updaterUsername} (${updaterRole}) ${actionTaken} for "${currentProject.nextAction || 'progress'}"`;
    if (actionTaken === 'scheduled' && scheduleDetails) {
        historyAction = `${updaterUsername} (${updaterRole}) scheduled Sidang for ${new Date(scheduleDetails.date + 'T' + scheduleDetails.time).toISOString()}`;
    } else if (actionTaken === 'submitted' && surveyDetails) {
        historyAction = `${updaterUsername} (${updaterRole}) submitted Survey Details for ${new Date(surveyDetails.date + 'T' + surveyDetails.time).toISOString()}`;
    } else if (actionTaken === 'approved') {
        historyAction = `${updaterUsername} (${updaterRole}) approved: ${currentProject.nextAction || 'current step'}`;
    } else if (actionTaken === 'rejected' || actionTaken === 'canceled') {
        historyAction = `${updaterUsername} (${updaterRole}) ${actionTaken}: ${currentProject.nextAction || 'current step'}`;
    } else if (['completed', 'revise_after_sidang', 'canceled_after_sidang'].includes(actionTaken)) {
         historyAction = `${updaterUsername} (${updaterRole}) declared Sidang outcome as: ${actionTaken.replace('_after_sidang', '').replace('_', ' ')}`;
    }

    const newWorkflowHistoryEntry: WorkflowHistoryEntry = {
        division: updaterRole,
        action: historyAction,
        timestamp: now,
        note: note,
    };

    if (actionTaken === 'scheduled' && scheduleDetails) {
        newWorkflowHistoryEntry.note = `Location: ${scheduleDetails.location}. ${note ? `Note: ${note}` : ''}`.trim();
    } else if (actionTaken === 'submitted' && surveyDetails) {
         newWorkflowHistoryEntry.note = `Survey Description: ${surveyDetails.description}. ${note ? `Note: ${note}` : ''}`.trim();
    }


    let updatedProject: Project = {
        ...currentProject,
        workflowId: projectWorkflowId,
        files: [...currentProject.files, ...uploadedFileEntries],
        workflowHistory: [...currentProject.workflowHistory, newWorkflowHistoryEntry],
    };

    if (transitionInfo) {
        updatedProject.status = transitionInfo.targetStatus;
        updatedProject.assignedDivision = transitionInfo.targetAssignedDivision;
        updatedProject.nextAction = transitionInfo.targetNextActionDescription;
        updatedProject.progress = transitionInfo.targetProgress;
    } else if (!['Completed', 'Canceled'].includes(currentProject.status) && !['completed', 'canceled', 'revise_after_sidang', 'canceled_after_sidang'].includes(actionTaken) ) {
         console.warn(`[ProjectService] No specific transition info for action "${actionTaken}" from status "${currentProject.status}". Updating files/notes if any, but status remains.`);
    }
    
    if (actionTaken === 'scheduled' && scheduleDetails) {
        updatedProject.scheduleDetails = scheduleDetails;
    }
    if (actionTaken === 'submitted' && surveyDetails && currentProject.status === 'Pending Survey Details') { // Ensure update only at correct step
        updatedProject.surveyDetails = surveyDetails;
    }

    projects[projectIndex] = updatedProject;
    await writeProjects(projects);
    console.log(`[ProjectService] Project ${projectId} updated. New status: ${updatedProject.status}, Assigned to: ${updatedProject.assignedDivision}`);

    if (transitionInfo && transitionInfo.notification && transitionInfo.targetAssignedDivision) {
        const notificationConfig = transitionInfo.notification;
        if (notificationConfig.division) {
            const message = notificationConfig.message
                .replace('{projectName}', updatedProject.title)
                .replace('{newStatus}', updatedProject.status);
            await notifyUsersByRole(notificationConfig.division, message, projectId);
        }
    }
    return updatedProject;
}

export async function updateProjectTitle(projectId: string, newTitle: string): Promise<void> {
    console.log(`[ProjectService] Updating title for project ID: ${projectId} to "${newTitle}"`);
    await ensureProjectFilesBaseDirExists();
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`[ProjectService] Project with ID "${projectId}" not found for title update.`);
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
        console.log(`[ProjectService] Sanitized title changed for project ${projectId}. Attempting to rename folder and update file paths.`);
        try {
             try {
                await fs.access(oldProjectAbsoluteFolderPath);
                await fs.rename(oldProjectAbsoluteFolderPath, newProjectAbsoluteFolderPath);
                console.log(`[ProjectService] Renamed folder from "${oldProjectAbsoluteFolderPath}" to "${newProjectAbsoluteFolderPath}"`);
             } catch (renameError: any) {
                 if (renameError.code === 'ENOENT') {
                    console.warn(`[ProjectService] Old project folder "${oldProjectAbsoluteFolderPath}" not found. Creating new folder "${newProjectAbsoluteFolderPath}" instead.`);
                    await fs.mkdir(newProjectAbsoluteFolderPath, { recursive: true });
                 } else {
                    console.error(`[ProjectService] Error during folder rename operation for project ${projectId}:`, renameError);
                 }
             }

            projects[projectIndex].files = originalProject.files.map(file => {
                const sanitizedFileName = sanitizeForPath(file.name);
                const updatedRelativePath = `${newProjectRelativeFolderPath}/${sanitizedFileName}`;
                console.log(`[ProjectService]  -> Updating path for file "${file.name}": To "${updatedRelativePath}"`);
                return { ...file, path: updatedRelativePath };
            });
        } catch (error) {
            console.error(`[ProjectService] Error processing folder rename or file path updates for project ${projectId}:`, error);
        }
    } else {
        console.log(`[ProjectService] Sanitized title for project ${projectId} remains the same. No folder or file path update needed.`);
    }

    projects[projectIndex].title = newTitle;
    await writeProjects(projects);
    console.log(`[ProjectService] Title for project ${projectId} updated successfully in JSON.`);
}

export async function reviseProject(
    projectId: string,
    reviserUsername: string,
    reviserRole: string,
    revisionNote?: string
): Promise<Project | null> { // Return Project | null
    console.log(`[ProjectService] Revising project ID: ${projectId} by ${reviserRole} (${reviserUsername}). Note: "${revisionNote || 'N/A'}"`);
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`[ProjectService] Project with ID "${projectId}" not found for revision.`);
        throw new Error('PROJECT_NOT_FOUND');
    }

    const currentProject = projects[projectIndex];
    const projectWorkflowId = currentProject.workflowId || DEFAULT_WORKFLOW_ID; // Ensure workflowId is present

    const workflow = await getWorkflowById(projectWorkflowId);
    if (!workflow) {
        console.error(`[ProjectService] Workflow with ID "${projectWorkflowId}" for project "${projectId}" not found.`);
        throw new Error('WORKFLOW_NOT_FOUND');
    }

    const revisionTransition = await getTransitionInfo(projectWorkflowId, currentProject.status, currentProject.progress, 'revise');

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
        console.log(`[ProjectService] Project ${projectId} revised via workflow. New status: ${projects[projectIndex].status}, Assigned to: ${projects[projectIndex].assignedDivision}`);

        if (revisionTransition.notification && revisionTransition.targetAssignedDivision) {
            const notificationConfig = revisionTransition.notification;
            if (notificationConfig.division) {
                const message = notificationConfig.message
                    .replace('{projectName}', projects[projectIndex].title)
                    .replace('{newStatus}', projects[projectIndex].status)
                    .replace('{reasonNote}', revisionNote || 'N/A');
                await notifyUsersByRole(notificationConfig.division, message, projectId);
            }
        }
        return projects[projectIndex];
    } else {
        console.warn(`[ProjectService] No explicit 'revise' transition found for project ${projectId} status ${currentProject.status}. Fallback revision logic might be needed or this action is not allowed.`);
        // throw new Error('REVISION_NOT_SUPPORTED_FOR_CURRENT_STEP'); // Removed to prevent uncaught server error
        return null; // Indicate revision is not supported
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
    console.log(`[ProjectService] Manually updating project ID: ${projectId} by admin ${adminUsername}. New Status: ${newStatus}, New Division: ${newAssignedDivision}`);
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`[ProjectService] Project with ID "${projectId}" not found for manual update.`);
        throw new Error('PROJECT_NOT_FOUND');
    }

    const currentProject = projects[projectIndex];
    const projectWorkflowId = currentProject.workflowId || DEFAULT_WORKFLOW_ID;

    const historyEntry: WorkflowHistoryEntry = {
        division: adminUsername, // Log who made the manual change
        action: `Manually changed status to "${newStatus}" and assigned to "${newAssignedDivision}".`,
        timestamp: new Date().toISOString(),
        note: `Reason: ${reasonNote}`,
    };

    const updatedProjectData: Project = {
        ...currentProject,
        workflowId: projectWorkflowId, // Preserve workflowId
        status: newStatus,
        assignedDivision: newAssignedDivision,
        nextAction: newNextAction,
        progress: newProgress,
        workflowHistory: [...currentProject.workflowHistory, historyEntry],
    };

    projects[projectIndex] = updatedProjectData;
    await writeProjects(projects);
    console.log(`[ProjectService] Project ${projectId} manually updated. New status: ${newStatus}, Assigned to: ${newAssignedDivision}`);

    // Notify the newly assigned division if the project is not completed or canceled
    if (newAssignedDivision && newStatus !== 'Completed' && newStatus !== 'Canceled') {
        const notificationMessage = `Project "${updatedProjectData.title}" has been manually updated. New Status: "${newStatus}", Assigned to: "${newAssignedDivision}". Next action: ${newNextAction || 'Review project'}. Reason: ${reasonNote}`;
        await notifyUsersByRole(newAssignedDivision, notificationMessage, projectId);
    }

    return projects[projectIndex];
}

export async function deleteProject(projectId: string, deleterUsername: string): Promise<void> {
    console.log(`[ProjectService] Attempting to delete project ID: ${projectId} by user: ${deleterUsername}`);
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`[ProjectService] Project with ID "${projectId}" not found for deletion.`);
        throw new Error('PROJECT_NOT_FOUND_FOR_DELETION');
    }

    const projectToDelete = projects[projectIndex];

    // Remove project from the array
    projects.splice(projectIndex, 1);
    await writeProjects(projects);
    console.log(`[ProjectService] Project "${projectToDelete.title}" (ID: ${projectId}) removed from projects.json.`);

    // Attempt to delete the project's folder
    const projectTitleSanitized = sanitizeForPath(projectToDelete.title);
    const projectSpecificDirRelative = `${projectId}-${projectTitleSanitized}`;
    const projectSpecificDirAbsolute = path.join(PROJECT_FILES_BASE_DIR, projectSpecificDirRelative);

    try {
        await fs.access(projectSpecificDirAbsolute); // Check if directory exists
        await fs.rm(projectSpecificDirAbsolute, { recursive: true, force: true });
        console.log(`[ProjectService] Successfully deleted project folder: ${projectSpecificDirAbsolute}`);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.warn(`[ProjectService] Project folder not found, no need to delete: ${projectSpecificDirAbsolute}`);
        } else {
            console.error(`[ProjectService] Error deleting project folder ${projectSpecificDirAbsolute}:`, error);
            // Decide if you want to throw an error here or just log it.
            // For now, we'll log it and let the project metadata deletion proceed.
        }
    }
    // TODO: Optionally, delete related notifications as well.
}
