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
    path: string; // Relative path from PROJECT_FILES_BASE_DIR/project_specific_folder
}

// Define the structure for project schedule details
export interface ScheduleDetails {
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
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
    actionTaken: string; // e.g., "submitted", "approved", "rejected", "scheduled"
    files?: Omit<FileEntry, 'timestamp'>[]; // Files being uploaded in this action
    note?: string; // Note for this specific action
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
    const effectiveWorkflowId = projectData.workflowId || DEFAULT_WORKFLOW_ID;
    console.log(`[ProjectService/JSON] Attempting to add project: "${projectData.title}", by: ${projectData.createdBy}. Effective Workflow ID: "${effectiveWorkflowId}" (Received: "${projectData.workflowId}")`);

    await ensureProjectFilesBaseDirExists();

    const projects = await readProjects();
    const now = new Date().toISOString();
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const projectTitleSanitized = sanitizeForPath(projectData.title);
    const projectRelativeFolderPath = `${projectId}-${projectTitleSanitized}`;
    const projectAbsoluteFolderPath = path.join(PROJECT_FILES_BASE_DIR, projectRelativeFolderPath);

    try {
        await fs.mkdir(projectAbsoluteFolderPath, { recursive: true });
        console.log(`[ProjectService/JSON] Successfully created project folder: ${projectAbsoluteFolderPath}`);
    } catch (mkdirError) {
        console.error(`[ProjectService/JSON] Error creating project folder ${projectAbsoluteFolderPath}:`, mkdirError);
        throw new Error('Failed to create project directory on server during project creation.');
    }

    const firstStep = await getFirstStep(effectiveWorkflowId);
    console.log(`[ProjectService/JSON] First step for workflow ${effectiveWorkflowId}:`, firstStep);


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
            { division: projectData.createdBy, action: `Created Project with workflow: ${effectiveWorkflowId}`, timestamp: now, note: `Initial files: ${projectData.initialFiles.length}` },
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

    if (firstStep.notification && firstStep.notification.division) {
        const notificationConfig = firstStep.notification;
         let message = (notificationConfig.message || "Proyek baru '{projectName}' telah dibuat dan ditugaskan kepada Anda untuk {newStatus}.")
            .replace('{projectName}', newProject.title)
            .replace('{actorUsername}', projectData.createdBy)
            .replace('{newStatus}', firstStep.nextActionDescription || firstStep.status);

        const targetDivisions = Array.isArray(notificationConfig.division) ? notificationConfig.division : [notificationConfig.division];
        for (const role of targetDivisions) {
            if (role) {
                await notifyUsersByRole(role, message, newProject.id);
                console.log(`[ProjectService] Initial notification sent to role ${role} for project ${newProject.id}`);
            }
        }
    } else if (firstStep.assignedDivision) {
        const message = `Proyek baru "${newProject.title}" telah dibuat oleh ${projectData.createdBy} dan memerlukan tindakan: ${firstStep.nextActionDescription || 'Langkah awal'}.`;
        await notifyUsersByRole(firstStep.assignedDivision, message, newProject.id);
        console.log(`[ProjectService/JSON] Fallback initial notification sent to ${firstStep.assignedDivision} for project ${newProject.id}`);
    }
    return newProject;
}

export async function getAllProjects(): Promise<Project[]> {
    let projects = await readProjects();
    let projectsModified = false;

    projects = projects.map(project => {
        let modifiedProject = {...project, files: project.files || [], workflowHistory: project.workflowHistory || []};
        if (!project.workflowId) {
            console.warn(`[ProjectService/JSON] Project ID ${project.id} ("${project.title}") is missing a workflowId. Assigning default workflow: ${DEFAULT_WORKFLOW_ID}`);
            modifiedProject.workflowId = DEFAULT_WORKFLOW_ID;
            projectsModified = true;
        }
        return modifiedProject;
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
    project.files = project.files || [];
    project.workflowHistory = project.workflowHistory || [];


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

    const currentProject = {
        ...projects[projectIndex],
        files: projects[projectIndex].files || [],
        workflowHistory: projects[projectIndex].workflowHistory || [],
        workflowId: projects[projectIndex].workflowId || DEFAULT_WORKFLOW_ID,
    };
    const projectWorkflowId = currentProject.workflowId;


    const now = new Date().toISOString();
    const filesWithTimestamp = newFilesData.map(file => ({ ...file, timestamp: now }));

    // Handle special in-step action for architect uploading initial images
    if (actionTaken === 'architect_uploaded_initial_images_for_struktur') {
        const historyAction = `${updaterUsername} (${updaterRole}) uploaded initial reference images for Struktur & MEP.`;
        const newWorkflowHistoryEntry: WorkflowHistoryEntry = {
            division: updaterRole,
            action: historyAction,
            timestamp: now,
            note: note,
        };
        const updatedProject: Project = {
            ...currentProject,
            files: [...currentProject.files, ...filesWithTimestamp],
            workflowHistory: [...currentProject.workflowHistory, newWorkflowHistoryEntry],
        };
        projects[projectIndex] = updatedProject;
        await writeProjects(projects);
        console.log(`[ProjectService/JSON] Project ${projectId} updated with initial architect images by ${updaterUsername}. Status remains ${currentProject.status}.`);

        const notificationMessageStruktur = `Gambar referensi awal dari Arsitek (${updaterUsername}) untuk proyek '${updatedProject.title}' telah diunggah. Anda bisa mulai merencanakan struktur.`
            .replace('{projectName}', updatedProject.title)
            .replace('{actorUsername}', updaterUsername);
        await notifyUsersByRole("Struktur", notificationMessageStruktur, projectId);
        
        const notificationMessageMEP = `Gambar referensi awal dari Arsitek (${updaterUsername}) untuk proyek '${updatedProject.title}' telah diunggah. Anda bisa mulai melakukan perencanaan MEP awal.`
            .replace('{projectName}', updatedProject.title)
            .replace('{actorUsername}', updaterUsername);
        await notifyUsersByRole("MEP", notificationMessageMEP, projectId); // Notify MEP

        console.log(`[ProjectService] Notifications sent to Struktur and MEP for project ${projectId} (Initial Architect Images)`);
        return updatedProject;
    }

    const transitionInfo = await getTransitionInfo(projectWorkflowId, currentProject.status, currentProject.progress, actionTaken);
    console.log(`[ProjectService/JSON] Update for P_ID ${projectId}, Current Status: ${currentProject.status}, Progress: ${currentProject.progress}, Action: ${actionTaken}, TransitionInfo found:`, !!transitionInfo, transitionInfo ? `to ${transitionInfo.targetStatus}` : 'No transition');


    let historyActionText = `${updaterUsername} (${updaterRole}) ${actionTaken} for "${currentProject.nextAction || 'progress'}"`;
    if (actionTaken === 'scheduled' && scheduleDetails) {
        historyActionText = `${updaterUsername} (${updaterRole}) scheduled Sidang on ${scheduleDetails.date} at ${scheduleDetails.time}`;
    } else if (actionTaken === 'submitted' && surveyDetails && currentProject.status === 'Pending Survey Details') {
         historyActionText = `${updaterUsername} (${updaterRole}) submitted Survey Details for ${surveyDetails.date} at ${surveyDetails.time}`;
    } else if (actionTaken === 'approved') {
        historyActionText = `${updaterUsername} (${updaterRole}) approved: ${currentProject.nextAction || 'current step'}`;
    } else if (actionTaken === 'rejected' && currentProject.status === 'Pending Approval' && currentProject.progress === 20) {
        historyActionText = `${updaterUsername} (${updaterRole}) canceled project at offer stage: ${currentProject.nextAction || 'penawaran'}`;
    } else if (actionTaken === 'rejected') {
        historyActionText = `${updaterUsername} (${updaterRole}) rejected: ${currentProject.nextAction || 'current step'}`;
    } else if (actionTaken === 'revise_offer') {
        historyActionText = `${updaterUsername} (${updaterRole}) requested revision for offer: ${currentProject.nextAction || 'penawaran'}`;
    } else if (['completed', 'revise_after_sidang', 'canceled_after_sidang'].includes(actionTaken)) {
         historyActionText = `${updaterUsername} (${updaterRole}) declared Sidang outcome as: ${actionTaken.replace(/_after_sidang|_offer/g, '').replace(/_/g, ' ')}`;
    } else if (actionTaken === 'revision_completed_and_finish') {
        historyActionText = `${updaterUsername} (${updaterRole}) completed post-sidang revisions and finalized the project.`;
    }


    const newWorkflowHistoryEntry: WorkflowHistoryEntry = {
        division: updaterRole,
        action: historyActionText,
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
        files: [...currentProject.files, ...filesWithTimestamp],
        workflowHistory: [...currentProject.workflowHistory, newWorkflowHistoryEntry],
    };

    if (transitionInfo) {
        updatedProject.status = transitionInfo.targetStatus;
        updatedProject.assignedDivision = transitionInfo.targetAssignedDivision;
        updatedProject.nextAction = transitionInfo.targetNextActionDescription;
        updatedProject.progress = transitionInfo.targetProgress;

        if (transitionInfo.notification && transitionInfo.notification.division) {
            const notificationConfig = transitionInfo.notification;
            let message = (notificationConfig.message || "Proyek '{projectName}' telah diperbarui ke status: {newStatus}.")
                .replace('{projectName}', updatedProject.title)
                .replace('{newStatus}', updatedProject.status)
                .replace('{actorUsername}', updaterUsername);

            const targetDivisions = Array.isArray(notificationConfig.division) ? notificationConfig.division : [notificationConfig.division];
            for (const role of targetDivisions) {
                if (role) {
                    await notifyUsersByRole(role, message, projectId);
                    console.log(`[ProjectService] Notification sent to role ${role} for project ${projectId} (Action: ${actionTaken}, New Status: ${updatedProject.status})`);
                }
            }
        }

    } else {
         console.warn(`[ProjectService/JSON] No specific transition info for project ${projectId}, action "${actionTaken}" from status "${currentProject.status}" (Progress: ${currentProject.progress}). Updating files/notes if any, but status remains unchanged unless it's a terminal action.`);
         if (!['Completed', 'Canceled'].includes(currentProject.status) && !['completed', 'rejected', 'revise_offer', 'revise_after_sidang', 'canceled_after_sidang', 'revision_completed_and_finish'].includes(actionTaken) ) {
            projects[projectIndex] = updatedProject;
            await writeProjects(projects);
            return null;
         }
         if (actionTaken === 'completed') {
            updatedProject.status = 'Completed';
            updatedProject.progress = 100;
            updatedProject.nextAction = null;
            updatedProject.assignedDivision = "";
         }
         if (actionTaken === 'rejected' && currentProject.status === 'Pending Approval' && currentProject.progress === 20) { // Offer rejection
            updatedProject.status = 'Canceled';
            updatedProject.nextAction = null;
            updatedProject.assignedDivision = "";
         }
         if (actionTaken === 'canceled_after_sidang') {
            updatedProject.status = 'Canceled';
            updatedProject.nextAction = null;
            updatedProject.assignedDivision = "";
         }
    }

    if (actionTaken === 'scheduled' && scheduleDetails) {
        updatedProject.scheduleDetails = scheduleDetails;
    }
    if (actionTaken === 'submitted' && surveyDetails && currentProject.status === 'Pending Survey Details') {
        updatedProject.surveyDetails = surveyDetails;
    }


    projects[projectIndex] = updatedProject;
    await writeProjects(projects);
    console.log(`[ProjectService/JSON] Project ${projectId} updated. New status: ${updatedProject.status}, Assigned to: ${updatedProject.assignedDivision}`);

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
                const updatedRelativePath = `${newProjectRelativeFolderPath}/${path.basename(file.path)}`;
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
    revisionNote?: string,
    actionTaken: string = 'revise' // Default to 'revise', can be 'revise_offer' etc.
): Promise<Project | null> {
    console.log(`[ProjectService/JSON] Revising project ID: ${projectId} by ${reviserRole} (${reviserUsername}) with action "${actionTaken}". Note: "${revisionNote || 'N/A'}"`);
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`[ProjectService/JSON] Project with ID "${projectId}" not found for revision.`);
        throw new Error('PROJECT_NOT_FOUND');
    }

    const currentProject = {
        ...projects[projectIndex],
        workflowHistory: projects[projectIndex].workflowHistory || [],
        workflowId: projects[projectIndex].workflowId || DEFAULT_WORKFLOW_ID,
    };
    
    const projectWorkflowId = currentProject.workflowId;
    const workflow = await getWorkflowById(projectWorkflowId);
    if (!workflow) {
        console.error(`Workflow with ID "${currentProject.workflowId}" for project "${projectId}" not found.`);
        throw new Error('WORKFLOW_NOT_FOUND');
    }

    const revisionTransition = await getTransitionInfo(projectWorkflowId, currentProject.status, currentProject.progress, actionTaken);

    if (revisionTransition) {
        const historyAction = `${reviserUsername} (${reviserRole}) requested revision (${actionTaken}). Project sent to ${revisionTransition.targetAssignedDivision} for ${revisionTransition.targetNextActionDescription || 'revision'}.`;

        const historyEntry: WorkflowHistoryEntry = {
            division: reviserRole,
            action: historyAction,
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
        console.log(`[ProjectService/JSON] Project ${projectId} revised via workflow (${actionTaken}). New status: ${projects[projectIndex].status}, Assigned to: ${projects[projectIndex].assignedDivision}`);

        if (revisionTransition.notification && revisionTransition.notification.division) {
            const notificationConfig = revisionTransition.notification;
            let message = (notificationConfig.message || "Proyek '{projectName}' memerlukan revisi dari Anda.")
                .replace('{projectName}', projects[projectIndex].title)
                .replace('{newStatus}', projects[projectIndex].status)
                .replace('{actorUsername}', reviserUsername)
                .replace('{reasonNote}', revisionNote || 'N/A');
            
            const targetDivisions = Array.isArray(notificationConfig.division) ? notificationConfig.division : [notificationConfig.division];
            for (const role of targetDivisions) {
                if(role) {
                    await notifyUsersByRole(role, message, projectId);
                }
            }
        }
        return projects[projectIndex];
    } else {
        console.warn(`No explicit '${actionTaken}' transition found for project ${projectId} status ${currentProject.status}. Fallback revision logic might be needed or this action is not allowed.`);
        return null;
    }
}

export async function manuallyUpdateProjectStatusAndAssignment(
    params: UpdateProjectParams & { newStatus: string; newAssignedDivision: string; newNextAction: string | null; newProgress: number; adminUsername: string; reasonNote: string }
): Promise<Project> {
    const { projectId, newStatus, newAssignedDivision, newNextAction, newProgress, adminUsername, reasonNote } = params;
    console.log(`[ProjectService/JSON] Manually updating project ID: ${projectId} by admin ${adminUsername}. New Status: ${newStatus}, New Division: ${newAssignedDivision}`);
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`[ProjectService/JSON] Project with ID "${projectId}" not found for manual update.`);
        throw new Error('PROJECT_NOT_FOUND');
    }

    const currentProject = {
        ...projects[projectIndex],
        workflowHistory: projects[projectIndex].workflowHistory || [],
        workflowId: projects[projectIndex].workflowId || DEFAULT_WORKFLOW_ID,
    };

    const historyEntry: WorkflowHistoryEntry = {
        division: adminUsername,
        action: `Manually changed status to "${newStatus}" and assigned to "${newAssignedDivision}". Next Action: ${newNextAction || 'None'}. Progress: ${newProgress}%.`,
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
    console.log(`[ProjectService/JSON] Project ${projectId} manually updated. New status: ${newStatus}, Assigned to: ${newAssignedDivision}`);

    if (newAssignedDivision && newStatus !== 'Completed' && newStatus !== 'Canceled') {
        const notificationMessage = `Proyek "${updatedProjectData.title}" telah diperbarui secara manual oleh ${adminUsername}. Status baru: "${newStatus}", Ditugaskan ke: "${newAssignedDivision}". Tindakan berikutnya: ${newNextAction || 'Tinjau proyek'}. Alasan: ${reasonNote}`;
        await notifyUsersByRole(newAssignedDivision, notificationMessage, projectId);
    }

    return projects[projectIndex];
}

export async function deleteProjectFile(projectId: string, filePath: string, deleterUsername: string): Promise<void> {
    console.log(`[ProjectService/JSON] Deleting file record for project ${projectId}, path: ${filePath} by ${deleterUsername}`);
    let projects = await readProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`[ProjectService/JSON] Project with ID "${projectId}" not found for file deletion.`);
        throw new Error('PROJECT_NOT_FOUND');
    }

    const originalFileCount = projects[projectIndex].files?.length || 0;
    const fileToDelete = projects[projectIndex].files.find(f => f.path === filePath);
    
    projects[projectIndex].files = (projects[projectIndex].files || []).filter(file => file.path !== filePath);
    const newFileCount = projects[projectIndex].files?.length || 0;

    if (originalFileCount === newFileCount) {
        console.warn(`[ProjectService/JSON] File with path "${filePath}" not found in project ${projectId} data. No record was deleted.`);
    } else {
         const historyEntry: WorkflowHistoryEntry = {
            division: deleterUsername,
            action: `Deleted file: "${fileToDelete?.name || 'unknown file'}"`,
            timestamp: new Date().toISOString(),
        };
        projects[projectIndex].workflowHistory.push(historyEntry);
    }

    await writeProjects(projects);
    console.log(`[ProjectService/JSON] File record with path "${filePath}" removed from project ${projectId}.`);
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
    console.log(`[ProjectService/JSON] Audit: Project "${projectToDelete.title}" (ID: ${projectId}) was deleted by ${deleterUsername}.`);

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
