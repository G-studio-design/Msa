// src/types/project-types.ts

// This file contains type definitions related to projects,
// separated from the server-side logic to comply with 'use server' module constraints.

export interface WorkflowHistoryEntry {
    division: string;
    action: string;
    timestamp: string;
    note?: string;
}

export interface FileEntry {
    name: string;
    uploadedBy: string;
    timestamp: string;
    path: string;
}

export interface ScheduleDetails {
    date: string;
    time: string;
    location: string;
}

export interface SurveyDetails {
    date: string;
    time: string;
    description: string;
}

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
    parallelUploadsCompletedBy?: string[];
}

export interface AddProjectData {
    title: string;
    workflowId: string;
    initialFiles: FileEntry[];
    createdBy: string;
}

export interface UpdateProjectParams {
    projectId: string;
    updaterRole: string;
    updaterUsername: string;
    actionTaken: string;
    files?: Omit<FileEntry, 'timestamp'>[];
    note?: string;
    scheduleDetails?: ScheduleDetails;
    surveyDetails?: SurveyDetails;
}
