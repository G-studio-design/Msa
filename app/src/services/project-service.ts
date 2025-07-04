// src/services/project-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale } from 'date-fns/locale';
import { notifyUsersByRole, deleteNotificationsByProjectId } from './notification-service';
import { getWorkflowById, getFirstStep, getTransitionInfo } from './workflow-service';
import { DEFAULT_WORKFLOW_ID } from '@/config/workflow-constants';
import type { Project, AddProjectData, UpdateProjectParams, FileEntry, ScheduleDetails, SurveyDetails, WorkflowHistoryEntry } from '@/types/project-types';

export type { Project, AddProjectData, UpdateProjectParams, FileEntry, ScheduleDetails, SurveyDetails, WorkflowHistoryEntry };

async function readDb<T>(dbPath: string, defaultData: T): Promise<T> {
    try {
        await fs.access(dbPath);
        const data = await fs.readFile(dbPath, 'utf8');
        if (data.trim() === "") {
            return defaultData;
        }
        return JSON.parse(data) as T;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
          return defaultData;
        }
        console.error(`[DB Read Error] Error reading or parsing database at ${path.basename(dbPath)}.`, error);
        return defaultData;
    }
}

async function writeDb<T>(dbPath: string, data: T): Promise<void> {
    const dbDir = path.dirname(dbPath);
    await fs.mkdir(dbDir, { recursive: true });
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

export async function addProject(projectData: Omit<AddProjectData, 'initialFiles'>): Promise<Project> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'projects.json');
    console.log(`[ProjectService] Adding project entry: "${projectData.title}"`);

    const projects = await readDb<Project[]>(DB_PATH, []);
    const now = new Date().toISOString();
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const firstStep = await getFirstStep(projectData.workflowId);
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
            { division: projectData.createdBy, action: `Created Project with workflow: ${projectData.workflowId}`, timestamp: now, note: `Project entry created.` },
            { division: 'System', action: `Assigned to ${firstStep.assignedDivision} for ${firstStep.nextActionDescription || 'initial step'}`, timestamp: now }
        ],
        files: [], // Files will be added in a separate step
        createdAt: now,
        createdBy: projectData.createdBy,
    };

    projects.push(newProject);
    await writeDb(DB_PATH, projects);
    console.log(`[ProjectService] Project entry "${newProject.title}" (ID: ${newProject.id}) created.`);
    
    if (firstStep.assignedDivision) {
        const message = `Proyek baru "${newProject.title}" telah dibuat oleh ${projectData.createdBy} dan memerlukan tindakan: ${firstStep.nextActionDescription || 'Langkah awal'}.`;
        await notifyUsersByRole(firstStep.assignedDivision, message, newProject.id);
    }

    return newProject;
}

export async function addFilesToProject(projectId: string, filesToAdd: FileEntry[], actorUsername: string): Promise<Project | null> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'projects.json');
    const projects = await readDb<Project[]>(DB_PATH, []);
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) {
        console.error(`[ProjectService] Project with ID "${projectId}" not found to add files.`);
        return null;
    }

    const project = projects[projectIndex];
    project.files.push(...filesToAdd);
    project.workflowHistory.push({
        division: actorUsername,
        action: `Uploaded initial file(s): ${filesToAdd.map(f => f.name).join(', ')}`,
        timestamp: new Date().toISOString(),
    });
    
    projects[projectIndex] = project;
    await writeDb(DB_PATH, projects);
    
    return project;
}


export async function getAllProjects(): Promise<Project[]> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'projects.json');
    let projects = await readDb<Project[]>(DB_PATH, []);
    
    projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return projects;
}

export async function getProjectById(projectId: string): Promise<Project | null> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'projects.json');
    const projects = await readDb<Project[]>(DB_PATH, []);
    const project = projects.find(p => p.id === projectId) || null;
    if (project) {
        project.files = project.files || [];
        project.workflowHistory = project.workflowHistory || [];
    }
    return project;
}

export async function updateProject(params: UpdateProjectParams): Promise<Project | null> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'projects.json');
    const { projectId, updaterRole, updaterUsername, actionTaken, files: newFilesData = [], note, scheduleDetails, surveyDetails } = params;

    const projects = await readDb<Project[]>(DB_PATH, []);
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) throw new Error('PROJECT_NOT_FOUND');

    const currentProject = projects[projectIndex];
    currentProject.files = currentProject.files || [];
    currentProject.workflowHistory = currentProject.workflowHistory || [];
    const projectWorkflowId = currentProject.workflowId || DEFAULT_WORKFLOW_ID;
    
    const now = new Date().toISOString();
    const filesWithTimestamp = newFilesData.map(file => ({ ...file, timestamp: now }));
    
    const transitionInfo = await getTransitionInfo(projectWorkflowId, currentProject.status, currentProject.progress, actionTaken);

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

    currentProject.files.push(...filesWithTimestamp);
    currentProject.workflowHistory.push(newWorkflowHistoryEntry);

    if (transitionInfo) {
        currentProject.status = transitionInfo.targetStatus;
        currentProject.assignedDivision = transitionInfo.targetAssignedDivision;
        currentProject.nextAction = transitionInfo.targetNextActionDescription;
        currentProject.progress = transitionInfo.targetProgress;
        
        if (transitionInfo.notification?.division) {
            let message = (transitionInfo.notification.message || "Project '{projectName}' updated to: {newStatus}.")
                .replace('{projectName}', currentProject.title)
                .replace('{newStatus}', currentProject.status)
                .replace('{actorUsername}', updaterUsername)
                .replace('{reasonNote}', note || '');
            if (message.includes('{surveyDate}') && surveyDetails?.date) {
                const formattedDate = format(parseISO(`${surveyDetails.date}T${surveyDetails.time || '00:00'}`), "EEEE, d MMMM yyyy 'pukul' HH:mm", { locale: IndonesianLocale });
                message = message.replace('{surveyDate}', formattedDate);
            }
            await notifyUsersByRole(transitionInfo.notification.division, message, projectId);
        }
    } else {
        console.warn(`[ProjectService] No transition found for action '${actionTaken}' from status '${currentProject.status}'. Only updating history and files.`);
    }

    if (scheduleDetails) currentProject.scheduleDetails = scheduleDetails;
    if (surveyDetails) currentProject.surveyDetails = surveyDetails;

    projects[projectIndex] = currentProject;
    await writeDb(DB_PATH, projects);
    return currentProject;
}

export async function updateProjectTitle(projectId: string, newTitle: string, updaterUsername: string): Promise<void> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'projects.json');
    const projects = await readDb<Project[]>(DB_PATH, []);
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) throw new Error('PROJECT_NOT_FOUND');

    const oldTitle = projects[projectIndex].title;
    projects[projectIndex].title = newTitle;
     projects[projectIndex].workflowHistory.push({
        division: updaterUsername,
        action: `Manually changed project title from "${oldTitle}" to "${newTitle}".`,
        timestamp: new Date().toISOString(),
    });
    await writeDb(DB_PATH, projects);
}

export async function deleteProjectFile(projectId: string, filePath: string, deleterUsername: string): Promise<void> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'projects.json');
    const projects = await readDb<Project[]>(DB_PATH, []);
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) throw new Error('PROJECT_NOT_FOUND');

    const fileToDelete = projects[projectIndex].files.find(f => f.path === filePath);
    projects[projectIndex].files = projects[projectIndex].files.filter(file => file.path !== filePath);

    if (fileToDelete) {
        projects[projectIndex].workflowHistory.push({
            division: deleterUsername,
            action: `Deleted file: "${fileToDelete.name}"`,
            timestamp: new Date().toISOString(),
        });
    }
    
    await writeDb(DB_PATH, projects);
}

export async function deleteProject(projectId: string, deleterUsername: string): Promise<string> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'projects.json');
    const projects = await readDb<Project[]>(DB_PATH, []);
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) throw new Error('PROJECT_NOT_FOUND_FOR_DELETION');

    const projectTitle = projects[projectIndex].title;
    
    projects.splice(projectIndex, 1);
    await writeDb(DB_PATH, projects);
    
    await deleteNotificationsByProjectId(projectId);
    return projectTitle;
}

export async function manuallyUpdateProjectStatusAndAssignment(
    params: {
        projectId: string;
        newStatus: string;
        newAssignedDivision: string;
        newNextAction: string | null;
        newProgress: number;
        adminUsername: string;
        reasonNote: string;
    }
): Promise<Project> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'projects.json');
    const { projectId, newStatus, newAssignedDivision, newNextAction, newProgress, adminUsername, reasonNote } = params;
    let projects = await readDb<Project[]>(DB_PATH, []);
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) throw new Error('PROJECT_NOT_FOUND');

    const currentProject = projects[projectIndex];
    currentProject.status = newStatus;
    currentProject.assignedDivision = newAssignedDivision;
    currentProject.nextAction = newNextAction;
    currentProject.progress = newProgress;

    currentProject.workflowHistory.push({
        division: adminUsername,
        action: `Manually changed status to "${newStatus}" and assigned to "${newAssignedDivision}".`,
        timestamp: new Date().toISOString(),
        note: `Reason: ${reasonNote}`,
    });

    projects[projectIndex] = currentProject;
    await writeDb(DB_PATH, projects);
    
    if (newAssignedDivision && newStatus !== 'Completed' && newStatus !== 'Canceled') {
        const notificationMessage = `Proyek "${currentProject.title}" telah diperbarui oleh ${adminUsername}. Status baru: "${newStatus}", Ditugaskan ke: "${newAssignedDivision}".`;
        await notifyUsersByRole(newAssignedDivision, notificationMessage, projectId);
    }

    return currentProject;
}

export async function reviseProject(
    projectId: string,
    reviserUsername: string,
    reviserRole: string,
    revisionNote?: string,
    actionTaken: string = 'revise'
): Promise<Project | null> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'projects.json');
    let projects = await readDb<Project[]>(DB_PATH, []);
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) throw new Error('PROJECT_NOT_FOUND');

    const currentProject = projects[projectIndex];
    const projectWorkflowId = currentProject.workflowId || DEFAULT_WORKFLOW_ID;
    
    const revisionTransition = await getTransitionInfo(projectWorkflowId, currentProject.status, currentProject.progress, actionTaken);
    if (!revisionTransition) throw new Error('REVISION_NOT_SUPPORTED_FOR_CURRENT_STEP');

    currentProject.status = revisionTransition.targetStatus;
    currentProject.assignedDivision = revisionTransition.targetAssignedDivision;
    currentProject.nextAction = revisionTransition.targetNextActionDescription;
    currentProject.progress = revisionTransition.targetProgress;
    
    currentProject.workflowHistory.push({
        division: reviserRole,
        action: `${reviserUsername} (${reviserRole}) requested revision.`,
        timestamp: new Date().toISOString(),
        note: revisionNote,
    });
    
    await writeDb(DB_PATH, projects);

    if (revisionTransition.notification?.division) {
        const message = (revisionTransition.notification.message || "Proyek '{projectName}' memerlukan revisi dari Anda.")
            .replace('{projectName}', currentProject.title)
            .replace('{actorUsername}', reviserUsername)
            .replace('{reasonNote}', revisionNote || 'N/A');
        await notifyUsersByRole(revisionTransition.notification.division, message, projectId);
    }

    return currentProject;
}

export async function markParallelUploadsAsCompleteByDivision(
    projectId: string,
    division: string,
    username: string
): Promise<Project | null> {
    const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'projects.json');
    let projects = await readDb<Project[]>(DB_PATH, []);
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) throw new Error('PROJECT_NOT_FOUND');

    const project = projects[projectIndex];
    
    if (!project.parallelUploadsCompletedBy) {
        project.parallelUploadsCompletedBy = [];
    }

    if (!project.parallelUploadsCompletedBy.includes(division)) {
        project.parallelUploadsCompletedBy.push(division);
        project.workflowHistory.push({
            division: username,
            action: `Marked their design/revision phase as complete.`,
            timestamp: new Date().toISOString(),
            note: `Divisi ${division} telah menyelesaikan tugasnya.`,
        });

        await writeDb(DB_PATH, projects);

        const notificationMessage = `Divisi ${division} telah menyelesaikan unggahan mereka untuk proyek "${project.title}".`;
        await notifyUsersByRole('Admin Proyek', notificationMessage, projectId);
        return project;
    }
    
    return project;
}
