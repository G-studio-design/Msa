
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
    division: string | string[] | null; // Can be a single role, array of roles, or null
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

// Master definition of the default standard workflow structure.
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
      nextActionDescription: "Tinjau dan setujui/batalkan penawaran",
      transitions: {
        "approved": {
          targetStatus: "Pending DP Invoice",
          targetAssignedDivision: "Akuntan",
          targetNextActionDescription: "Buat Faktur DP",
          targetProgress: 25,
          notification: {
            division: "Akuntan",
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
        },
        "revise_offer": {
            targetStatus: "Pending Offer",
            targetAssignedDivision: "Admin Proyek",
            targetNextActionDescription: "Revisi dan Unggah Ulang Dokumen Penawaran berdasarkan masukan Owner.",
            targetProgress: 10,
            notification: {
              division: "Admin Proyek",
              message: "Penawaran untuk proyek '{projectName}' perlu direvisi oleh Anda berdasarkan masukan dari {actorUsername}."
            }
        }
      }
    },
    {
      stepName: "DP Invoice Submission",
      status: "Pending DP Invoice",
      assignedDivision: "Akuntan",
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
        "revise_dp": {
          targetStatus: "Pending DP Invoice",
          targetAssignedDivision: "Akuntan",
          targetNextActionDescription: "Revisi dan Unggah Ulang Faktur DP berdasarkan masukan Owner.",
          targetProgress: 25,
          notification: {
            division: "Akuntan",
            message: "Faktur DP untuk proyek '{projectName}' ditolak oleh {actorUsername}. Mohon direvisi."
          }
        },
        "rejected": {
          targetStatus: "Canceled",
          targetAssignedDivision: "",
          targetNextActionDescription: null,
          targetProgress: 30,
          notification: {
            division: "Admin Proyek",
            message: "Proyek '{projectName}' dibatalkan oleh {actorUsername} pada tahap persetujuan faktur DP."
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
          targetNextActionDescription: "Input Jadwal Survei & Unggah Hasil (Opsional)",
          targetProgress: 45,
          notification: {
            division: ["Owner", "Admin Proyek", "Arsitek"], 
            message: "Berkas administrasi untuk proyek '{projectName}' lengkap. Mohon Admin Proyek/Arsitek/Owner untuk menginput jadwal survei."
          }
        }
      }
    },
     {
      stepName: "Survey Details Submission",
      status: "Pending Survey Details",
      assignedDivision: "Admin Proyek",
      progress: 45,
      nextActionDescription: "Input Jadwal Survei & Unggah Hasil (Opsional)",
      transitions: {
        "submitted": { 
          targetStatus: "Pending Architect Files",
          targetAssignedDivision: "Arsitek",
          targetNextActionDescription: "Unggah Berkas Arsitektur",
          targetProgress: 50,
          notification: {
            division: "Arsitek",
            message: "Survey proyek '{projectName}' telah selesai, segera kerjakan dan lengkapi semua berkas proyek."
          }
        },
        "reschedule_survey": {
            targetStatus: "Pending Survey Details",
            targetAssignedDivision: "Admin Proyek",
            targetNextActionDescription: "Input Jadwal Survei & Unggah Hasil (Opsional)",
            targetProgress: 45,
            notification: {
              division: ["Admin Proyek", "Arsitek", "Owner"],
              message: "Survei untuk proyek '{projectName}' telah dijadwalkan ulang oleh {actorUsername}. Alasan: {reasonNote}. Mohon periksa jadwal baru."
            }
        }
      }
    },
    {
      stepName: "Architect Files Submission",
      status: "Pending Architect Files",
      assignedDivision: "Arsitek",
      progress: 50,
      nextActionDescription: "Unggah Berkas Arsitektur (Lengkap)",
      transitions: {
        "submitted": {
          targetStatus: "Pending Structure Files",
          targetAssignedDivision: "Struktur",
          targetNextActionDescription: "Unggah Berkas Struktur",
          targetProgress: 70, 
          notification: {
            division: "Struktur",
            message: "Berkas arsitektur untuk '{projectName}' telah diunggah secara lengkap oleh {actorUsername}. Mohon unggah berkas struktur."
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
          targetAssignedDivision: "MEP",    
          targetNextActionDescription: "Unggah Berkas MEP", 
          targetProgress: 80, 
          notification: {
            division: "MEP", 
            message: "Berkas struktur untuk '{projectName}' oleh {actorUsername} lengkap. Mohon unggah berkas MEP."
          }
        }
      }
    },
    { 
      stepName: "MEP Files Submission",
      status: "Pending MEP Files",
      assignedDivision: "MEP",
      progress: 80, 
      nextActionDescription: "Unggah Berkas MEP",
      transitions: {
        "submitted": {
          targetStatus: "Pending Scheduling",
          targetAssignedDivision: "Admin Proyek",
          targetNextActionDescription: "Jadwalkan Sidang",
          targetProgress: 90, 
          notification: {
            division: "Admin Proyek",
            message: "Berkas MEP untuk '{projectName}' oleh {actorUsername} lengkap. Mohon jadwalkan sidang."
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
          notification: {
            division: "Admin Proyek",
            message: "Proyek '{projectName}' telah berhasil diselesaikan oleh {actorUsername}."
          }
        },
        "revise_after_sidang": {
          targetStatus: "Pending Post-Sidang Revision",
          targetAssignedDivision: "Admin Proyek",
          targetNextActionDescription: "Lakukan revisi pasca-sidang. Notifikasi Arsitek/Struktur jika perlu, lalu selesaikan proyek.",
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
                  division: "Owner",
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

const MSA_WORKFLOW_STEPS: WorkflowStep[] = [
    // Steps from default up to Admin Files Submission
    {
      stepName: "Offer Submission", status: "Pending Offer", assignedDivision: "Admin Proyek", progress: 10, nextActionDescription: "Unggah Dokumen Penawaran",
      transitions: { "submitted": { targetStatus: "Pending Approval", targetAssignedDivision: "Owner", targetNextActionDescription: "Setujui Dokumen Penawaran", targetProgress: 20, notification: { division: "Owner", message: "Penawaran untuk proyek '{projectName}' telah diajukan oleh {actorUsername} dan menunggu persetujuan Anda." } } }
    },
    {
      stepName: "Offer Approval", status: "Pending Approval", assignedDivision: "Owner", progress: 20, nextActionDescription: "Tinjau dan setujui/batalkan penawaran",
      transitions: {
        "approved": { targetStatus: "Pending DP Invoice", targetAssignedDivision: "Akuntan", targetNextActionDescription: "Buat Faktur DP", targetProgress: 25, notification: { division: "Akuntan", message: "Penawaran untuk proyek '{projectName}' telah disetujui oleh {actorUsername}. Mohon buat faktur DP." } },
        "rejected": { targetStatus: "Canceled", targetAssignedDivision: "", targetNextActionDescription: null, targetProgress: 20, notification: { division: "Admin Proyek", message: "Penawaran untuk proyek '{projectName}' telah dibatalkan oleh {actorUsername}." } },
        "revise_offer": { targetStatus: "Pending Offer", targetAssignedDivision: "Admin Proyek", targetNextActionDescription: "Revisi dan Unggah Ulang Dokumen Penawaran berdasarkan masukan Owner.", targetProgress: 10, notification: { division: "Admin Proyek", message: "Penawaran untuk proyek '{projectName}' perlu direvisi oleh Anda berdasarkan masukan dari {actorUsername}." } }
      }
    },
    {
      stepName: "DP Invoice Submission", status: "Pending DP Invoice", assignedDivision: "Akuntan", progress: 25, nextActionDescription: "Unggah Faktur DP",
      transitions: { "submitted": { targetStatus: "Pending Approval", targetAssignedDivision: "Owner", targetNextActionDescription: "Setujui Faktur DP", targetProgress: 30, notification: { division: "Owner", message: "Faktur DP untuk proyek '{projectName}' telah diajukan oleh {actorUsername} dan menunggu persetujuan Anda." } } }
    },
    {
      stepName: "DP Invoice Approval", status: "Pending Approval", assignedDivision: "Owner", progress: 30, nextActionDescription: "Tinjau dan setujui/tolak Faktur DP",
      transitions: {
        "approved": { targetStatus: "Pending Admin Files", targetAssignedDivision: "Admin Proyek", targetNextActionDescription: "Unggah Berkas Administrasi", targetProgress: 40, notification: { division: "Admin Proyek", message: "Faktur DP untuk proyek '{projectName}' telah disetujui oleh {actorUsername}. Mohon unggah berkas administrasi." } },
        "revise_dp": {
          targetStatus: "Pending DP Invoice",
          targetAssignedDivision: "Akuntan",
          targetNextActionDescription: "Revisi dan Unggah Ulang Faktur DP berdasarkan masukan Owner.",
          targetProgress: 25,
          notification: {
            division: "Akuntan",
            message: "Faktur DP untuk proyek '{projectName}' ditolak oleh {actorUsername}. Mohon direvisi."
          }
        },
        "rejected": {
            targetStatus: "Canceled",
            targetAssignedDivision: "",
            targetNextActionDescription: null,
            targetProgress: 30,
            notification: {
              division: "Admin Proyek",
              message: "Proyek '{projectName}' dibatalkan oleh {actorUsername} pada tahap persetujuan faktur DP."
            }
        }
      }
    },
    {
      stepName: "Admin Files Submission", status: "Pending Admin Files", assignedDivision: "Admin Proyek", progress: 40, nextActionDescription: "Unggah Berkas Administrasi",
      transitions: { "submitted": { targetStatus: "Pending Survey Details", targetAssignedDivision: "Admin Proyek", targetNextActionDescription: "Input Jadwal Survei & Unggah Hasil (Opsional)", targetProgress: 45, notification: { division: ["Owner", "Admin Proyek", "Arsitek"], message: "Berkas administrasi untuk proyek '{projectName}' lengkap. Mohon Admin Proyek/Arsitek/Owner untuk menginput jadwal survei." } } }
    },
    {
      stepName: "Survey Details Submission", status: "Pending Survey Details", assignedDivision: "Admin Proyek", progress: 45, nextActionDescription: "Input Jadwal Survei & Unggah Hasil (Opsional)",
      transitions: {
        "submitted": { 
          targetStatus: "Pending Parallel Design Uploads",
          targetAssignedDivision: "Admin Proyek", 
          targetNextActionDescription: "Admin Proyek: Pantau unggahan. Arsitek/Struktur/MEP: Unggah berkas Anda sesuai checklist.",
          targetProgress: 50, 
          notification: {
            division: ["Admin Proyek", "Arsitek", "Struktur", "MEP"], 
            message: "Survey proyek '{projectName}' telah selesai, segera kerjakan dan lengkapi semua berkas proyek."
          }
        },
        "reschedule_survey": {
            targetStatus: "Pending Survey Details",
            targetAssignedDivision: "Admin Proyek",
            targetNextActionDescription: "Input Jadwal Survei & Unggah Hasil (Opsional)",
            targetProgress: 45,
            notification: {
              division: ["Admin Proyek", "Arsitek", "Owner"],
              message: "Survei untuk proyek '{projectName}' telah dijadwalkan ulang oleh {actorUsername}. Alasan: {reasonNote}. Mohon periksa jadwal baru."
            }
        }
      }
    },
    // NEW PARALLEL STEP
    {
      stepName: "Tahap Pembuatan Berkas Proyek", // New Step Name
      status: "Pending Parallel Design Uploads", // Status we defined
      assignedDivision: "Admin Proyek", // Admin Proyek is the main assignee for monitoring
      progress: 50,
      nextActionDescription: "Admin Proyek: Pantau unggahan. Arsitek/Struktur/MEP: Unggah berkas Anda sesuai checklist.",
      transitions: {
        "all_files_confirmed": { // Action by Admin Proyek
          targetStatus: "Pending Scheduling",
          targetAssignedDivision: "Admin Proyek",
          targetNextActionDescription: "Jadwalkan Sidang",
          targetProgress: 90,
          notification: {
            division: "Admin Proyek", // Notify Admin Proyek to schedule
            message: "Semua berkas desain untuk proyek '{projectName}' telah dikonfirmasi terunggah oleh {actorUsername}. Mohon jadwalkan sidang."
          }
        },
        "reschedule_survey_from_parallel": {
          targetStatus: "Pending Survey Details",
          targetAssignedDivision: "Admin Proyek",
          targetNextActionDescription: "Input Jadwal Survei & Unggah Hasil (Opsional)",
          targetProgress: 45,
          notification: {
            division: ["Admin Proyek", "Arsitek", "Owner"],
            message: "Proyek '{projectName}' dikembalikan ke tahap survei oleh {actorUsername} untuk dijadwalkan ulang. Alasan: {reasonNote}"
          }
        }
      }
    },
    // Skip individual design steps: Pending Architect Files, Pending Structure Files, Pending MEP Files
    // Resume with Sidang Scheduling
    {
      stepName: "Sidang Scheduling", status: "Pending Scheduling", assignedDivision: "Admin Proyek", progress: 90, nextActionDescription: "Jadwalkan Sidang",
      transitions: { "scheduled": { targetStatus: "Scheduled", targetAssignedDivision: "Owner", targetNextActionDescription: "Nyatakan Hasil Sidang", targetProgress: 95, notification: { division: "Owner", message: "Sidang untuk proyek '{projectName}' telah dijadwalkan oleh {actorUsername}. Mohon nyatakan hasilnya setelah selesai." } } }
    },
    {
      stepName: "Sidang Outcome Declaration", status: "Scheduled", assignedDivision: "Owner", progress: 95, nextActionDescription: "Nyatakan Hasil Sidang (Sukses/Revisi/Batal)",
      transitions: {
        "completed": { 
          targetStatus: "Pending Final Documents",
          targetAssignedDivision: "Admin Proyek",
          targetNextActionDescription: "Unggah dokumen penyelesaian akhir: Berita Acara, SKRD, dll.",
          targetProgress: 98,
          notification: { 
            division: "Admin Proyek", 
            message: "Sidang proyek '{projectName}' telah dinyatakan sukses oleh {actorUsername}. Mohon unggah dokumen akhir." 
          } 
        },
        "revise_after_sidang": { 
          targetStatus: "Pending Post-Sidang Revision", 
          targetAssignedDivision: "Admin Proyek", 
          targetNextActionDescription: "Lakukan revisi pasca-sidang. Notifikasi Arsitek/Struktur jika perlu, lalu selesaikan proyek.", 
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
      stepName: "Post-Sidang Revision", status: "Pending Post-Sidang Revision", assignedDivision: "Admin Proyek", progress: 85, nextActionDescription: "Lakukan revisi, notifikasi Arsitek/Struktur jika perlu, lalu selesaikan proyek.",
      transitions: {
        "revision_completed_and_finish": { 
          targetStatus: "Pending Final Documents",
          targetAssignedDivision: "Admin Proyek",
          targetNextActionDescription: "Unggah dokumen penyelesaian akhir: Berita Acara, SKRD, dll.",
          targetProgress: 98,
          notification: {
            division: "Admin Proyek",
            message: "Revisi pasca-sidang untuk proyek '{projectName}' telah selesai. Mohon unggah dokumen akhir."
          }
        }
      }
    },
    {
      stepName: "Final Document Upload",
      status: "Pending Final Documents",
      assignedDivision: "Admin Proyek",
      progress: 98,
      nextActionDescription: "Unggah dokumen penyelesaian proyek: Berita Acara, SKRD, Ijin Terbit, Susunan Dokumen Final, Tanda Terima.",
      transitions: {
        "completed": {
          targetStatus: "Completed",
          targetAssignedDivision: "",
          targetNextActionDescription: null,
          targetProgress: 100,
          notification: {
            division: "Owner",
            message: "Proyek '{projectName}' telah selesai dengan semua dokumen akhir terunggah oleh {actorUsername}."
          }
        }
      }
    },
    { stepName: "Project Completed", status: "Completed", assignedDivision: "", progress: 100, nextActionDescription: null, transitions: null },
    { stepName: "Project Canceled", status: "Canceled", assignedDivision: "", progress: 0, nextActionDescription: null, transitions: null }
];


const WORKFLOWS_DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'workflows.json');


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

  const defaultWorkflowIndex = workflows.findIndex(wf => wf.id === DEFAULT_WORKFLOW_ID);

  if (defaultWorkflowIndex === -1) {
    console.log(`[WorkflowService/JSON] Default workflow (ID: ${DEFAULT_WORKFLOW_ID}) not found. Adding it with full structure.`);
    const defaultWorkflow: Workflow = {
      id: DEFAULT_WORKFLOW_ID,
      name: DEFAULT_WORKFLOW_NAME,
      description: DEFAULT_WORKFLOW_DESCRIPTION,
      steps: JSON.parse(JSON.stringify(FULL_DEFAULT_STANDARD_WORKFLOW_STRUCTURE)),
    };
    workflows.unshift(defaultWorkflow);
    saveNeeded = true;
  } else {
     let defaultNeedsUpdate = false;
     if (JSON.stringify(workflows[defaultWorkflowIndex].steps) !== JSON.stringify(FULL_DEFAULT_STANDARD_WORKFLOW_STRUCTURE)) {
         console.log(`[WorkflowService/JSON] Default workflow (ID: ${DEFAULT_WORKFLOW_ID}) steps mismatch. Updating to the latest structure.`);
         workflows[defaultWorkflowIndex].steps = JSON.parse(JSON.stringify(FULL_DEFAULT_STANDARD_WORKFLOW_STRUCTURE));
         defaultNeedsUpdate = true;
     }
     if (workflows[defaultWorkflowIndex].name !== DEFAULT_WORKFLOW_NAME) {
         console.log(`[WorkflowService/JSON] Default workflow (ID: ${DEFAULT_WORKFLOW_ID}) name mismatch. Updating name.`);
         workflows[defaultWorkflowIndex].name = DEFAULT_WORKFLOW_NAME;
         defaultNeedsUpdate = true;
     }
     if (workflows[defaultWorkflowIndex].description !== DEFAULT_WORKFLOW_DESCRIPTION) {
         console.log(`[WorkflowService/JSON] Default workflow (ID: ${DEFAULT_WORKFLOW_ID}) description mismatch. Updating description.`);
         workflows[defaultWorkflowIndex].description = DEFAULT_WORKFLOW_DESCRIPTION;
         defaultNeedsUpdate = true;
     }
     if (defaultNeedsUpdate) {
         saveNeeded = true;
     }
  }

  // Ensure MSa_workflow exists and is structured correctly
  const msaWorkflowId = "msa_workflow";
  const msaWorkflowName = "MSa Workflow"; // Defined name
  const msaWorkflowDescription = "Workflow with parallel design uploads after survey."; // Defined description
  let msaWorkflowIndex = workflows.findIndex(wf => wf.id === msaWorkflowId);

  if (msaWorkflowIndex === -1) {
    console.log(`[WorkflowService/JSON] MSa_workflow (ID: ${msaWorkflowId}) not found. Adding it.`);
    const newMsaWorkflow: Workflow = {
      id: msaWorkflowId,
      name: msaWorkflowName,
      description: msaWorkflowDescription,
      steps: JSON.parse(JSON.stringify(MSA_WORKFLOW_STEPS)),
    };
    workflows.push(newMsaWorkflow);
    saveNeeded = true;
  } else {
    // Check if existing MSa_workflow needs update (name, description, or steps)
    let msaNeedsUpdate = false;
    if (workflows[msaWorkflowIndex].name !== msaWorkflowName) {
        workflows[msaWorkflowIndex].name = msaWorkflowName;
        msaNeedsUpdate = true;
        console.log(`[WorkflowService/JSON] MSa_workflow (ID: ${msaWorkflowId}) name updated.`);
    }
    if (workflows[msaWorkflowIndex].description !== msaWorkflowDescription) {
        workflows[msaWorkflowIndex].description = msaWorkflowDescription;
        msaNeedsUpdate = true;
        console.log(`[WorkflowService/JSON] MSa_workflow (ID: ${msaWorkflowId}) description updated.`);
    }
    if (JSON.stringify(workflows[msaWorkflowIndex].steps) !== JSON.stringify(MSA_WORKFLOW_STEPS)) {
        workflows[msaWorkflowIndex].steps = JSON.parse(JSON.stringify(MSA_WORKFLOW_STEPS));
        msaNeedsUpdate = true;
        console.log(`[WorkflowService/JSON] MSa_workflow (ID: ${msaWorkflowId}) steps updated to new definition.`);
    }
    if (msaNeedsUpdate) {
        saveNeeded = true;
    }
  }


  // Ensure all other custom workflows also have steps (e.g., by assigning default steps if empty)
  workflows = workflows.map(wf => {
    if (wf.id !== DEFAULT_WORKFLOW_ID && wf.id !== msaWorkflowId && (!wf.steps || wf.steps.length === 0)) {
      console.warn(`[WorkflowService/JSON] Custom Workflow "${wf.name}" (ID: ${wf.id}) has no steps. Assigning default steps from FULL_DEFAULT_STANDARD_WORKFLOW_STRUCTURE.`);
      wf.steps = JSON.parse(JSON.stringify(FULL_DEFAULT_STANDARD_WORKFLOW_STRUCTURE));
      saveNeeded = true;
    }
    return wf;
  });


  if (saveNeeded) {
    try {
      await writeWorkflows(workflows);
      console.log("[WorkflowService/JSON] workflows.json persisted after ensuring/updating default and MSa workflows or fixing empty steps.");
    } catch (writeError) {
      console.error("[WorkflowService/JSON] Failed to persist workflows.json:", writeError);
    }
  }
  return workflows;
}

export async function getWorkflowById(id: string): Promise<Workflow | null> {
  const workflows = await getAllWorkflows(); // This ensures workflows are initialized/updated
  console.log(`[WorkflowService/JSON] Searching for workflow ID: "${id}" among ${workflows.length} workflows.`);
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
  
  const step = workflow.steps.find(s => s.status === currentStatus && s.progress === currentProgress);
  if (!step) {
      console.warn(`[WorkflowService/JSON] Step with status "${currentStatus}" and progress ${currentProgress} not found in workflow "${workflowId}". Trying to find by status only as fallback.`);
      const stepsWithStatus = workflow.steps.filter(s => s.status === currentStatus);
      if (stepsWithStatus.length === 1) {
          console.warn(`[WorkflowService/JSON] Fallback: Found unique step by status "${currentStatus}" but progress mismatch (expected ${currentProgress}, found ${stepsWithStatus[0].progress}). This might indicate inconsistent project data or workflow definition.`);
          return stepsWithStatus[0];
      } else if (stepsWithStatus.length > 1) {
          console.error(`[WorkflowService/JSON] Ambiguous step: Multiple steps found with status "${currentStatus}" in workflow "${workflowId}" when progress did not match. Cannot determine current step reliably.`);
          return null;
      }
      console.error(`[WorkflowService/JSON] No step found for status "${currentStatus}" in workflow "${workflowId}" even as a fallback.`);
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
    console.warn(`[WorkflowService/JSON] No transition found for action "${actionTaken}" from step "${currentStep.stepName}" (status: ${currentStatus}, progress: ${currentProgress}) in workflow "${workflowId}".`);
    return null;
  }
  return transition;
}

export async function addWorkflow(name: string, description: string): Promise<Workflow> {
  console.log(`[WorkflowService/JSON] Attempting to add workflow: ${name}`);
  let workflows = await getAllWorkflows(); // Use getAllWorkflows to ensure defaults are handled

  const newWorkflowId = `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  // New custom workflows will also get the FULL_DEFAULT_STANDARD_WORKFLOW_STRUCTURE by default.
  // They can be customized later via updateWorkflow if needed.
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
  let workflows = await getAllWorkflows(); // Use getAllWorkflows to ensure defaults are handled
  const index = workflows.findIndex(wf => wf.id === workflowId);

  if (index === -1) {
    console.error(`[WorkflowService/JSON] Workflow with ID ${workflowId} not found for update.`);
    return null;
  }

  const finalUpdatedWorkflow: Workflow = {
    ...workflows[index],
    ...updatedWorkflowData,
    id: workflows[index].id, // Ensure ID is not changed
  };
  
  // If updating the default workflow, ensure its core properties (name, desc) and structure are not accidentally broken
  // unless explicitly provided in updatedWorkflowData.steps
  if (workflowId === DEFAULT_WORKFLOW_ID) {
    finalUpdatedWorkflow.name = updatedWorkflowData.name || DEFAULT_WORKFLOW_NAME;
    finalUpdatedWorkflow.description = updatedWorkflowData.description || DEFAULT_WORKFLOW_DESCRIPTION;
    // If steps are not part of the update, ensure they are the master default steps
    if (!updatedWorkflowData.steps && JSON.stringify(finalUpdatedWorkflow.steps) !== JSON.stringify(FULL_DEFAULT_STANDARD_WORKFLOW_STRUCTURE)) {
        console.log(`[WorkflowService/JSON] Resetting steps for default workflow ID ${DEFAULT_WORKFLOW_ID} to master definition during update as no new steps were provided.`);
        finalUpdatedWorkflow.steps = JSON.parse(JSON.stringify(FULL_DEFAULT_STANDARD_WORKFLOW_STRUCTURE));
    }
  }
  // If updating MSa_workflow, ensure its core properties and structure are not accidentally broken
  // unless explicitly provided in updatedWorkflowData.steps
  else if (workflowId === "msa_workflow") {
    finalUpdatedWorkflow.name = updatedWorkflowData.name || "MSa Workflow";
    finalUpdatedWorkflow.description = updatedWorkflowData.description || "Workflow with parallel design uploads after survey.";
    if (!updatedWorkflowData.steps && JSON.stringify(finalUpdatedWorkflow.steps) !== JSON.stringify(MSA_WORKFLOW_STEPS)) {
        console.log(`[WorkflowService/JSON] Resetting steps for MSa_workflow ID ${workflowId} to its specific definition during update as no new steps were provided.`);
        finalUpdatedWorkflow.steps = JSON.parse(JSON.stringify(MSA_WORKFLOW_STEPS));
    }
  }


  workflows[index] = finalUpdatedWorkflow;

  await writeWorkflows(workflows);
  console.log(`[WorkflowService/JSON] Workflow "${workflows[index].name}" (ID: ${workflowId}) updated.`);
  return workflows[index];
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  console.log(`[WorkflowService/JSON] Attempting to delete workflow ID: ${workflowId}`);
  let workflows = await getAllWorkflows(); // Use getAllWorkflows to ensure defaults are handled
  const initialLength = workflows.length;

  if (workflowId === DEFAULT_WORKFLOW_ID && workflows.length <= 1) {
      console.warn(`[WorkflowService/JSON] Cannot delete the default workflow (ID: ${DEFAULT_WORKFLOW_ID}) as it's the only one or the MSa_workflow depends on its base structure implicitly.`);
      throw new Error('CANNOT_DELETE_LAST_OR_DEFAULT_WORKFLOW');
  }
  if (workflowId === "msa_workflow" && workflows.length <=1) {
       console.warn(`[WorkflowService/JSON] Cannot delete the MSa_workflow (ID: msa_workflow) if it's the only one besides the default.`);
      throw new Error('CANNOT_DELETE_LAST_OR_DEFAULT_WORKFLOW');
  }


  workflows = workflows.filter(wf => wf.id !== workflowId);

  if (workflows.length === initialLength && workflowId !== DEFAULT_WORKFLOW_ID && workflowId !== "msa_workflow") {
      console.warn(`[WorkflowService/JSON] Workflow with ID ${workflowId} not found for deletion, or it was a protected workflow and no change was made.`);
  } else if (workflows.length < initialLength) {
    console.log(`[WorkflowService/JSON] Workflow with ID ${workflowId} deleted. Remaining workflows: ${workflows.length}`);
  }

  // If the default workflow was somehow deleted and only MSa (or others) remain, re-add default.
  if (!workflows.find(wf => wf.id === DEFAULT_WORKFLOW_ID)) {
     console.log("[WorkflowService/JSON] Default workflow was deleted. Re-initializing it.");
     const defaultWorkflow: Workflow = {
      id: DEFAULT_WORKFLOW_ID,
      name: DEFAULT_WORKFLOW_NAME,
      description: DEFAULT_WORKFLOW_DESCRIPTION,
      steps: JSON.parse(JSON.stringify(FULL_DEFAULT_STANDARD_WORKFLOW_STRUCTURE)),
    };
    workflows.unshift(defaultWorkflow);
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
            console.warn(`[WorkflowService/JSON] Workflow "${wf.name}" (ID: ${wf.id}) has no steps or steps is not an array.`);
        }
    });
    return Array.from(allStatuses);
}
