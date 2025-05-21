
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

// Define the default standard workflow structure here
// This structure will be used if workflows.json is empty or if the default workflow is missing/needs update.
const FULL_DEFAULT_STANDARD_WORKFLOW_STRUCTURE: WorkflowStep[] = [
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
            message: "Penawaran untuk proyek '{projectName}' telah diajukan oleh {actorUsername} dan menunggu persetujuan Anda."
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
          targetAssignedDivision: "General Admin", // Internal role for Admin/Akuntan
          targetNextActionDescription: "Buat Faktur DP",
          targetProgress: 25,
          notification: {
            division: "General Admin", // Internal role for Admin/Akuntan
            message: "Penawaran untuk proyek '{projectName}' telah disetujui oleh {actorUsername}. Mohon buat faktur DP."
          }
        },
        "rejected": {
          targetStatus: "Canceled",
          targetAssignedDivision: "",
          targetNextActionDescription: null,
          targetProgress: 20, 
          notification: {
            division: "Admin Proyek",
            message: "Penawaran untuk proyek '{projectName}' telah dibatalkan oleh {actorUsername}."
          }
        }
      }
    },
    {
      stepName: "DP Invoice Submission",
      status: "Pending DP Invoice",
      assignedDivision: "General Admin", // Internal role for Admin/Akuntan
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
            message: "Faktur DP untuk proyek '{projectName}' telah diajukan oleh {actorUsername} dan menunggu persetujuan Anda."
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
            message: "Faktur DP untuk proyek '{projectName}' telah disetujui oleh {actorUsername}. Mohon unggah berkas administrasi."
          }
        },
        "rejected": { 
          targetStatus: "Pending DP Invoice",
          targetAssignedDivision: "General Admin", // Internal role for Admin/Akuntan
          targetNextActionDescription: "Revisi dan Unggah Ulang Faktur DP",
          targetProgress: 25, 
          notification: {
            division: "General Admin", // Internal role for Admin/Akuntan
            message: "Faktur DP untuk proyek '{projectName}' ditolak oleh {actorUsername}. Mohon direvisi."
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
          targetStatus: "Pending Survey Details",
          targetAssignedDivision: "Admin Proyek",
          targetNextActionDescription: "Input Jadwal Survei & Unggah Hasil",
          targetProgress: 45,
          notification: {
            division: "Admin Proyek",
            message: "Berkas administrasi untuk '{projectName}' oleh {actorUsername} lengkap. Mohon jadwalkan survei dan unggah hasilnya."
          }
        }
      }
    },
    { 
      stepName: "Survey Details Submission",
      status: "Pending Survey Details",
      assignedDivision: "Admin Proyek",
      progress: 45,
      nextActionDescription: "Input Jadwal Survei & Unggah Laporan Hasil Survei",
      transitions: {
        "submitted": { 
          targetStatus: "Pending Architect Files",
          targetAssignedDivision: "Arsitek",
          targetNextActionDescription: "Unggah Berkas Arsitektur",
          targetProgress: 50,
          notification: {
            division: "Arsitek",
            message: "Hasil survei untuk '{projectName}' telah diunggah oleh {actorUsername}. Mohon unggah berkas arsitektur."
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
        "submitted": { // This is for the formal completion of the architect's stage
          targetStatus: "Pending Structure Files",
          targetAssignedDivision: "Struktur",
          targetNextActionDescription: "Unggah Berkas Struktur",
          targetProgress: 70,
          notification: {
            division: "Struktur",
            message: "Berkas arsitektur untuk '{projectName}' telah diunggah secara lengkap oleh {actorUsername}. Mohon unggah berkas struktur."
          }
        }
        // The action "architect_uploaded_initial_images_for_struktur" is handled within project-service
        // and does not cause a formal status transition here.
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
          targetStatus: "Pending Scheduling", 
          targetAssignedDivision: "Admin Proyek", 
          targetNextActionDescription: "Jadwalkan Sidang", 
          targetProgress: 90,
          notification: {
            division: "Admin Proyek",
            message: "Berkas struktur untuk '{projectName}' telah diunggah oleh {actorUsername}. Mohon jadwalkan sidang." 
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
            message: "Sidang untuk proyek '{projectName}' telah dijadwalkan oleh {actorUsername}. Mohon nyatakan hasilnya setelah selesai."
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
          notification: { // Notify Admin Proyek that project is completed by Owner
            division: "Admin Proyek",
            message: "Proyek '{projectName}' telah berhasil diselesaikan oleh {actorUsername}."
          }
        },
        "revise_after_sidang": { 
          targetStatus: "Pending Post-Sidang Revision", 
          targetAssignedDivision: "Admin Proyek",
          targetNextActionDescription: "Lakukan revisi pasca-sidang. Notifikasi Arsitek/Struktur jika perlu, lalu konfirmasi penyelesaian.",
          targetProgress: 85, 
          notification: {
            division: "Admin Proyek",
            message: "Proyek '{projectName}' memerlukan revisi setelah sidang yang dinyatakan oleh {actorUsername}."
          }
        },
        "canceled_after_sidang": {
          targetStatus: "Canceled",
          targetAssignedDivision: "",
          targetNextActionDescription: null,
          targetProgress: 95, 
          notification: {
            division: "Admin Proyek",
            message: "Proyek '{projectName}' telah dibatalkan oleh {actorUsername} setelah sidang."
          }
        }
      }
    },
    {
      stepName: "Post-Sidang Revision",
      status: "Pending Post-Sidang Revision",
      assignedDivision: "Admin Proyek",
      progress: 85,
      nextActionDescription: "Lakukan revisi, notifikasi Arsitek/Struktur jika perlu, lalu selesaikan proyek.",
      transitions: {
          "revision_completed_and_finish": {
              targetStatus: "Completed",
              targetAssignedDivision: "",
              targetNextActionDescription: null,
              targetProgress: 100,
              notification: { 
                  division: "Owner", // Notify Owner that project is completed after revision
                  message: "Proyek '{projectName}' telah berhasil diselesaikan setelah revisi oleh {actorUsername}."
              }
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
      console.log("[WorkflowService/JSON] workflows.json is empty. Returning empty array for initialization.");
      return [];
    }
    try {
        const workflows = JSON.parse(data) as Workflow[];
        return workflows;
    } catch (parseError) {
        console.error("[WorkflowService/JSON] Error parsing workflows.json, returning empty array. File might be corrupted.", parseError);
        return []; 
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log("[WorkflowService/JSON] workflows.json not found. Returning empty array for initialization.");
      return []; 
    }
    console.error("[WorkflowService/JSON] Error reading workflows.json. Returning empty array.", error);
    return []; 
  }
}

async function writeWorkflows(workflows: Workflow[]): Promise<void> {
  try {
    await fs.writeFile(WORKFLOWS_DB_PATH, JSON.stringify(workflows, null, 2), 'utf8');
    console.log(`[WorkflowService/JSON] Workflows data successfully written. Total: ${workflows.length}`);
  } catch (error) {
    console.error("[WorkflowService/JSON] Error writing workflows database:", error);
    throw new Error('Failed to save workflow data.');
  }
}

export async function getAllWorkflows(): Promise<Workflow[]> {
  let workflows = await _readWorkflowsFromFile();
  let saveNeeded = false;

  const defaultWorkflowExists = workflows.some(wf => wf.id === DEFAULT_WORKFLOW_ID);

  if (!defaultWorkflowExists) {
    console.log(`[WorkflowService/JSON] Default workflow (ID: ${DEFAULT_WORKFLOW_ID}) not found. Adding it with full structure.`);
    const defaultWorkflow: Workflow = {
      id: DEFAULT_WORKFLOW_ID,
      name: DEFAULT_WORKFLOW_NAME,
      description: DEFAULT_WORKFLOW_DESCRIPTION,
      steps: JSON.parse(JSON.stringify(FULL_DEFAULT_STANDARD_WORKFLOW_STRUCTURE)), 
    };
    workflows.unshift(defaultWorkflow); // Add to the beginning
    saveNeeded = true;
  } else {
     // Ensure the existing default workflow has the latest structure, name, and description
     const existingDefaultIndex = workflows.findIndex(wf => wf.id === DEFAULT_WORKFLOW_ID);
     if (existingDefaultIndex !== -1) {
         let defaultNeedsUpdate = false;
         if (JSON.stringify(workflows[existingDefaultIndex].steps) !== JSON.stringify(FULL_DEFAULT_STANDARD_WORKFLOW_STRUCTURE)) {
             console.log(`[WorkflowService/JSON] Default workflow (ID: ${DEFAULT_WORKFLOW_ID}) steps mismatch. Updating to the latest structure.`);
             workflows[existingDefaultIndex].steps = JSON.parse(JSON.stringify(FULL_DEFAULT_STANDARD_WORKFLOW_STRUCTURE));
             defaultNeedsUpdate = true;
         }
         if (workflows[existingDefaultIndex].name !== DEFAULT_WORKFLOW_NAME) {
             console.log(`[WorkflowService/JSON] Default workflow (ID: ${DEFAULT_WORKFLOW_ID}) name mismatch. Updating name.`);
             workflows[existingDefaultIndex].name = DEFAULT_WORKFLOW_NAME;
             defaultNeedsUpdate = true;
         }
         if (workflows[existingDefaultIndex].description !== DEFAULT_WORKFLOW_DESCRIPTION) {
             console.log(`[WorkflowService/JSON] Default workflow (ID: ${DEFAULT_WORKFLOW_ID}) description mismatch. Updating description.`);
             workflows[existingDefaultIndex].description = DEFAULT_WORKFLOW_DESCRIPTION;
             defaultNeedsUpdate = true;
         }
         if (defaultNeedsUpdate) {
             saveNeeded = true;
         }
     }
  }
  
  // Ensure all workflows have steps, if not, assign default steps (could be from custom logic too)
  workflows = workflows.map(wf => {
    if (!wf.steps || wf.steps.length === 0) {
      console.warn(`[WorkflowService/JSON] Workflow "${wf.name}" (ID: ${wf.id}) has no steps. Assigning default steps from FULL_DEFAULT_STANDARD_WORKFLOW_STRUCTURE.`);
      wf.steps = JSON.parse(JSON.stringify(FULL_DEFAULT_STANDARD_WORKFLOW_STRUCTURE)); // Use the full default
      saveNeeded = true;
    }
    return wf;
  });

  if (saveNeeded) {
    try {
      await writeWorkflows(workflows);
      console.log("[WorkflowService/JSON] workflows.json persisted after ensuring/updating default workflow or fixing empty steps.");
    } catch (writeError) {
      console.error("[WorkflowService/JSON] Failed to persist workflows.json after ensuring/updating default workflow:", writeError);
    }
  }
  return workflows;
}

export async function getWorkflowById(id: string): Promise<Workflow | null> {
  const workflows = await getAllWorkflows(); 
  const workflow = workflows.find(wf => wf.id === id) || null;
  if (!workflow) {
    console.warn(`[WorkflowService/JSON] getWorkflowById: Workflow with ID "${id}" not found.`);
  }
  return workflow;
}

export async function getFirstStep(workflowId: string): Promise<WorkflowStep | null> {
  const workflow = await getWorkflowById(workflowId);
  if (workflow && workflow.steps && workflow.steps.length > 0) {
    return workflow.steps[0];
  }
  console.warn(`[WorkflowService/JSON] Workflow with ID "${workflowId}" not found or has no steps when trying to get first step.`);
  return null;
}

export async function getCurrentStepDetails(
  workflowId: string,
  currentStatus: string,
  currentProgress: number 
): Promise<WorkflowStep | null> {
  const workflow = await getWorkflowById(workflowId);
  if (!workflow) {
    console.warn(`[WorkflowService/JSON] Workflow with ID ${workflowId} not found when trying to get current step details.`);
    return null;
  }
  // Find step by status AND progress for more accuracy, especially if a status name is reused
  const step = workflow.steps.find(s => s.status === currentStatus && s.progress === currentProgress);
  if (!step) {
      console.warn(`[WorkflowService/JSON] Step with status "${currentStatus}" and progress ${currentProgress} not found in workflow "${workflowId}".`);
      // Fallback: try to find by status only if progress doesn't match, but log a warning
      const stepByStatusOnly = workflow.steps.find(s => s.status === currentStatus);
      if (stepByStatusOnly) {
        console.warn(`[WorkflowService/JSON] Fallback: Found step by status "${currentStatus}" only, but progress mismatch (expected ${currentProgress}, found ${stepByStatusOnly.progress}). This might indicate inconsistent project data or workflow definition.`);
        return stepByStatusOnly;
      }
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
    console.error(`[WorkflowService/JSON] Workflow with ID ${workflowId} not found for transition.`);
    return null;
  }

  const currentStep = workflow.steps.find(step => step.status === currentStatus && step.progress === currentProgress);

  if (!currentStep) {
    console.error(`[WorkflowService/JSON] Current step for status "${currentStatus}" and progress ${currentProgress} not found in workflow "${workflowId}" for transition.`);
    return null;
  }

  if (!currentStep.transitions) {
    console.log(`[WorkflowService/JSON] Step "${currentStep.stepName}" in workflow "${workflowId}" is a terminal step (no transitions defined).`);
    return null; 
  }

  const transition = currentStep.transitions[actionTaken];
  if (!transition) {
    console.warn(`[WorkflowService/JSON] No transition found for action "${actionTaken}" from step "${currentStep.stepName}" (status: ${currentStatus}, progress: ${currentProgress}) in workflow "${workflowId}". Trying 'default' or 'submitted' as fallback.`);
    // Fallback to 'default' or 'submitted' if a specific action transition isn't found
    const fallbackAction = currentStep.transitions['default'] ? 'default' : (currentStep.transitions['submitted'] ? 'submitted' : null);
    if (fallbackAction) {
      console.log(`[WorkflowService/JSON] Using fallback transition for action: "${fallbackAction}"`);
      return currentStep.transitions[fallbackAction];
    }
    console.error(`[WorkflowService/JSON] No fallback ('default' or 'submitted') transition found for step "${currentStep.stepName}" in workflow "${workflowId}".`);
    return null;
  }
  return transition;
}

export async function addWorkflow(name: string, description: string): Promise<Workflow> {
  console.log(`[WorkflowService/JSON] Attempting to add workflow: ${name}`);
  let workflows = await _readWorkflowsFromFile(); 

  const newWorkflowId = `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newWorkflow: Workflow = {
    id: newWorkflowId,
    name,
    description: description || '',
    steps: JSON.parse(JSON.stringify(FULL_DEFAULT_STANDARD_WORKFLOW_STRUCTURE)), 
  };

  workflows.push(newWorkflow);
  await writeWorkflows(workflows);
  console.log(`[WorkflowService/JSON] New workflow "${name}" (ID: ${newWorkflowId}) added with default standard steps. Total workflows: ${workflows.length}`);
  return newWorkflow;
}

export async function updateWorkflow(workflowId: string, updatedWorkflowData: Partial<Omit<Workflow, 'id'>>): Promise<Workflow | null> {
  console.log(`[WorkflowService/JSON] Attempting to update workflow ID: ${workflowId}`);
  let workflows = await _readWorkflowsFromFile();
  const index = workflows.findIndex(wf => wf.id === workflowId);
  
  if (index === -1) {
    console.error(`[WorkflowService/JSON] Workflow with ID ${workflowId} not found for update.`);
    return null;
  }
  
  // Ensure steps are preserved or updated, not accidentally removed if not in updatedWorkflowData
  const updatedSteps = updatedWorkflowData.steps ? updatedWorkflowData.steps : workflows[index].steps;

  // Construct the final updated workflow, ensuring the ID is preserved
  const finalUpdatedWorkflow: Workflow = {
    ...workflows[index], // Start with existing workflow data
    ...updatedWorkflowData, // Override with new data
    steps: updatedSteps, // Ensure steps are correctly applied
    id: workflows[index].id, // Explicitly keep the original ID
  };

  workflows[index] = finalUpdatedWorkflow;

  await writeWorkflows(workflows);
  console.log(`[WorkflowService/JSON] Workflow "${workflows[index].name}" (ID: ${workflowId}) updated.`);
  return workflows[index];
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  console.log(`[WorkflowService/JSON] Attempting to delete workflow ID: ${workflowId}`);
  let workflows = await _readWorkflowsFromFile();
  const initialLength = workflows.length;

  // Prevent deletion of the default workflow if it's the only one left
  if (workflowId === DEFAULT_WORKFLOW_ID && workflows.length === 1 && workflows[0].id === DEFAULT_WORKFLOW_ID) {
      console.warn(`[WorkflowService/JSON] Cannot delete the default workflow (ID: ${DEFAULT_WORKFLOW_ID}) as it's the only workflow remaining.`);
      throw new Error('CANNOT_DELETE_LAST_OR_DEFAULT_WORKFLOW');
  }

  workflows = workflows.filter(wf => wf.id !== workflowId);

  if (workflows.length === initialLength && !(workflowId === DEFAULT_WORKFLOW_ID && initialLength > 1)) { 
      // This condition might be a bit complex. If no workflow was actually deleted
      // (e.g., ID not found, or it was the default and not the only one, which is allowed),
      // we just log a warning.
      console.warn(`[WorkflowService/JSON] Workflow with ID ${workflowId} not found for deletion, or no change made that would affect default workflow logic.`);
  } else if (workflows.length < initialLength) {
    console.log(`[WorkflowService/JSON] Workflow with ID ${workflowId} deleted. Remaining workflows: ${workflows.length}`);
  }
  
  // If all workflows are deleted (including the default one if it was allowed), ensure default is re-added
  if (workflows.length === 0) {
    console.log("[WorkflowService/JSON] All workflows deleted. Ensuring default workflow is re-added.");
    const defaultWorkflow: Workflow = {
      id: DEFAULT_WORKFLOW_ID,
      name: DEFAULT_WORKFLOW_NAME,
      description: DEFAULT_WORKFLOW_DESCRIPTION,
      steps: JSON.parse(JSON.stringify(FULL_DEFAULT_STANDARD_WORKFLOW_STRUCTURE)),
    };
    workflows.push(defaultWorkflow);
  }
  await writeWorkflows(workflows);
}


// Function to get all unique statuses from all workflows
export async function getAllUniqueStatuses(): Promise<string[]> {
    const workflows = await getAllWorkflows(); // Ensures default workflow is present
    const allStatuses = new Set<string>();
    workflows.forEach(wf => {
        if (wf.steps && Array.isArray(wf.steps)) { // Add defensive check
            wf.steps.forEach(step => {
                allStatuses.add(step.status);
            });
        } else {
            console.warn(`[WorkflowService/JSON] Workflow "${wf.name}" (ID: ${wf.id}) has no steps or steps is not an array.`);
        }
    });
    return Array.from(allStatuses);
}
