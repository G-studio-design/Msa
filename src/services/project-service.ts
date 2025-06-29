'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale';
import { readDb, writeDb } from '@/lib/json-db-utils'; // Import centralized utils
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
    parallelUploadsCompletedBy?: string[]; // To track which divisions have completed their part
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

// The individual read/write functions are no longer needed here.
// The new readDb/writeDb functions from json-db-utils handle file access.


export async function ensureProjectFilesBaseDirExists(): Promise<void> {
    try {
        await fs.mkdir(PROJECT_FILES_BASE_DIR, { recursive: true });
    } catch (error) {
        console.error(`[ProjectService] Error creating project files base directory ${PROJECT_FILES_BASE_DIR}:`, error);
        throw new Error('Failed to create project files base directory.');
    }
}

// --- Main Service Functions ---

export async function addProject(projectData: AddProjectData): Promise<Project> {
    const effectiveWorkflowId = projectData.workflowId || DEFAULT_WORKFLOW_ID;
    console.log(`[ProjectService] Attempting to add project: "${projectData.title}", by: ${projectData.createdBy}. Effective Workflow ID: "${effectiveWorkflowId}" (Received: "${projectData.workflowId}")`);

    await ensureProjectFilesBaseDirExists();

    const projects = await readDb<Project[]>(DB_PATH, []);
    const now = new Date().toISOString();
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const projectTitleSanitized = sanitizeForPath(projectData.title);
    const projectRelativeFolderPath = `${projectId}-${projectTitleSanitized}`;
    const projectAbsoluteFolderPath = path.join(PROJECT_FILES_BASE_DIR, projectRelativeFolderPath);

    try {
        await fs.mkdir(projectAbsoluteFolderPath, { recursive: true });
        console.log(`[ProjectService] Successfully created project folder: ${projectAbsoluteFolderPath}`);
    } catch (mkdirError) {
        console.error(`[ProjectService] Error creating project folder ${projectAbsoluteFolderPath}:`, mkdirError);
        throw new Error('Failed to create project directory on server during project creation.');
    }

    const firstStep = await getFirstStep(effectiveWorkflowId);
    console.log(`[ProjectService] First step for workflow ${effectiveWorkflowId}:`, firstStep);


    if (!firstStep) {
        console.error(`[ProjectService] Cannot create project: Workflow ID "${effectiveWorkflowId}" not found or has no steps.`);
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
    await writeDb(DB_PATH, projects);
    console.log(`[ProjectService] Project "${newProject.title}" (ID: ${newProject.id}) added. Assigned to ${firstStep.assignedDivision} for "${firstStep.nextActionDescription}". Workflow: ${effectiveWorkflowId}`);

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
        console.log(`[ProjectService] Fallback initial notification sent to ${firstStep.assignedDivision} for project ${newProject.id}`);
    }
    return newProject;
}

export async function getAllProjects(): Promise<Project[]> {
    let projects = await readDb<Project[]>(DB_PATH, []);
    let projectsModified = false;

    projects = projects.map(project => {
        let modifiedProject = {...project, files: project.files || [], workflowHistory: project.workflowHistory || []};
        if (!project.workflowId) {
            console.warn(`[ProjectService] Project ID ${project.id} ("${project.title}") is missing a workflowId. Assigning default workflow: ${DEFAULT_WORKFLOW_ID}`);
            modifiedProject.workflowId = DEFAULT_WORKFLOW_ID;
            projectsModified = true;
        }
        return modifiedProject;
    });

    if (projectsModified) {
        console.log("[ProjectService] One or more projects were updated with a default workflowId. Saving changes to projects.json.");
        await writeDb(DB_PATH, projects);
    }

    projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return projects;
}

export async function getProjectById(projectId: string): Promise<Project | null> {
    let projects = await readDb<Project[]>(DB_PATH, []);
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.warn(`[ProjectService] Project with ID "${projectId}" not found.`);
        return null;
    }

    let project = projects[projectIndex];
    project.files = project.files || [];
    project.workflowHistory = project.workflowHistory || [];


    if (!project.workflowId) {
        console.warn(`[ProjectService] Project with ID "${projectId}" was found but is missing a workflowId. Assigning default: ${DEFAULT_WORKFLOW_ID} and attempting to save.`);
        project = { ...project, workflowId: DEFAULT_WORKFLOW_ID };
        projects[projectIndex] = project;
        await writeDb(DB_PATH, projects);
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

    let projects = await readDb<Project[]>(DB_PATH, []);
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`[ProjectService] Project with ID "${projectId}" not found for update.`);
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
        await writeDb(DB_PATH, projects);
        console.log(`[ProjectService] Project ${projectId} updated with initial architect images by ${updaterUsername}. Status remains ${currentProject.status}.`);

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
    console.log(`[ProjectService] Update for P_ID ${projectId}, Current Status: ${currentProject.status}, Progress: ${currentProject.progress}, Action: ${actionTaken}, TransitionInfo found:`, !!transitionInfo, transitionInfo ? `to ${transitionInfo.targetStatus}` : 'No transition');

    // Special handling for file uploads during parallel design phase
    if ((currentProject.status === 'Pending Parallel Design Uploads' || currentProject.status === 'Pending Post-Sidang Revision') && actionTaken === 'submitted' && newFilesData.length > 0) {
        const historyAction = `${updaterUsername} (${updaterRole}) uploaded file(s).`;
        const newWorkflowHistoryEntry: WorkflowHistoryEntry = {
            division: updaterRole,
            action: historyAction,
            timestamp: now,
            note: newFilesData.map(f => f.name).join(', '),
        };
        const updatedProject: Project = {
            ...currentProject,
            files: [...currentProject.files, ...filesWithTimestamp],
            workflowHistory: [...currentProject.workflowHistory, newWorkflowHistoryEntry],
        };
        projects[projectIndex] = updatedProject;
        await writeDb(DB_PATH, projects);
        // Notify Admin Proyek about the specific upload
        const notificationMessage = `${updaterRole} baru saja mengunggah file untuk proyek "${updatedProject.title}".`;
        await notifyUsersByRole('Admin Proyek', notificationMessage, projectId);
        console.log(`[ProjectService] Project ${projectId} updated with new files by ${updaterUsername}. Status remains ${currentProject.status}. Admin Proyek notified.`);
        return updatedProject;
    }

    let historyActionText = `${updaterUsername} (${updaterRole}) ${actionTaken} for "${currentProject.nextAction || 'progress'}"`;
    if (actionTaken === 'scheduled' && scheduleDetails) {
        historyActionText = `${updaterUsername} (${updaterRole}) scheduled Sidang on ${scheduleDetails.date} at ${scheduleDetails.time}`;
    } else if ((actionTaken === 'submitted' || actionTaken === 'reschedule_survey') && surveyDetails) {
        if (actionTaken === 'reschedule_survey') {
            historyActionText = `${updaterUsername} (${updaterRole}) rescheduled Survey to ${surveyDetails.date} at ${surveyDetails.time}`;
        } else {
            historyActionText = `${updaterUsername} (${updaterRole}) submitted Survey Details for ${surveyDetails.date} at ${surveyDetails.time}`;
        }
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
        historyActionText = `${updaterUsername} (${updaterRole}) completed post-sidang revisions and moved to final documentation.`;
    }


    const newWorkflowHistoryEntry: WorkflowHistoryEntry = {
        division: updaterRole,
        action: historyActionText,
        timestamp: now,
        note: note,
    };
     if (actionTaken === 'scheduled' && scheduleDetails) {
        newWorkflowHistoryEntry.note = `Location: ${scheduleDetails.location}. ${note ? `Note: ${note}` : ''}`.trim();
    } else if ((actionTaken === 'submitted' || actionTaken === 'reschedule_survey') && surveyDetails) {
        if (actionTaken === 'reschedule_survey') {
            newWorkflowHistoryEntry.note = `Reason: ${note}`;
        } else {
            newWorkflowHistoryEntry.note = `Survey Description: ${surveyDetails.description}. ${note ? `Note: ${note}` : ''}`.trim();
        }
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

        // Reset the completion tracker when moving to a new parallel/revision phase
        if (updatedProject.status === 'Pending Parallel Design Uploads' || updatedProject.status === 'Pending Post-Sidang Revision') {
            updatedProject.parallelUploadsCompletedBy = [];
        }

        if (transitionInfo.notification && transitionInfo.notification.division) {
            const notificationConfig = transitionInfo.notification;
            let message = (notificationConfig.message || "Proyek '{projectName}' telah diperbarui ke status: {newStatus}.")
                .replace('{projectName}', updatedProject.title)
                .replace('{newStatus}', updatedProject.status)
                .replace('{actorUsername}', updaterUsername)
                .replace('{reasonNote}', note || '');

            // Format survey date if placeholder exists
            if (message.includes('{surveyDate}') && surveyDetails?.date && surveyDetails?.time) {
                try {
                    const date = parseISO(`${surveyDetails.date}T${surveyDetails.time}`);
                    // Format to "Rabu, 26 Juni 2025 pukul 14:00"
                    const formattedDate = format(date, "EEEE, d MMMM yyyy 'pukul' HH:mm", { locale: IndonesianLocale });
                    message = message.replace('{surveyDate}', formattedDate);
                } catch (e) {
                    console.error("[ProjectService] Error formatting surveyDate for notification:", e);
                    // Fallback to just the date if formatting fails, to avoid sending the raw placeholder
                    message = message.replace('{surveyDate}', surveyDetails.date);
                }
            }


            const targetDivisions = Array.isArray(notificationConfig.division) ? notificationConfig.division : [notificationConfig.division];
            for (const role of targetDivisions) {
                if (role) {
                    await notifyUsersByRole(role, message, projectId);
                    console.log(`[ProjectService] Notification sent to role ${role} for project ${projectId} (Action: ${actionTaken}, New Status: ${updatedProject.status})`);
                }
            }
        }

    } else {
         console.warn(`[ProjectService] No specific transition info for project ${projectId}, action "${actionTaken}" from status "${currentProject.status}" (Progress: ${currentProject.progress}). Updating files/notes if any, but status remains unchanged unless it's a terminal action.`);
         if (!['Completed', 'Canceled'].includes(currentProject.status) && !['completed', 'rejected', 'revise_offer', 'revise_after_sidang', 'canceled_after_sidang', 'revision_completed_and_finish'].includes(actionTaken) ) {
            projects[projectIndex] = updatedProject;
            await writeDb(DB_PATH, projects);
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

    if (scheduleDetails) {
        updatedProject.scheduleDetails = scheduleDetails;
    }
    if (surveyDetails) {
        updatedProject.surveyDetails = surveyDetails;
    }


    projects[projectIndex] = updatedProject;
    await writeDb(DB_PATH, projects);
    console.log(`[ProjectService] Project ${projectId} updated. New status: ${updatedProject.status}, Assigned to: ${updatedProject.assignedDivision}`);

    return updatedProject;
}

export async function updateProjectTitle(projectId: string, newTitle: string): Promise<void> {
    console.log(`[ProjectService] Updating title for project ID: ${projectId} to "${newTitle}"`);
    await ensureProjectFilesBaseDirExists();
    let projects = await readDb<Project[]>(DB_PATH, []);
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`[ProjectService] Project with ID "${projectId}" not found for title update.`);
        throw new Error('PROJECT_NOT_FOUND');
    }

    const originalProject = projects[projectIndex];
    const oldSanitizedTitle = sanitizeForPath(originalProject.title);
    const newSanitizedTitle = sanitizeForPath(newTitle);
    
    const oldProjectAbsoluteFolderPath = path.join(PROJECT_FILES_BASE_DIR, `${projectId}-${oldSanitizedTitle}`);
    const newProjectAbsoluteFolderPath = path.join(PROJECT_FILES_BASE_DIR, `${projectId}-${newSanitizedTitle}`);

    if (oldProjectAbsoluteFolderPath !== newProjectAbsoluteFolderPath) {
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

            projects[projectIndex].files = (originalProject.files || []).map(file => {
                const updatedRelativePath = `${projectId}-${newSanitizedTitle}/${path.basename(file.path)}`;
                return { ...file, path: updatedRelativePath };
            });
        } catch (error) {
            console.error(`[ProjectService] Error processing folder rename or file path updates for project ${projectId}:`, error);
        }
    }

    projects[projectIndex].title = newTitle;
    await writeDb(DB_PATH, projects);
    console.log(`[ProjectService] Title for project ${projectId} updated successfully in JSON.`);
}

export async function reviseProject(
    projectId: string,
    reviserUsername: string,
    reviserRole: string,
    revisionNote?: string,
    actionTaken: string = 'revise' // Default to 'revise', can be 'revise_offer' etc.
): Promise<Project | null> {
    console.log(`[ProjectService] Revising project ID: ${projectId} by ${reviserRole} (${reviserUsername}) with action "${actionTaken}". Note: "${revisionNote || 'N/A'}"`);
    let projects = await readDb<Project[]>(DB_PATH, []);
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`[ProjectService] Project with ID "${projectId}" not found for revision.`);
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

        await writeDb(DB_PATH, projects);
        console.log(`[ProjectService] Project ${projectId} revised via workflow (${actionTaken}). New status: ${projects[projectIndex].status}, Assigned to: ${projects[projectIndex].assignedDivision}`);

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
        throw new Error('REVISION_NOT_SUPPORTED_FOR_CURRENT_STEP');
    }
}

export async function manuallyUpdateProjectStatusAndAssignment(
    params: UpdateProjectParams & { newStatus: string; newAssignedDivision: string; newNextAction: string | null; newProgress: number; adminUsername: string; reasonNote: string }
): Promise<Project> {
    const { projectId, newStatus, newAssignedDivision, newNextAction, newProgress, adminUsername, reasonNote } = params;
    console.log(`[ProjectService] Manually updating project ID: ${projectId} by admin ${adminUsername}. New Status: ${newStatus}, New Division: ${newAssignedDivision}`);
    let projects = await readDb<Project[]>(DB_PATH, []);
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`[ProjectService] Project with ID "${projectId}" not found for manual update.`);
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
    await writeDb(DB_PATH, projects);
    console.log(`[ProjectService] Project ${projectId} manually updated. New status: ${newStatus}, Assigned to: ${newAssignedDivision}`);

    if (newAssignedDivision && newStatus !== 'Completed' && newStatus !== 'Canceled') {
        const notificationMessage = `Proyek "${updatedProjectData.title}" telah diperbarui secara manual oleh ${adminUsername}. Status baru: "${newStatus}", Ditugaskan ke: "${newAssignedDivision}". Tindakan berikutnya: ${newNextAction || 'Tinjau proyek'}. Alasan: ${reasonNote}`;
        await notifyUsersByRole(newAssignedDivision, notificationMessage, projectId);
    }

    return projects[projectIndex];
}

export async function deleteProjectFile(projectId: string, filePath: string, deleterUsername: string): Promise<void> {
    console.log(`[ProjectService] Deleting file record for project ${projectId}, path: ${filePath} by ${deleterUsername}`);
    let projects = await readDb<Project[]>(DB_PATH, []);
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`[ProjectService] Project with ID "${projectId}" not found for file deletion.`);
        throw new Error('PROJECT_NOT_FOUND');
    }

    const originalFileCount = projects[projectIndex].files?.length || 0;
    const fileToDelete = projects[projectIndex].files.find(f => f.path === filePath);
    
    projects[projectIndex].files = (projects[projectIndex].files || []).filter(file => file.path !== filePath);
    const newFileCount = projects[projectIndex].files?.length || 0;

    if (originalFileCount === newFileCount) {
        console.warn(`[ProjectService] File with path "${filePath}" not found in project ${projectId} data. No record was deleted.`);
    } else {
         const historyEntry: WorkflowHistoryEntry = {
            division: deleterUsername,
            action: `Deleted file: "${fileToDelete?.name || 'unknown file'}"`,
            timestamp: new Date().toISOString(),
        };
        projects[projectIndex].workflowHistory.push(historyEntry);
    }

    await writeDb(DB_PATH, projects);
    console.log(`[ProjectService] File record with path "${filePath}" removed from project ${projectId}.`);
}

export async function deleteProject(projectId: string, deleterUsername: string): Promise<void> {
    console.log(`[ProjectService] Attempting to delete project ID: ${projectId} by user: ${deleterUsername}`);
    let projects = await readDb<Project[]>(DB_PATH, []);
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        console.error(`[ProjectService] Project with ID "${projectId}" not found for deletion.`);
        throw new Error('PROJECT_NOT_FOUND_FOR_DELETION');
    }

    const projectToDelete = projects[projectIndex];
    console.log(`[ProjectService] Audit: Project "${projectToDelete.title}" (ID: ${projectId}) was deleted by ${deleterUsername}.`);

    projects.splice(projectIndex, 1);
    await writeDb(DB_PATH, projects);
    console.log(`[ProjectService] Project "${projectToDelete.title}" (ID: ${projectId}) removed from projects.json.`);

    const projectTitleSanitized = sanitizeForPath(projectToDelete.title);
    const projectSpecificDirRelative = `${projectId}-${projectTitleSanitized}`;
    const projectSpecificDirAbsolute = path.join(PROJECT_FILES_BASE_DIR, projectSpecificDirRelative);

    try {
        await fs.access(projectSpecificDirAbsolute);
        await fs.rm(projectSpecificDirAbsolute, { recursive: true, force: true });
        console.log(`[ProjectService] Successfully deleted project folder: ${projectSpecificDirAbsolute}`);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.warn(`[ProjectService] Project folder not found, no need to delete: ${projectSpecificDirAbsolute}`);
        } else {
            console.error(`[ProjectService] Error deleting project folder ${projectSpecificDirAbsolute}:`, error);
        }
    }
}

export async function markParallelUploadsAsCompleteByDivision(
    projectId: string,
    division: string,
    username: string
): Promise<Project | null> {
    console.log(`[ProjectService] Marking parallel uploads complete for project ${projectId} by division ${division}`);
    let projects = await readDb<Project[]>(DB_PATH, []);
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
        throw new Error('PROJECT_NOT_FOUND');
    }

    const project = projects[projectIndex];
    
    if (!project.parallelUploadsCompletedBy) {
        project.parallelUploadsCompletedBy = [];
    }

    if (!project.parallelUploadsCompletedBy.includes(division)) {
        project.parallelUploadsCompletedBy.push(division);

        const historyEntry: WorkflowHistoryEntry = {
            division: username,
            action: `Marked their design/revision phase as complete.`,
            timestamp: new Date().toISOString(),
            note: `Divisi ${division} telah menyelesaikan tugasnya.`,
        };
        project.workflowHistory.push(historyEntry);

        await writeDb(DB_PATH, projects);

        // Notify Admin Proyek
        const notificationMessage = `Divisi ${division} telah menyelesaikan unggahan mereka untuk proyek "${project.title}".`;
        await notifyUsersByRole('Admin Proyek', notificationMessage, projectId);

        return project;
    }
    
    return project; // Return current project if already marked
}
