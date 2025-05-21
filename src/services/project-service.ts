
// src/services/project-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import { notifyUsersByRole } from './notification-service';
import { sanitizeForPath } from '@/lib/path-utils'; 
import { PROJECT_FILES_BASE_DIR } from '@/config/file-constants';
import type { Workflow, WorkflowStep, WorkflowStepTransition } from './workflow-service';
import { getWorkflowById, getFirstStep, getTransitionInfo } from './workflow-service';
import { DEFAULT_WORKFLOW_ID } from '@/config/workflow-constants';


// Define the structure of a Workflow History entry
export interface WorkflowHistoryEntry {
    division: string; 
    action: string; 
    timestamp: string; 
    note?: string; 
}

// Define the structure of an uploaded file entry
export interface FileEntry {
    name: string; 
    uploadedBy: string; 
    timestamp: string; 
    path: string; 
}

// Define the structure for project schedule details
export interface ScheduleDetails {
    date: string; 
    time: string; 
    location: string;
}

// Define the structure for project survey details
export interface SurveyDetails {
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
    description: string;
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
    workflowId: string; 
    scheduleDetails?: ScheduleDetails;
    surveyDetails?: SurveyDetails;
}

// Define the structure for adding a new project
export interface AddProjectData {
    title: string;
    workflowId: string; 
    initialFiles: FileEntry[]; 
    createdBy: string; 
}

// Structure for updating project (used by client-side actions)
export interface UpdateProjectParams {
    projectId: string;
    updaterRole: string;
    updaterUsername: string;
    actionTaken: string; 
    files?: FileEntry[]; 
    note?: string;
    scheduleDetails?: ScheduleDetails;
    surveyDetails?: SurveyDetails;
}

const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'projects.json');

// --- Helper Functions ---

async function readProjects(): Promise<Project[]> {
    try {
        await fs.access(DB_PATH);
    } catch (error) {
        console.log("[ProjectService/JSON] Project database file not found, creating a new one.");
        await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
        return [];
    }

    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        if (data.trim() === "") {
            console.warn("[ProjectService/JSON] Project database file is empty. Initializing with an empty array.");
            await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        const parsedData = JSON.parse(data) as Project[];
         return parsedData.map(project => ({
            ...project,
            files: project.files || [],
            workflowHistory: project.workflowHistory || [],
            workflowId: project.workflowId || DEFAULT_WORKFLOW_ID,
        }));
    } catch (error: any) {
        console.error("[ProjectService/JSON] Error reading or parsing project database:", error);
         if (error instanceof SyntaxError) {
            console.warn(`[ProjectService/JSON] SyntaxError in project database: ${error.message}. Attempting to reset.`);
        }
         try {
             console.log("[ProjectService/JSON] Attempting to reset project database due to read/parse error.");
             await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
             return [];
         } catch (writeError) {
             console.error("[ProjectService/JSON] Failed to reset project database:", writeError);
             throw new Error('Failed to read or reset project data.');
         }
    }
}

async function writeProjects(projects: Project[]): Promise<void> {
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(projects, null, 2), 'utf8');
    } catch (error) {
        console.error("[ProjectService/JSON] Error writing project database:", error);
        throw new Error('Failed to save project data.');
    }
}

export async function ensureProjectFilesBaseDirExists(): Promise<void> {
    try {
        await fs.mkdir(PROJECT_FILES_BASE_DIR, { recursive: true });
    } catch (error) {
        console.error(`[ProjectService/JSON] Error creating project files base directory ${PROJECT_FILES_BASE_DIR}:`, error);
        throw new Error('Failed to create project files base directory.');
    }
}

// --- Main Service Functions ---

export async function addProject(projectData: AddProjectData): Promise<Project> {
    console.log(`[ProjectService/JSON] Attempting to add project: "${projectData.title}", by: ${projectData.createdBy}, Workflow ID: "${projectData.workflowId}"`);
    
    await ensureProjectFilesBaseDirExists(); 

    const projects = await readProjects();
    const now = new Date().toISOString();
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const effectiveWorkflowId = projectData.workflowId || DEFAULT_WORKFLOW_ID;
    console.log(`[ProjectService/JSON] Effective workflowId for "${projectData.title}": "${effectiveWorkflowId}"`);

    const firstStep = await getFirstStep(effectiveWorkflowId);

    if (!firstStep) {
        console.error(`[ProjectService/JSON] Cannot create project: Workflow ID "${effectiveWorkflowId}" not found or has no steps.`);
        throw new Error('WORKFLOW_INVALID');
    }

    const newProject: Project = {
        id: projectId,
        title: projectData.title,
        status: firstStep.status,
        progress: firstStep.progress,
        assignedDivision: firstStep.assignedDivision,
        nextAction: firstStep.nextActionDescription,
        workflowId: effectiveWorkflowId,
        workflowHistory: [
            { division: projectData.createdBy, action: 'Created Project', timestamp: now },
            ...projectData.initialFiles.map(file => ({
                 division: file.uploadedBy,
                 action: `Uploaded initial file: ${file.name}`,
                 timestamp: file.timestamp || now,
            })),
            { division: 'System', action: `Assigned to ${firstStep.assignedDivision} for ${firstStep.nextActionDescription || 'initial step'}`, timestamp: now }
        ],
        files: projectData.initialFiles.map(file => ({...file, timestamp: file.timestamp || now })),
        createdAt: now,
        createdBy: projectData.createdBy,
    };

    projects.push(newProject);
    await writeProjects(projects);
    console.log(`[ProjectService/JSON] Project "${newProject.title}" (ID: ${newProject.id}) added. Assigned to ${firstStep.assignedDivision} for "${firstStep.nextActionDescription}". Workflow: ${effectiveWorkflowId}`);

    if (firstStep.assignedDivision) { 
        const initialNotificationMessage = `Proyek baru '{projectName}' telah dibuat oleh {actorUsername} dan ditugaskan kepada Anda untuk: ${firstStep.nextActionDescription || 'tindakan awal'}.`
            .replace('{projectName}', newProject.title)
            .replace('{actorUsername}', projectData.createdBy);
        await notifyUsersByRole(
            firstStep.assignedDivision,
            initialNotificationMessage,
            newProject.id
        );
        console.log(`[ProjectService/JSON] Initial notification sent to ${firstStep.assignedDivision} for project ${newProject.id}`);
    }
    return newProject;
}

export async function getAllProjects(): Promise<Project[]> {
    let projects = await readProjects();
    let projectsModified = false;

    projects = projects.map(project => {
        if (!project.workflowId) {
            console.warn(`[ProjectService/JSON] Project ID ${project.id} ("${project.title}") is missing a workflowId. Assigning default workflow: ${DEFAULT_WORKFLOW_ID}`);
            projectsModified = true;
            return { ...project, workflowId: DEFAULT_WORKFLOW_ID };
        }
        return project;
    });

    if (projectsModified) {
        console.log("[ProjectService/JSON] One or more projects were updated with a default workflowId. Saving changes to projects.json.");
        await writeProjects(projects);
    }

    projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return projects;
}

export async function getProjectById(projectId: string): Promise<Project | null> {
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) {
        console.warn(`[ProjectService/JSON] Project with ID "${projectId}" not found.`);
        return null;
    }

    let project = projects[projectIndex];

    if (!project.workflowId) {
        console.warn(`[ProjectService/JSON] Project with ID "${projectId}" was found but is missing a workflowId. Assigning default: ${DEFAULT_WORKFLOW_ID} and attempting to save.`);
        project = { ...project, workflowId: DEFAULT_WORKFLOW_ID };
        projects[projectIndex] = project;
        await writeProjects(projects);
    }
    return project;
}

export async function updateProject(params: UpdateProjectParams): Promise<Project | null> {
    const {
        projectId,
        updaterRole,
        updaterUsername,
        actionTaken,
        files: newFilesData = [], 
        note,
        scheduleDetails,
        surveyDetails
    } = params;

    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`[ProjectService/JSON] Project with ID "${projectId}" not found for update.`);
        throw new Error('PROJECT_NOT_FOUND');
    }

    const currentProject = projects[projectIndex];
    const projectWorkflowId = currentProject.workflowId || DEFAULT_WORKFLOW_ID;
    if (!currentProject.workflowId) {
        console.warn(`[ProjectService/JSON] Project ${projectId} missing workflowId during update, using default: ${DEFAULT_WORKFLOW_ID}`);
    }


    const now = new Date().toISOString();
    const transitionInfo = await getTransitionInfo(projectWorkflowId, currentProject.status, currentProject.progress, actionTaken);
    
    let historyAction = `${updaterUsername} (${updaterRole}) ${actionTaken} for "${currentProject.nextAction || 'progress'}"`;
    if (actionTaken === 'scheduled' && scheduleDetails) {
        historyAction = `${updaterUsername} (${updaterRole}) scheduled Sidang on ${scheduleDetails.date} at ${scheduleDetails.time}`;
    } else if (actionTaken === 'submitted' && surveyDetails && currentProject.status === 'Pending Survey Details') {
        historyAction = `${updaterUsername} (${updaterRole}) submitted Survey Details for ${surveyDetails.date} at ${surveyDetails.time}`;
    } else if (actionTaken === 'approved') {
        historyAction = `${updaterUsername} (${updaterRole}) approved: ${currentProject.nextAction || 'current step'}`;
    } else if (actionTaken === 'rejected') { // General rejection/cancellation from Owner
        historyAction = `${updaterUsername} (${updaterRole}) membatalkan proyek pada tahap: ${currentProject.nextAction || 'penawaran'}`;
    } else if (['completed', 'revise_after_sidang', 'canceled_after_sidang'].includes(actionTaken)) {
         historyAction = `${updaterUsername} (${updaterRole}) declared Sidang outcome as: ${actionTaken.replace('_after_sidang', '').replace('_', ' ')}`;
    } else if (actionTaken === 'architect_uploaded_initial_images_for_struktur') {
        historyAction = `${updaterUsername} (${updaterRole}) uploaded initial reference images for Structure.`;
    } else if (actionTaken === 'revision_completed_and_finish') {
        historyAction = `${updaterUsername} (${updaterRole}) completed post-sidang revisions and finalized the project.`;
    }


    const newWorkflowHistoryEntry: WorkflowHistoryEntry = {
        division: updaterRole,
        action: historyAction,
        timestamp: now,
        note: note,
    };
     if (actionTaken === 'scheduled' && scheduleDetails) {
        newWorkflowHistoryEntry.note = `Location: ${scheduleDetails.location}. ${note ? `Note: ${note}` : ''}`.trim();
    } else if (actionTaken === 'submitted' && surveyDetails && currentProject.status === 'Pending Survey Details') {
         newWorkflowHistoryEntry.note = `Survey Description: ${surveyDetails.description}. ${note ? `Note: ${note}` : ''}`.trim();
    }


    let updatedProject: Project = {
        ...currentProject,
        workflowId: projectWorkflowId,
        files: [...(currentProject.files || []), ...newFilesData.map(file => ({...file, timestamp: file.timestamp || now}))],
        workflowHistory: [...(currentProject.workflowHistory || []), newWorkflowHistoryEntry],
    };

    if (actionTaken === 'architect_uploaded_initial_images_for_struktur') {
        // Special case: only update files and history, do not change status/assignment
        projects[projectIndex] = updatedProject;
        await writeProjects(projects);
        console.log(`[ProjectService/JSON] Project ${projectId} updated with initial architect images by ${updaterUsername}. Status remains ${currentProject.status}.`);
        // Send specific notification for this action
        await notifyUsersByRole("Struktur", `Gambar referensi awal dari Arsitek ({actorUsername}) untuk proyek '{projectName}' telah diunggah. Anda bisa mulai merencanakan struktur.`
            .replace('{projectName}', updatedProject.title)
            .replace('{actorUsername}', updaterUsername), projectId);
        return updatedProject;
    }


    if (transitionInfo) {
        updatedProject.status = transitionInfo.targetStatus;
        updatedProject.assignedDivision = transitionInfo.targetAssignedDivision;
        updatedProject.nextAction = transitionInfo.targetNextActionDescription;
        updatedProject.progress = transitionInfo.targetProgress;
    } else if (!['Completed', 'Canceled'].includes(currentProject.status) && !['completed', 'canceled', 'revise_after_sidang', 'canceled_after_sidang', 'revision_completed_and_finish'].includes(actionTaken) ) {
         console.warn(`[ProjectService/JSON] No specific transition info for project ${projectId}, action "${actionTaken}" from status "${currentProject.status}". Updating files/notes if any, but status remains.`);
         // If no transition and not a terminal action, it might be an error or just a file/note update without status change.
         // For now, we'll allow the file/history update but return null to indicate no formal status transition occurred.
         projects[projectIndex] = updatedProject; // Save files & history
         await writeProjects(projects);
         return null; // Indicate no formal workflow transition occurred from this action
    }
    
    if (actionTaken === 'scheduled' && scheduleDetails) {
        updatedProject.scheduleDetails = scheduleDetails;
    }
    if (actionTaken === 'submitted' && surveyDetails && currentProject.status === 'Pending Survey Details') { // Ensure this only updates if it's the correct step
        updatedProject.surveyDetails = surveyDetails;
    }


    projects[projectIndex] = updatedProject;
    await writeProjects(projects);
    console.log(`[ProjectService/JSON] Project ${projectId} updated. New status: ${updatedProject.status}, Assigned to: ${updatedProject.assignedDivision}`);

    if (transitionInfo && transitionInfo.notification && transitionInfo.notification.division) {
        const notificationConfig = transitionInfo.notification;
        let message = notificationConfig.message
            .replace('{projectName}', updatedProject.title)
            .replace('{newStatus}', updatedProject.status)
            .replace('{actorUsername}', updaterUsername);
        await notifyUsersByRole(notificationConfig.division, message, projectId);
        console.log(`[ProjectService/JSON] Notification sent to ${notificationConfig.division} for project ${projectId} (Action: ${actionTaken})`);
    } else if (transitionInfo && transitionInfo.targetAssignedDivision) {
        // Fallback notification if not defined in workflow but there's a new assignment
        const message = `Proyek '{projectName}' telah diperbarui oleh {actorUsername}. Status baru: {newStatus}. Tugas berikutnya untuk Anda: ${updatedProject.nextAction || 'Tinjau proyek'}.`
            .replace('{projectName}', updatedProject.title)
            .replace('{newStatus}', updatedProject.status)
            .replace('{actorUsername}', updaterUsername);
        await notifyUsersByRole(transitionInfo.targetAssignedDivision, message, projectId);
        console.log(`[ProjectService/JSON] Fallback notification sent to ${transitionInfo.targetAssignedDivision} for project ${projectId} (Action: ${actionTaken})`);
    }


    return updatedProject;
}

export async function updateProjectTitle(projectId: string, newTitle: string): Promise<void> {
    console.log(`[ProjectService/JSON] Updating title for project ID: ${projectId} to "${newTitle}"`);
    await ensureProjectFilesBaseDirExists(); 
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`[ProjectService/JSON] Project with ID "${projectId}" not found for title update.`);
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
        console.log(`[ProjectService/JSON] Sanitized title changed for project ${projectId}. Attempting to rename folder and update file paths.`);
        try {
             try {
                await fs.access(oldProjectAbsoluteFolderPath);
                await fs.rename(oldProjectAbsoluteFolderPath, newProjectAbsoluteFolderPath);
                console.log(`[ProjectService/JSON] Renamed folder from "${oldProjectAbsoluteFolderPath}" to "${newProjectAbsoluteFolderPath}"`);
             } catch (renameError: any) {
                 if (renameError.code === 'ENOENT') {
                    console.warn(`[ProjectService/JSON] Old project folder "${oldProjectAbsoluteFolderPath}" not found. Creating new folder "${newProjectAbsoluteFolderPath}" instead.`);
                    await fs.mkdir(newProjectAbsoluteFolderPath, { recursive: true });
                 } else {
                    console.error(`[ProjectService/JSON] Error during folder rename operation for project ${projectId}:`, renameError);
                 }
             }

            projects[projectIndex].files = (originalProject.files || []).map(file => {
                const sanitizedFileName = sanitizeForPath(file.name);
                const updatedRelativePath = `${newProjectRelativeFolderPath}/${sanitizedFileName}`;
                return { ...file, path: updatedRelativePath };
            });
        } catch (error) {
            console.error(`[ProjectService/JSON] Error processing folder rename or file path updates for project ${projectId}:`, error);
        }
    }

    projects[projectIndex].title = newTitle;
    await writeProjects(projects);
    console.log(`[ProjectService/JSON] Title for project ${projectId} updated successfully in JSON.`);
}

export async function reviseProject(
    projectId: string,
    reviserUsername: string,
    reviserRole: string,
    revisionNote?: string
): Promise<Project | null> {
    console.log(`[ProjectService/JSON] Revising project ID: ${projectId} by ${reviserRole} (${reviserUsername}). Note: "${revisionNote || 'N/A'}"`);
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`[ProjectService/JSON] Project with ID "${projectId}" not found for revision.`);
        throw new Error('PROJECT_NOT_FOUND');
    }

    const currentProject = projects[projectIndex];
    const projectWorkflowId = currentProject.workflowId || DEFAULT_WORKFLOW_ID; 

    const workflow = await getWorkflowById(projectWorkflowId);
    if (!workflow) {
        console.error(`[ProjectService/JSON] Workflow with ID "${projectWorkflowId}" for project "${projectId}" not found.`);
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
            workflowHistory: [...(currentProject.workflowHistory || []), historyEntry],
        };

        await writeProjects(projects);
        console.log(`[ProjectService/JSON] Project ${projectId} revised via workflow. New status: ${projects[projectIndex].status}, Assigned to: ${projects[projectIndex].assignedDivision}`);

        if (revisionTransition.notification && revisionTransition.notification.division) {
            const notificationConfig = revisionTransition.notification;
            let message = notificationConfig.message
                .replace('{projectName}', projects[projectIndex].title)
                .replace('{newStatus}', projects[projectIndex].status)
                .replace('{actorUsername}', reviserUsername)
                .replace('{reasonNote}', revisionNote || 'N/A');
            await notifyUsersByRole(notificationConfig.division, message, projectId);
        }
        return projects[projectIndex];
    } else {
        console.warn(`No explicit 'revise' transition found for project ${projectId} status ${currentProject.status}. Fallback revision logic might be needed or this action is not allowed.`);
        return null; // Indicate revision not supported for this step via workflow
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
    console.log(`[ProjectService/JSON] Manually updating project ID: ${projectId} by admin ${adminUsername}. New Status: ${newStatus}, New Division: ${newAssignedDivision}`);
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`[ProjectService/JSON] Project with ID "${projectId}" not found for manual update.`);
        throw new Error('PROJECT_NOT_FOUND');
    }

    const currentProject = projects[projectIndex];
    const projectWorkflowId = currentProject.workflowId || DEFAULT_WORKFLOW_ID;

    const historyEntry: WorkflowHistoryEntry = {
        division: adminUsername, 
        action: `Manually changed status to "${newStatus}" and assigned to "${newAssignedDivision}".`,
        timestamp: new Date().toISOString(),
        note: `Reason: ${reasonNote}`,
    };

    const updatedProjectData: Project = {
        ...currentProject,
        workflowId: projectWorkflowId,
        status: newStatus,
        assignedDivision: newAssignedDivision,
        nextAction: newNextAction,
        progress: newProgress,
        workflowHistory: [...(currentProject.workflowHistory || []), historyEntry],
    };

    projects[projectIndex] = updatedProjectData;
    await writeProjects(projects);
    console.log(`[ProjectService/JSON] Project ${projectId} manually updated. New status: ${newStatus}, Assigned to: ${newAssignedDivision}`);

    if (newAssignedDivision && newStatus !== 'Completed' && newStatus !== 'Canceled') {
        const notificationMessage = `Proyek "${updatedProjectData.title}" telah diperbarui secara manual oleh {actorUsername}. Status baru: "{newStatus}", Ditugaskan ke: "${newAssignedDivision}". Tindakan berikutnya: ${newNextAction || 'Tinjau proyek'}. Alasan: ${reasonNote}`
            .replace('{actorUsername}', adminUsername)
            .replace('{newStatus}', newStatus);
        await notifyUsersByRole(newAssignedDivision, notificationMessage, projectId);
    }

    return projects[projectIndex];
}

export async function deleteProject(projectId: string, deleterUsername: string): Promise<void> {
    console.log(`[ProjectService/JSON] Attempting to delete project ID: ${projectId} by user: ${deleterUsername}`);
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`[ProjectService/JSON] Project with ID "${projectId}" not found for deletion.`);
        throw new Error('PROJECT_NOT_FOUND_FOR_DELETION');
    }

    const projectToDelete = projects[projectIndex];

    projects.splice(projectIndex, 1); 
    await writeProjects(projects);
    console.log(`[ProjectService/JSON] Project "${projectToDelete.title}" (ID: ${projectId}) removed from projects.json.`);

    const projectTitleSanitized = sanitizeForPath(projectToDelete.title);
    const projectSpecificDirRelative = `${projectId}-${projectTitleSanitized}`;
    const projectSpecificDirAbsolute = path.join(PROJECT_FILES_BASE_DIR, projectSpecificDirRelative);

    try {
        await fs.access(projectSpecificDirAbsolute); 
        await fs.rm(projectSpecificDirAbsolute, { recursive: true, force: true });
        console.log(`[ProjectService/JSON] Successfully deleted project folder: ${projectSpecificDirAbsolute}`);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.warn(`[ProjectService/JSON] Project folder not found, no need to delete: ${projectSpecificDirAbsolute}`);
        } else {
            console.error(`[ProjectService/JSON] Error deleting project folder ${projectSpecificDirAbsolute}:`, error);
        }
    }
}
