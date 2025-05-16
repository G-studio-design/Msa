
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';

export interface WorkflowStepTransition {
  targetStatus: string;
  targetAssignedDivision: string;
  targetNextActionDescription: string | null;
  targetProgress: number;
  notification?: {
    division: string | null; // Role to notify, or null for no specific role (e.g., project creator)
    message: string; // Message template, e.g., "Project '{projectName}' is now at {newStatus}."
  };
}

export interface WorkflowStep {
  stepName: string;
  status: string; // e.g., 'Pending Offer', 'Pending Approval'
  assignedDivision: string; // Role responsible for this step
  progress: number; // Percentage (0-100)
  nextActionDescription: string | null; // Description of the next expected action
  transitions: {
    [action: string]: WorkflowStepTransition; // Key is the action taken (e.g., "submitted", "approved", "rejected")
  } | null; // Null if it's a terminal step (like 'Completed' or 'Canceled')
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

const WORKFLOWS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'workflows.json');

// This is the ID for the default workflow.
export const DEFAULT_WORKFLOW_ID = 'default_standard_workflow';
const DEFAULT_WORKFLOW_NAME = "Standard Project Workflow";
const DEFAULT_WORKFLOW_DESCRIPTION = "The standard, multi-stage project workflow.";

// Defines the structure of the default standard workflow.
const DEFAULT_STANDARD_WORKFLOW_STRUCTURE: WorkflowStep[] = [
    {
        stepName: "Offer Submission",
        status: "Pending Offer",
        assignedDivision: "Admin Proyek",
        progress: 10,
        nextActionDescription: "Unggah Dokumen Penawaran",
        transitions: {
          "submitted": {
            targetStatus: "Pending Approval",
            targetAssignedDivision: "Owner",
            targetNextActionDescription: "Setujui Dokumen Penawaran",
            targetProgress: 20,
            notification: {
              division: "Owner",
              message: "Penawaran untuk proyek '{projectName}' telah diajukan dan menunggu persetujuan Anda."
            }
          }
        }
      },
      {
        stepName: "Offer Approval",
        status: "Pending Approval",
        assignedDivision: "Owner",
        progress: 20,
        nextActionDescription: "Tinjau dan setujui/tolak penawaran",
        transitions: {
          "approved": {
            targetStatus: "Pending DP Invoice",
            targetAssignedDivision: "General Admin",
            targetNextActionDescription: "Buat Faktur DP",
            targetProgress: 25,
            notification: {
              division: "General Admin",
              message: "Penawaran untuk proyek '{projectName}' telah disetujui. Mohon buat faktur DP."
            }
          },
          "rejected": {
            targetStatus: "Canceled",
            targetAssignedDivision: "",
            targetNextActionDescription: null,
            targetProgress: 20,
            notification: {
              division: "Admin Proyek",
              message: "Penawaran untuk proyek '{projectName}' ditolak oleh Owner."
            }
          }
        }
      },
      {
        stepName: "DP Invoice Submission",
        status: "Pending DP Invoice",
        assignedDivision: "General Admin",
        progress: 25,
        nextActionDescription: "Unggah Faktur DP",
        transitions: {
          "submitted": {
            targetStatus: "Pending Approval", // Kembali ke Owner untuk persetujuan DP
            targetAssignedDivision: "Owner",
            targetNextActionDescription: "Setujui Faktur DP",
            targetProgress: 30,
            notification: {
              division: "Owner",
              message: "Faktur DP untuk proyek '{projectName}' telah diajukan dan menunggu persetujuan Anda."
            }
          }
        }
      },
      {
        stepName: "DP Invoice Approval",
        status: "Pending Approval", // Status ini digunakan lagi, tapi progres beda
        assignedDivision: "Owner",
        progress: 30, // Progres ini menandakan ini persetujuan DP
        nextActionDescription: "Tinjau dan setujui/tolak Faktur DP",
        transitions: {
          "approved": {
            targetStatus: "Pending Admin Files",
            targetAssignedDivision: "Admin Proyek",
            targetNextActionDescription: "Unggah Berkas Administrasi",
            targetProgress: 40,
            notification: {
              division: "Admin Proyek",
              message: "Faktur DP untuk proyek '{projectName}' telah disetujui. Mohon unggah berkas administrasi."
            }
          },
          "rejected": { // Jika DP ditolak, mungkin kembali ke General Admin untuk revisi
            targetStatus: "Pending DP Invoice",
            targetAssignedDivision: "General Admin",
            targetNextActionDescription: "Revisi dan Unggah Ulang Faktur DP",
            targetProgress: 25, // Kembali ke progres DP invoice
            notification: {
              division: "General Admin",
              message: "Faktur DP untuk proyek '{projectName}' ditolak oleh Owner. Mohon direvisi."
            }
          }
        }
      },
      {
        stepName: "Admin Files Submission",
        status: "Pending Admin Files",
        assignedDivision: "Admin Proyek",
        progress: 40,
        nextActionDescription: "Unggah Berkas Administrasi",
        transitions: {
          "submitted": {
            targetStatus: "Pending Architect Files",
            targetAssignedDivision: "Arsitek",
            targetNextActionDescription: "Unggah Berkas Arsitektur",
            targetProgress: 50,
            notification: {
              division: "Arsitek",
              message: "Berkas administrasi untuk '{projectName}' lengkap. Mohon unggah berkas arsitektur."
            }
          }
        }
      },
      {
        stepName: "Architect Files Submission",
        status: "Pending Architect Files",
        assignedDivision: "Arsitek",
        progress: 50,
        nextActionDescription: "Unggah Berkas Arsitektur",
        transitions: {
          "submitted": {
            targetStatus: "Pending Structure Files",
            targetAssignedDivision: "Struktur",
            targetNextActionDescription: "Unggah Berkas Struktur",
            targetProgress: 70,
            notification: {
              division: "Struktur",
              message: "Berkas arsitektur untuk '{projectName}' lengkap. Mohon unggah berkas struktur."
            }
          }
        }
      },
      {
        stepName: "Structure Files Submission",
        status: "Pending Structure Files",
        assignedDivision: "Struktur",
        progress: 70,
        nextActionDescription: "Unggah Berkas Struktur",
        transitions: {
          "submitted": {
            targetStatus: "Pending MEP Files",
            targetAssignedDivision: "Admin Proyek", // Changed to Admin Proyek as per request
            targetNextActionDescription: "Unggah Berkas MEP",
            targetProgress: 80,
            notification: {
              division: "Admin Proyek", // Notify Admin Proyek
              message: "Berkas struktur untuk '{projectName}' lengkap. Mohon unggah berkas MEP."
            }
          }
        }
      },
      {
        stepName: "MEP Files Submission",
        status: "Pending MEP Files",
        assignedDivision: "Admin Proyek", // Done by Admin Proyek
        progress: 80,
        nextActionDescription: "Unggah Berkas MEP",
        transitions: {
          "submitted": {
            targetStatus: "Pending Scheduling",
            targetAssignedDivision: "Admin Proyek", // Admin Proyek schedules
            targetNextActionDescription: "Jadwalkan Sidang",
            targetProgress: 90,
            notification: { // Corrected syntax from notification": to notification:
              division: "Admin Proyek",
              message: "Semua berkas teknis untuk '{projectName}' lengkap. Mohon jadwalkan sidang."
            }
          }
        }
      },
      {
        stepName: "Sidang Scheduling",
        status: "Pending Scheduling",
        assignedDivision: "Admin Proyek", // Done by Admin Proyek (or Owner via UI logic)
        progress: 90,
        nextActionDescription: "Jadwalkan Sidang",
        transitions: {
          "scheduled": { 
            targetStatus: "Scheduled",
            targetAssignedDivision: "Owner",
            targetNextActionDescription: "Nyatakan Hasil Sidang",
            targetProgress: 95,
            notification: {
              division: "Owner",
              message: "Sidang untuk proyek '{projectName}' telah dijadwalkan. Mohon nyatakan hasilnya setelah selesai."
            }
          }
        }
      },
      {
        stepName: "Sidang Outcome Declaration",
        status: "Scheduled",
        assignedDivision: "Owner",
        progress: 95,
        nextActionDescription: "Nyatakan Hasil Sidang (Sukses/Revisi/Batal)",
        transitions: {
          "completed": {
            targetStatus: "Completed",
            targetAssignedDivision: "",
            targetNextActionDescription: null,
            targetProgress: 100,
            notification: null
          },
          "revise_after_sidang": { 
            targetStatus: "Pending Admin Files", // Example: revision sends back to Admin Proyek for general file updates
            targetAssignedDivision: "Admin Proyek",
            targetNextActionDescription: "Lakukan Revisi Pasca Sidang",
            targetProgress: 40, // Reset progress to Admin Files stage
            notification: {
              division: "Admin Proyek",
              message: "Proyek '{projectName}' memerlukan revisi setelah sidang. Mohon perbarui berkas yang diperlukan."
            }
          },
          "canceled_after_sidang": {
            targetStatus: "Canceled",
            targetAssignedDivision: "",
            targetNextActionDescription: null,
            targetProgress: 95, // Or current progress
            notification: null
          }
        }
      },
      {
        stepName: "Project Completed",
        status: "Completed",
        assignedDivision: "",
        progress: 100,
        nextActionDescription: null,
        transitions: null 
      },
      {
        stepName: "Project Canceled",
        status: "Canceled",
        assignedDivision: "",
        progress: 0, 
        nextActionDescription: null,
        transitions: null 
      }
];


async function _readWorkflowsFromFile(): Promise<Workflow[]> {
  try {
    await fs.access(WORKFLOWS_DB_PATH);
    const data = await fs.readFile(WORKFLOWS_DB_PATH, 'utf8');
    if (data.trim() === "") {
      console.log("[WorkflowService] Workflows.json is empty. Returning empty array for initialization.");
      return [];
    }
    try {
        const workflows = JSON.parse(data) as Workflow[];
        console.log(`[WorkflowService] Successfully read ${workflows.length} workflows from file.`);
        return workflows;
    } catch (parseError) {
        console.error("[WorkflowService] Error parsing workflows.json, returning empty array. File might be corrupted.", parseError);
        return [];
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log("[WorkflowService] Workflows.json not found. Returning empty array for initialization.");
      return [];
    }
    console.error("[WorkflowService] Error reading workflows.json. Returning empty array.", error);
    return [];
  }
}

async function writeWorkflows(workflows: Workflow[]): Promise<void> {
  try {
    await fs.writeFile(WORKFLOWS_DB_PATH, JSON.stringify(workflows, null, 2), 'utf8');
    console.log(`[WorkflowService] Workflows data successfully written to: ${WORKFLOWS_DB_PATH}. Total: ${workflows.length}`);
  } catch (error) {
    console.error("[WorkflowService] Error writing workflows database:", WORKFLOWS_DB_PATH, error);
    throw new Error('Failed to save workflow data.');
  }
}

export async function getAllWorkflows(): Promise<Workflow[]> {
  let workflows = await _readWorkflowsFromFile();
  let saveNeeded = false;

  const defaultWorkflowExists = workflows.some(wf => wf.id === DEFAULT_WORKFLOW_ID);

  if (!defaultWorkflowExists) {
    console.log(`[WorkflowService] Default workflow (ID: ${DEFAULT_WORKFLOW_ID}) not found. Adding it with full structure.`);
    const defaultWorkflow: Workflow = {
      id: DEFAULT_WORKFLOW_ID,
      name: DEFAULT_WORKFLOW_NAME,
      description: DEFAULT_WORKFLOW_DESCRIPTION,
      steps: DEFAULT_STANDARD_WORKFLOW_STRUCTURE, // Use the full structure
    };
    workflows.unshift(defaultWorkflow); // Add to the beginning
    saveNeeded = true;
  } else {
    // Optional: Ensure the existing default workflow has the most up-to-date step structure
    // This can be useful if you update DEFAULT_STANDARD_WORKFLOW_STRUCTURE in code
    const defaultWorkflowIndex = workflows.findIndex(wf => wf.id === DEFAULT_WORKFLOW_ID);
    if (defaultWorkflowIndex !== -1) {
        // Deep comparison might be heavy, for now, let's assume if it exists, its structure is managed by user or is up-to-date
        // If you want to force-update its steps:
        // if (JSON.stringify(workflows[defaultWorkflowIndex].steps) !== JSON.stringify(DEFAULT_STANDARD_WORKFLOW_STRUCTURE)) {
        //     console.log(`[WorkflowService] Updating steps for existing default workflow (ID: ${DEFAULT_WORKFLOW_ID}) to match current code definition.`);
        //     workflows[defaultWorkflowIndex].steps = DEFAULT_STANDARD_WORKFLOW_STRUCTURE;
        //     saveNeeded = true;
        // }
    }
  }


  if (saveNeeded) {
    try {
      await writeWorkflows(workflows);
      console.log("[WorkflowService] Workflows.json persisted after ensuring/updating default workflow.");
    } catch (writeError) {
      console.error("[WorkflowService] Failed to persist workflows.json after ensuring/updating default workflow:", writeError);
      // Decide if you want to throw the error or return the in-memory workflows
      // For now, we'll return in-memory so the app might still function with the defaults
    }
  }
  return workflows;
}

export async function getWorkflowById(id: string): Promise<Workflow | null> {
  const workflows = await getAllWorkflows(); // Ensures default is present if needed
  return workflows.find(wf => wf.id === id) || null;
}

export async function getFirstStep(workflowId: string): Promise<WorkflowStep | null> {
  const workflow = await getWorkflowById(workflowId);
  if (workflow && workflow.steps.length > 0) {
    return workflow.steps[0];
  }
  console.warn(`[WorkflowService] Workflow with ID "${workflowId}" not found or has no steps when trying to get first step.`);
  return null;
}

export async function getCurrentStepDetails(
  workflowId: string,
  currentStatus: string,
  currentProgress: number // Added progress to help differentiate steps with same status name
): Promise<WorkflowStep | null> {
  const workflow = await getWorkflowById(workflowId);
  if (!workflow) {
    console.warn(`[WorkflowService] Workflow with ID ${workflowId} not found when trying to get current step details.`);
    return null;
  }
  // Find step by status AND progress for more precise matching
  const step = workflow.steps.find(s => s.status === currentStatus && s.progress === currentProgress);
  if (!step) {
      console.warn(`[WorkflowService] Step with status "${currentStatus}" and progress ${currentProgress} not found in workflow "${workflowId}". Checking by status only.`);
      // Fallback to checking by status only if progress doesn't match (e.g., manual override happened)
      const stepByStatusOnly = workflow.steps.find(s => s.status === currentStatus);
      if (stepByStatusOnly) {
          console.warn(`[WorkflowService] Found step by status "${currentStatus}" only. This might not be the intended step if multiple steps share this status name.`);
          return stepByStatusOnly;
      }
  }
  return step || null;
}


export async function getTransitionInfo(
  workflowId: string,
  currentStatus: string,
  currentProgress: number, // Use progress for more accurate step identification
  actionTaken: string = 'submitted' 
): Promise<WorkflowStepTransition | null> {
  const workflow = await getWorkflowById(workflowId);
  if (!workflow) {
    console.error(`[WorkflowService] Workflow with ID ${workflowId} not found.`);
    return null;
  }

  const currentStep = workflow.steps.find(step => step.status === currentStatus && step.progress === currentProgress);

  if (!currentStep) {
    console.error(`[WorkflowService] Current step for status "${currentStatus}" and progress ${currentProgress} not found in workflow "${workflowId}".`);
    return null;
  }

  if (!currentStep.transitions) {
    console.log(`[WorkflowService] Step "${currentStep.stepName}" in workflow "${workflowId}" is a terminal step (no transitions defined).`);
    return null;
  }

  const transition = currentStep.transitions[actionTaken];
  if (!transition) {
    console.warn(`[WorkflowService] No transition found for action "${actionTaken}" from step "${currentStep.stepName}" (status: ${currentStatus}, progress: ${currentProgress}) in workflow "${workflowId}".`);
    // No automatic fallback to 'default' or 'submitted' here, action must be explicit.
    return null;
  }
  return transition;
}

export async function addWorkflow(name: string, description: string): Promise<Workflow> {
  let workflows = await _readWorkflowsFromFile(); // Read existing workflows

  const newWorkflowId = `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newWorkflow: Workflow = {
    id: newWorkflowId,
    name,
    description: description || '',
    steps: JSON.parse(JSON.stringify(DEFAULT_STANDARD_WORKFLOW_STRUCTURE)), // Create a deep copy of default steps
  };

  workflows.push(newWorkflow);
  await writeWorkflows(workflows);
  console.log(`[WorkflowService] New workflow "${name}" added with ID ${newWorkflowId} using default standard steps.`);
  return newWorkflow;
}

export async function updateWorkflow(workflowId: string, updatedWorkflowData: Partial<Omit<Workflow, 'id'>>): Promise<Workflow | null> {
  let workflows = await _readWorkflowsFromFile();
  const index = workflows.findIndex(wf => wf.id === workflowId);
  if (index === -1) {
    console.error(`[WorkflowService] Workflow with ID ${workflowId} not found for update.`);
    return null;
  }
  
  // Ensure steps are not accidentally set to undefined if not provided in updatedWorkflowData
  const updatedSteps = updatedWorkflowData.steps ? updatedWorkflowData.steps : workflows[index].steps;

  const updatedWorkflow: Workflow = {
    ...workflows[index],
    ...updatedWorkflowData,
    steps: updatedSteps, // Use the potentially updated steps or original steps
    id: workflows[index].id 
  };

  workflows[index] = updatedWorkflow;

  await writeWorkflows(workflows);
  console.log(`[WorkflowService] Workflow "${workflows[index].name}" (ID: ${workflowId}) updated.`);
  return workflows[index];
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  let workflows = await _readWorkflowsFromFile();
  const initialLength = workflows.length;

  // Prevent deletion of the default workflow if it's the only one left
  if (workflowId === DEFAULT_WORKFLOW_ID && workflows.length === 1 && workflows[0].id === DEFAULT_WORKFLOW_ID) {
      console.warn(`[WorkflowService] Cannot delete the default workflow (ID: ${DEFAULT_WORKFLOW_ID}) as it's the only workflow remaining.`);
      throw new Error('CANNOT_DELETE_LAST_OR_DEFAULT_WORKFLOW');
  }

  workflows = workflows.filter(wf => wf.id !== workflowId);

  if (workflows.length === initialLength && workflowId !== DEFAULT_WORKFLOW_ID) {
      // This condition might be true if the workflow to delete wasn't found, and it wasn't the default one
      console.warn(`[WorkflowService] Workflow with ID ${workflowId} not found for deletion, or no change made.`);
      throw new Error('WORKFLOW_NOT_FOUND_FOR_DELETION');
  } else if (workflows.length < initialLength) {
    console.log(`[WorkflowService] Workflow with ID ${workflowId} deleted. Remaining workflows: ${workflows.length}`);
  }
  
  // If all workflows are deleted (including the default one previously), ensure default gets re-added
  if (workflows.length === 0) {
    console.log("[WorkflowService] No workflows left after deletion. Ensuring default workflow is re-added.");
    const defaultWorkflow: Workflow = {
      id: DEFAULT_WORKFLOW_ID,
      name: DEFAULT_WORKFLOW_NAME,
      description: DEFAULT_WORKFLOW_DESCRIPTION,
      steps: DEFAULT_STANDARD_WORKFLOW_STRUCTURE,
    };
    workflows.push(defaultWorkflow);
  }

  await writeWorkflows(workflows);
}


// Function to get all unique statuses from all workflows (for manual status change dropdown)
export async function getAllUniqueStatuses(): Promise<string[]> {
    const workflows = await getAllWorkflows(); // This ensures default is present if needed
    const allStatuses = new Set<string>();
    workflows.forEach(wf => {
        wf.steps.forEach(step => {
            allStatuses.add(step.status);
        });
    });
    return Array.from(allStatuses);
}
