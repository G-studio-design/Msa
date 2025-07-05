// src/app/api/projects/route.ts
import { NextResponse } from 'next/server';
import { addProject, getAllProjects } from '@/services/project-service';

export async function GET(request: Request) {
  try {
    const projects = await getAllProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('[API/Projects GET All] Error:', error);
    return NextResponse.json({ message: "Failed to fetch projects." }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
    const projectData = await request.json();
    if (!projectData.title || !projectData.workflowId || !projectData.createdBy) {
      return NextResponse.json({ message: 'Missing required project data.' }, { status: 400 });
    }
    const newProject = await addProject(projectData);
    return NextResponse.json(newProject, { status: 201 });
  } catch (error: any) {
    console.error('[API/Projects POST] Error:', error);
    let errorMessage = 'Failed to add project.';
    let statusCode = 500;
    if (error.message === 'WORKFLOW_INVALID') {
        errorMessage = 'Invalid workflow specified for project creation.';
        statusCode = 400;
    }
    return NextResponse.json({ message: errorMessage }, { status: statusCode });
  }
}
