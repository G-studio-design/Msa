
// src/app/api/delete-file/route.ts
import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { deleteProjectFile as deleteFileRecord, getProjectById } from '@/services/project-service';
import { findUserById } from '@/services/user-service';

const ALLOWED_ROLES_TO_DELETE = ['Owner', 'Admin Proyek', 'Admin Developer'];

export async function POST(request: Request) {
  // Define base directory safely within the handler
  const PROJECT_FILES_BASE_DIR = path.resolve(process.cwd(), 'src', 'database', 'project_files');
  
  try {
    const body = await request.json();
    const { projectId, filePath, userId } = body as { projectId: string; filePath: string; userId: string; };

    if (!projectId || !filePath || !userId) {
      return NextResponse.json({ message: 'Project ID, file path, and user ID are required.' }, { status: 400 });
    }

    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const project = await getProjectById(projectId);
    if (!project) {
        return NextResponse.json({ message: 'Project not found.' }, { status: 404 });
    }

    const fileToDelete = project.files.find(f => f.path === filePath);
    if (!fileToDelete) {
        return NextResponse.json({ message: 'File record not found in project data.' }, { status: 404 });
    }
    
    // Authorization Check: Allow if user is an admin OR if the user's role matches the uploader's role.
    const canDelete = ALLOWED_ROLES_TO_DELETE.includes(user.role) || user.role === fileToDelete.uploadedBy;

    if (!canDelete) {
        return NextResponse.json({ message: 'You are not authorized to delete this file.' }, { status: 403 });
    }

    // Physical file deletion
    const absoluteFilePath = path.join(PROJECT_FILES_BASE_DIR, filePath);
    // Security check: ensure the path is within the base directory
    if (!absoluteFilePath.startsWith(PROJECT_FILES_BASE_DIR)) {
        console.error(`Attempt to access file outside base directory: ${filePath}`);
        return NextResponse.json({ message: 'Invalid file path.' }, { status: 403 });
    }

    try {
        if (fsSync.existsSync(absoluteFilePath)) {
            await fs.unlink(absoluteFilePath);
            console.log(`[API/DeleteFile] Physically deleted file: ${absoluteFilePath}`);
        } else {
            console.warn(`[API/DeleteFile] Physical file not found, skipping unlink: ${absoluteFilePath}`);
        }
    } catch (error: any) {
        console.error(`Error deleting physical file ${absoluteFilePath}:`, error);
        // Do not block DB update if physical file deletion fails (it might be gone already)
    }
    
    // Database record deletion
    await deleteFileRecord(projectId, filePath, user.username);

    return NextResponse.json({ message: 'File deleted successfully.' }, { status: 200 });

  } catch (error: any) {
    console.error('[API/DeleteFile] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during file deletion.';
    return NextResponse.json({ message: `File deletion failed: ${errorMessage}` }, { status: 500 });
  }
}
