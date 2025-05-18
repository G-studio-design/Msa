
// src/services/workflow-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import { 
    DEFAULT_WORKFLOW_ID, 
    DEFAULT_WORKFLOW_NAME, 
    DEFAULT_WORKFLOW_DESCRIPTION 
} from '@/config/workflow-constants';

export interface WorkflowStepTransition {
  targetStatus: string;
  targetAssignedDivision: string;
  targetNextActionDescription: string | null;
  targetProgress: number;
  notification?: {
    division: string | null; 
    message: string; 
  };
}

export interface WorkflowStep {
  stepName: string;
  status: string; 
  assignedDivision: string; 
  progress: number; 
  nextActionDescription: string | null; 
  transitions: {
    [action: string]: WorkflowStepTransition; 
  } | null; 
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

const WORKFLOWS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'workflows.json');

// Struktur alur kerja default yang lengkap
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
            targetAssignedDivision: "Admin/Akuntan",
            targetNextActionDescription: "Buat Faktur DP",
            targetProgress: 25,
            notification: {
              division: "Admin/Akuntan",
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
        assignedDivision: "Admin/Akuntan",
        progress: 25,
        nextActionDescription: "Unggah Faktur DP",
        transitions: {
          "submitted": {
            targetStatus: "Pending Approval", 
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
        status: "Pending Approval", 
        assignedDivision: "Owner",
        progress: 30, 
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
          "rejected": { 
            targetStatus: "Pending DP Invoice",
            targetAssignedDivision: "Admin/Akuntan",
            targetNextActionDescription: "Revisi dan Unggah Ulang Faktur DP",
            targetProgress: 25, 
            notification: {
              division: "Admin/Akuntan",
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
            targetStatus: "Pending Survey Details", // MODIFIED: Next step is Survey Details
            targetAssignedDivision: "Admin Proyek",   // MODIFIED: Assigned to Admin Proyek
            targetNextActionDescription: "Input Jadwal Survei & Unggah Hasil", // MODIFIED: New next action
            targetProgress: 45,                    // MODIFIED: New progress
            notification: {
              division: "Admin Proyek",              // MODIFIED: Notify Admin Proyek
              message: "Berkas administrasi untuk '{projectName}' lengkap. Mohon jadwalkan survei dan unggah hasilnya."
            }
          }
        }
      },
      { // NEW STEP ADDED
        stepName: "Survey Details Submission",
        status: "Pending Survey Details",
        assignedDivision: "Admin Proyek",
        progress: 45,
        nextActionDescription: "Input Jadwal Survei & Unggah Hasil",
        transitions: {
          "submitted": { // Assumes survey details and report are submitted together
            targetStatus: "Pending Architect Files",
            targetAssignedDivision: "Arsitek",
            targetNextActionDescription: "Unggah Berkas Arsitektur",
            targetProgress: 50,
            notification: {
              division: "Arsitek",
              message: "Hasil survei untuk '{projectName}' telah diunggah. Mohon unggah berkas arsitektur."
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
            targetAssignedDivision: "Admin Proyek", // MEP files by Admin Proyek
            targetNextActionDescription: "Unggah Berkas MEP",
            targetProgress: 80,
            notification: {
              division: "Admin Proyek", 
              message: "Berkas struktur untuk '{projectName}' lengkap. Mohon unggah berkas MEP."
            }
          }
        }
      },
      {
        stepName: "MEP Files Submission",
        status: "Pending MEP Files",
        assignedDivision: "Admin Proyek", 
        progress: 80, 
        nextActionDescription: "Unggah Berkas MEP",
        transitions: {
          "submitted": {
            targetStatus: "Pending Scheduling",
            targetAssignedDivision: "Admin Proyek", // Scheduling by Admin Proyek
            targetNextActionDescription: "Jadwalkan Sidang",
            targetProgress: 90, 
            notification: {
              division: "Admin Proyek", 
              message: "Semua berkas teknis untuk '{projectName}' lengkap. Mohon jadwalkan sidang."
            }
          }
        }
      },
      {
        stepName: "Sidang Scheduling",
        status: "Pending Scheduling",
        assignedDivision: "Admin Proyek", 
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
            targetStatus: "Pending Admin Files", 
            targetAssignedDivision: "Admin Proyek",
            targetNextActionDescription: "Lakukan Revisi Pasca Sidang pada Berkas Administrasi",
            targetProgress: 40, 
            notification: {
              division: "Admin Proyek",
              message: "Proyek '{projectName}' memerlukan revisi setelah sidang. Mohon perbarui berkas administrasi dan teknis yang diperlukan."
            }
          },
          "canceled_after_sidang": {
            targetStatus: "Canceled",
            targetAssignedDivision: "",
            targetNextActionDescription: null,
            targetProgress: 95, 
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
      console.log("[WorkflowService] workflows.json is empty. Returning empty array for initialization.");
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
      console.log("[WorkflowService] workflows.json not found. Returning empty array for initialization.");
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
  console.log("[WorkflowService] getAllWorkflows called.");
  let workflows = await _readWorkflowsFromFile();
  let saveNeeded = false;

  const defaultWorkflowExists = workflows.some(wf => wf.id === DEFAULT_WORKFLOW_ID);

  if (!defaultWorkflowExists) {
    console.log(`[WorkflowService] Default workflow (ID: ${DEFAULT_WORKFLOW_ID}) not found. Adding it with full structure.`);
    const defaultWorkflow: Workflow = {
      id: DEFAULT_WORKFLOW_ID,
      name: DEFAULT_WORKFLOW_NAME,
      description: DEFAULT_WORKFLOW_DESCRIPTION,
      steps: JSON.parse(JSON.stringify(DEFAULT_STANDARD_WORKFLOW_STRUCTURE)), 
    };
    workflows.unshift(defaultWorkflow);
    saveNeeded = true;
  } else {
    // Ensure the existing default workflow has the latest step structure
    const defaultWorkflowIndex = workflows.findIndex(wf => wf.id === DEFAULT_WORKFLOW_ID);
    if (defaultWorkflowIndex !== -1) {
        // Simple check: compare number of steps. For a more robust check, a deep comparison would be needed.
        if (workflows[defaultWorkflowIndex].steps.length !== DEFAULT_STANDARD_WORKFLOW_STRUCTURE.length) {
            console.warn(`[WorkflowService] Default workflow (ID: ${DEFAULT_WORKFLOW_ID}) structure mismatch. Updating to latest definition.`);
            workflows[defaultWorkflowIndex].steps = JSON.parse(JSON.stringify(DEFAULT_STANDARD_WORKFLOW_STRUCTURE));
            saveNeeded = true;
        }
    }
    console.log(`[WorkflowService] Default workflow (ID: ${DEFAULT_WORKFLOW_ID}) already exists or updated.`);
  }
  
  workflows = workflows.map(wf => {
    if (!wf.steps || wf.steps.length === 0) {
      console.warn(`[WorkflowService] Workflow "${wf.name}" (ID: ${wf.id}) has no steps. Assigning default steps from FULL_DEFAULT_STANDARD_WORKFLOW_STRUCTURE.`);
      wf.steps = JSON.parse(JSON.stringify(DEFAULT_STANDARD_WORKFLOW_STRUCTURE));
      saveNeeded = true;
    }
    return wf;
  });

  if (saveNeeded) {
    try {
      await writeWorkflows(workflows);
      console.log("[WorkflowService] workflows.json persisted after ensuring/updating default workflow or fixing empty steps.");
    } catch (writeError) {
      console.error("[WorkflowService] Failed to persist workflows.json after ensuring/updating default workflow:", writeError);
    }
  }
  console.log(`[WorkflowService] Returning ${workflows.length} workflows.`);
  return workflows;
}

export async function getWorkflowById(id: string): Promise<Workflow | null> {
  const workflows = await getAllWorkflows(); 
  return workflows.find(wf => wf.id === id) || null;
}

export async function getFirstStep(workflowId: string): Promise<WorkflowStep | null> {
  const workflow = await getWorkflowById(workflowId);
  if (workflow && workflow.steps && workflow.steps.length > 0) {
    return workflow.steps[0];
  }
  console.warn(`[WorkflowService] Workflow with ID "${workflowId}" not found or has no steps when trying to get first step.`);
  return null;
}

export async function getCurrentStepDetails(
  workflowId: string,
  currentStatus: string,
  currentProgress: number 
): Promise<WorkflowStep | null> {
  const workflow = await getWorkflowById(workflowId);
  if (!workflow) {
    console.warn(`[WorkflowService] Workflow with ID ${workflowId} not found when trying to get current step details.`);
    return null;
  }
  const step = workflow.steps.find(s => s.status === currentStatus && s.progress === currentProgress);
  if (!step) {
      console.warn(`[WorkflowService] Step with status "${currentStatus}" and progress ${currentProgress} not found in workflow "${workflowId}".`);
      return null;
  }
  return step;
}


export async function getTransitionInfo(
  workflowId: string,
  currentStatus: string,
  currentProgress: number,
  actionTaken: string = 'submitted' 
): Promise<WorkflowStepTransition | null> {
  const workflow = await getWorkflowById(workflowId);
  if (!workflow) {
    console.error(`Workflow with ID ${workflowId} not found.`);
    return null;
  }

  const currentStep = workflow.steps.find(step => step.status === currentStatus && step.progress === currentProgress);

  if (!currentStep) {
    console.error(`Current step for status "${currentStatus}" and progress ${currentProgress} not found in workflow "${workflowId}".`);
    return null;
  }

  if (!currentStep.transitions) {
    console.log(`Step "${currentStep.stepName}" in workflow "${workflowId}" is a terminal step (no transitions defined).`);
    return null; 
  }

  const transition = currentStep.transitions[actionTaken];
  if (!transition) {
    console.warn(`No transition found for action "${actionTaken}" from step "${currentStep.stepName}" (status: ${currentStatus}, progress: ${currentProgress}) in workflow "${workflowId}". Trying 'default'.`);
    const fallbackAction = currentStep.transitions['default'] ? 'default' : (currentStep.transitions['submitted'] ? 'submitted' : null);
    if (fallbackAction) {
      return currentStep.transitions[fallbackAction];
    }
    console.error(`No fallback ('default' or 'submitted') transition found for step "${currentStep.stepName}" in workflow "${workflowId}".`);
    return null;
  }
  return transition;
}

export async function addWorkflow(name: string, description: string): Promise<Workflow> {
  console.log(`[WorkflowService] Attempting to add workflow: ${name}`);
  let workflows = await _readWorkflowsFromFile(); 

  const newWorkflowId = `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newWorkflow: Workflow = {
    id: newWorkflowId,
    name,
    description: description || '',
    steps: JSON.parse(JSON.stringify(DEFAULT_STANDARD_WORKFLOW_STRUCTURE)), 
  };

  workflows.push(newWorkflow);
  await writeWorkflows(workflows);
  console.log(`[WorkflowService] New workflow "${name}" (ID: ${newWorkflowId}) added with default standard steps. Total workflows: ${workflows.length}`);
  return newWorkflow;
}

export async function updateWorkflow(workflowId: string, updatedWorkflowData: Partial<Omit<Workflow, 'id'>>): Promise<Workflow | null> {
  console.log(`[WorkflowService] Attempting to update workflow ID: ${workflowId}`);
  let workflows = await _readWorkflowsFromFile();
  const index = workflows.findIndex(wf => wf.id === workflowId);
  
  if (index === -1) {
    console.error(`[WorkflowService] Workflow with ID ${workflowId} not found for update.`);
    return null;
  }
  
  const updatedSteps = updatedWorkflowData.steps ? updatedWorkflowData.steps : workflows[index].steps;

  const finalUpdatedWorkflow: Workflow = {
    ...workflows[index], 
    ...updatedWorkflowData, 
    steps: updatedSteps, 
    id: workflows[index].id, 
  };

  workflows[index] = finalUpdatedWorkflow;

  await writeWorkflows(workflows);
  console.log(`[WorkflowService] Workflow "${workflows[index].name}" (ID: ${workflowId}) updated.`);
  return workflows[index];
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  console.log(`[WorkflowService] Attempting to delete workflow ID: ${workflowId}`);
  let workflows = await _readWorkflowsFromFile();
  const initialLength = workflows.length;

  if (workflowId === DEFAULT_WORKFLOW_ID && workflows.length === 1 && workflows[0].id === DEFAULT_WORKFLOW_ID) {
      console.warn(`[WorkflowService] Cannot delete the default workflow (ID: ${DEFAULT_WORKFLOW_ID}) as it's the only workflow remaining.`);
      throw new Error('CANNOT_DELETE_LAST_OR_DEFAULT_WORKFLOW');
  }

  workflows = workflows.filter(wf => wf.id !== workflowId);

  if (workflows.length === initialLength && !(workflowId === DEFAULT_WORKFLOW_ID && initialLength > 1)) { 
      console.warn(`[WorkflowService] Workflow with ID ${workflowId} not found for deletion, or no change made.`);
      throw new Error('WORKFLOW_NOT_FOUND_FOR_DELETION');
  } else if (workflows.length < initialLength) {
    console.log(`[WorkflowService] Workflow with ID ${workflowId} deleted. Remaining workflows: ${workflows.length}`);
  }
  
  if (workflows.length === 0) {
    console.log("[WorkflowService] All workflows deleted. Ensuring default workflow is re-added.");
    const defaultWorkflow: Workflow = {
      id: DEFAULT_WORKFLOW_ID,
      name: DEFAULT_WORKFLOW_NAME,
      description: DEFAULT_WORKFLOW_DESCRIPTION,
      steps: JSON.parse(JSON.stringify(DEFAULT_STANDARD_WORKFLOW_STRUCTURE)),
    };
    workflows.push(defaultWorkflow);
  }
  await writeWorkflows(workflows);
}


export async function getAllUniqueStatuses(): Promise<string[]> {
    const workflows = await getAllWorkflows(); 
    const allStatuses = new Set<string>();
    workflows.forEach(wf => {
        if (wf.steps && Array.isArray(wf.steps)) { 
            wf.steps.forEach(step => {
                allStatuses.add(step.status);
            });
        } else {
            console.warn(`[WorkflowService] Workflow "${wf.name}" (ID: ${wf.id}) has no steps or steps is not an array.`);
        }
    });
    return Array.from(allStatuses);
}

    