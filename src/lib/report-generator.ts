// src/lib/report-generator.ts
'use server';

import type { Project } from '@/services/project-service';

// Helper to format date, using a consistent format for reports
const formatDateForReport = (timestamp: string, includeTime: boolean = false): string => {
    try {
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric', month: 'long', day: 'numeric',
        };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
            options.timeZoneName = 'short';
        }
        return new Date(timestamp).toLocaleDateString('en-US', options); // Default to en-US for server-side generation consistency
    } catch (e) {
        return "Invalid Date";
    }
};

// Helper to get unique contributors
const getContributorsString = (project: Project): string => {
    if (!project.files || project.files.length === 0) return "N/A";
    const contributors = [...new Set(project.files.map(f => f.uploadedBy))];
    return contributors.length > 0 ? contributors.join(', ') : "N/A";
};

// Helper to create a text-based table row
const createRow = (columns: string[], columnWidths: number[]): string => {
    let row = "|";
    columns.forEach((col, index) => {
        const width = columnWidths[index];
        const paddedCol = ` ${col.padEnd(width - 2, ' ')} `;
        row += paddedCol + "|";
    });
    return row + "\n";
};

// Helper to create a separator line for the text table
const createSeparator = (columnWidths: number[]): string => {
    let sep = "+";
    columnWidths.forEach(width => {
        sep += "-".repeat(width) + "+";
    });
    return sep + "\n";
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
  let csvContent = "Project Title,Status,Last Activity / End Date,Contributors,Progress (%),Created At,Created By\n";

  const addProjectToCsv = (project: Project, statusOverride?: string) => {
    const title = `"${project.title.replace(/"/g, '""')}"`; // Escape double quotes
    const status = statusOverride || project.status;
    const lastActivityDate = formatDateForReport(project.workflowHistory[project.workflowHistory.length-1]?.timestamp || project.createdAt);
    const contributors = `"${getContributorsString(project).replace(/"/g, '""')}"`;
    const progress = project.progress;
    const createdAt = formatDateForReport(project.createdAt);
    const createdBy = project.createdBy;

    csvContent += `${title},${status},${lastActivityDate},${contributors},${progress},${createdAt},"${createdBy}"\n`;
  };

  csvContent += "# Completed Projects\n";
  completedProjects.forEach(p => addProjectToCsv(p));

  csvContent += "\n# Canceled Projects\n";
  canceledProjects.forEach(p => addProjectToCsv(p));

  csvContent += "\n# In Progress Projects (During This Month)\n";
  inProgressProjects.forEach(p => {
      // For "In Progress" in the report, we want to show their current status if it's not "Completed" or "Canceled"
      // or explicitly mark them as "In Progress for Report" if their final status is "Completed"/"Canceled" but occurred *after* the report month.
      let displayStatus = p.status;
      if (p.status === 'Completed' || p.status === 'Canceled') {
          displayStatus = 'In Progress (Finalized After Report Period)';
      }
      addProjectToCsv(p, displayStatus);
  });


  console.log(`CSV data generation complete.`);
  return csvContent;
}

/**
 * Generates a PDF report (plain text format) from the provided project data, with improved design.
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
  console.log(`Generating plain text data for PDF report with enhanced design.`);
  const reportGeneratedDate = formatDateForReport(new Date().toISOString(), true);
  const totalReviewed = completedProjects.length + canceledProjects.length + inProgressProjects.length;

  let textContent = `
==================================================================================================
                                  MONTHLY PROJECT STATUS REPORT
==================================================================================================

Report Period : ${monthName} ${year}
Generated On  : ${reportGeneratedDate}

--------------------------------------------------------------------------------------------------
                                      EXECUTIVE SUMMARY
--------------------------------------------------------------------------------------------------
Total Projects Reviewed This Period : ${totalReviewed}
  - Projects Completed This Month   : ${completedProjects.length}
  - Projects Canceled This Month    : ${canceledProjects.length}
  - Projects In Progress During Month: ${inProgressProjects.length}
--------------------------------------------------------------------------------------------------

`;

  const columnTitles = ["Project Title", "Status", "Last Activity / End Date", "Contributors", "Progress", "Created By"];
  // Dynamic column widths based on content, with minimums
  const getColumnWidths = (projects: Project[], statusOverride?: string): number[] => {
      const titles = projects.map(p => p.title);
      const statuses = projects.map(p => statusOverride || p.status);
      const dates = projects.map(p => formatDateForReport(p.workflowHistory[p.workflowHistory.length-1]?.timestamp || p.createdAt));
      const contributors = projects.map(p => getContributorsString(p));
      const progresses = projects.map(p => `${p.progress}%`);
      const creators = projects.map(p => p.createdBy);

      return [
          Math.max(columnTitles[0].length, ...titles.map(t => t.length), 20) + 2, // Title
          Math.max(columnTitles[1].length, ...statuses.map(s => s.length), 15) + 2, // Status
          Math.max(columnTitles[2].length, ...dates.map(d => d.length), 25) + 2, // Date
          Math.max(columnTitles[3].length, ...contributors.map(c => c.length), 20) + 2, // Contributors
          Math.max(columnTitles[4].length, ...progresses.map(pr => pr.length), 10) + 2, // Progress
          Math.max(columnTitles[5].length, ...creators.map(cr => cr.length), 15) + 2, // Created By
      ];
  };
  
  const createSection = (title: string, projects: Project[], statusOverride?: string) => {
    textContent += `\n\n${"=".repeat(98)}\n`;
    textContent += `${title.toUpperCase().padStart(Math.floor((98 + title.length) / 2)).padEnd(98)}\n`;
    textContent += `${"=".repeat(98)}\n\n`;

    if (projects.length === 0) {
        textContent += `  (No projects in this category for the selected period)\n`;
        textContent += `-${"-".repeat(96)}-\n`;
        return;
    }
    
    const columnWidths = getColumnWidths(projects, statusOverride);
    const tableSeparator = createSeparator(columnWidths);

    textContent += tableSeparator;
    textContent += createRow(columnTitles, columnWidths);
    textContent += tableSeparator;

    projects.forEach(p => {
        const lastActivityDate = formatDateForReport(p.workflowHistory[p.workflowHistory.length-1]?.timestamp || p.createdAt);
        const projectStatus = statusOverride || p.status;
        
        let displayStatus = projectStatus;
        if (statusOverride === 'In Progress (During Report Period)' && (p.status === 'Completed' || p.status === 'Canceled')) {
             // If it's in the "inProgressProjects" list for the report, but its actual final status is Completed/Canceled,
             // this means it was finalized *after* the report month.
             // We should clarify this in the report.
            displayStatus = `${p.status} (Finalized After Report Period)`;
        }


        textContent += createRow([
            p.title,
            displayStatus,
            lastActivityDate,
            getContributorsString(p),
            `${p.progress}%`,
            p.createdBy
        ], columnWidths);
    });
    textContent += tableSeparator;
  };
  
  createSection("Projects Completed This Month", completedProjects);
  createSection("Projects Canceled This Month", canceledProjects);
  createSection("Projects In Progress During This Month", inProgressProjects, "In Progress (During Report Period)");


  textContent += `
\n\n==================================================================================================
                                          END OF REPORT
==================================================================================================
`;

  console.log(`Plain text data generation for PDF complete with enhanced design.`);
  return textContent;
}
