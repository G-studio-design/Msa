// src/lib/report-generator.ts
'use server';

import type { Project } from '@/services/project-service';

// Helper to format date, assuming language context isn't easily available here
// For a real app, you might pass language or use a shared utility
const formatDateForReport = (timestamp: string): string => {
    try {
        return new Date(timestamp).toLocaleDateString('en-US', { // Default to en-US for server-side generation consistency
            year: 'numeric', month: 'long', day: 'numeric', // Use long month for PDF
        });
    } catch (e) {
        return "Invalid Date";
    }
};

// Helper to get unique contributors
const getContributorsString = (project: Project): string => {
    if (!project.files || project.files.length === 0) return "N/A";
    return [...new Set(project.files.map(f => f.uploadedBy))].join(', ') || "N/A";
};


/**
 * Generates an Excel report (CSV format) from the provided project data.
 *
 * @param completedProjects Array of completed projects.
 * @param canceledProjects Array of canceled projects.
 * @param inProgressProjects Array of in-progress projects.
 * @returns A promise that resolves to a string containing the CSV data.
 */
export async function generateExcelReport(
  completedProjects: Project[],
  canceledProjects: Project[],
  inProgressProjects: Project[]
): Promise<string> {
  console.log(`Generating CSV data for Excel report.`);
  let csvContent = "Project Title,Status,Last Activity / End Date,Contributors\n";

  const addProjectToCsv = (project: Project, statusOverride?: string) => {
    const title = `"${project.title.replace(/"/g, '""')}"`; // Escape double quotes
    const status = statusOverride || project.status;
    const lastActivityDate = formatDateForReport(project.workflowHistory[project.workflowHistory.length-1]?.timestamp || project.createdAt);
    const contributors = `"${getContributorsString(project).replace(/"/g, '""')}"`;
    csvContent += `${title},${status},${lastActivityDate},${contributors}\n`;
  };

  csvContent += "# Completed Projects\n";
  completedProjects.forEach(p => addProjectToCsv(p));

  csvContent += "\n# Canceled Projects\n";
  canceledProjects.forEach(p => addProjectToCsv(p));

  csvContent += "\n# In Progress Projects\n";
  inProgressProjects.forEach(p => addProjectToCsv(p, "In Progress"));


  console.log(`CSV data generation complete.`);
  return csvContent;
}

/**
 * Generates a PDF report (plain text format) from the provided project data.
 *
 * @param completedProjects Array of completed projects.
 * @param canceledProjects Array of canceled projects.
 * @param inProgressProjects Array of in-progress projects.
 * @param monthName The name of the month for the report.
 * @param year The year of the report.
 * @returns A promise that resolves to a string containing the plain text report data.
 */
export async function generatePdfReport(
  completedProjects: Project[],
  canceledProjects: Project[],
  inProgressProjects: Project[],
  monthName: string,
  year: string
): Promise<string> {
  console.log(`Generating plain text data for PDF report.`);
  const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const totalReviewed = completedProjects.length + canceledProjects.length + inProgressProjects.length;

  let textContent = `
*******************************************************************************
                      MONTHLY PROJECT STATUS REPORT
*******************************************************************************

Report Period: ${monthName} ${year}
Generated On: ${reportDate}

-------------------------------------------------------------------------------
                                EXECUTIVE SUMMARY
-------------------------------------------------------------------------------
Total Projects Reviewed: ${totalReviewed}
  - Projects Completed This Month: ${completedProjects.length}
  - Projects Canceled This Month:  ${canceledProjects.length}
  - Projects In Progress During Month: ${inProgressProjects.length}
-------------------------------------------------------------------------------

`;

  const addProjectToText = (project: Project, statusOverride?: string) => {
    const lastActivityEntry = project.workflowHistory[project.workflowHistory.length - 1];
    const lastActivityDate = lastActivityEntry ? formatDateForReport(lastActivityEntry.timestamp) : formatDateForReport(project.createdAt);
    const projectStatus = statusOverride || project.status;

    textContent += `  Project Title:      ${project.title}\n`;
    textContent += `    Status:             ${projectStatus}\n`;
    if (projectStatus === 'Completed' || projectStatus === 'Canceled') {
        textContent += `    End Date:           ${lastActivityDate}\n`;
    } else {
        textContent += `    Last Activity Date: ${lastActivityDate}\n`;
    }
    textContent += `    Contributors:       ${getContributorsString(project)}\n`;
    textContent += `    Progress:           ${project.progress}%\n`;
    textContent += `    Created On:         ${formatDateForReport(project.createdAt)} by ${project.createdBy}\n`;
    textContent += `  ---------------------------------------------------------------------------\n`;
  };

  if (completedProjects.length > 0) {
    textContent += `
===============================================================================
                         PROJECTS COMPLETED THIS MONTH
===============================================================================\n\n`;
    completedProjects.forEach(p => addProjectToText(p));
  } else {
    textContent += `
===============================================================================
                         PROJECTS COMPLETED THIS MONTH
===============================================================================
  (No projects were completed this month)
-------------------------------------------------------------------------------\n\n`;
  }


  if (canceledProjects.length > 0) {
    textContent += `
===============================================================================
                          PROJECTS CANCELED THIS MONTH
===============================================================================\n\n`;
    canceledProjects.forEach(p => addProjectToText(p));
  } else {
     textContent += `
===============================================================================
                          PROJECTS CANCELED THIS MONTH
===============================================================================
  (No projects were canceled this month)
-------------------------------------------------------------------------------\n\n`;
  }

  if (inProgressProjects.length > 0) {
    textContent += `
===============================================================================
                    PROJECTS IN PROGRESS DURING THIS MONTH
===============================================================================\n\n`;
    inProgressProjects.forEach(p => addProjectToText(p, "In Progress"));
  } else {
    textContent += `
===============================================================================
                    PROJECTS IN PROGRESS DURING THIS MONTH
===============================================================================
  (No projects were in progress during this month)
-------------------------------------------------------------------------------\n\n`;
  }

  textContent += `
*******************************************************************************
                                END OF REPORT
*******************************************************************************
`;

  console.log(`Plain text data generation for PDF complete.`);
  return textContent.trim(); // Trim leading/trailing whitespace
}

