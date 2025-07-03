// src/app/api/upload-file/route.ts
import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ensureProjectFilesBaseDirExists } from '@/services/project-service'; 
import { sanitizeForPath } from '@/lib/path-utils'; 
import { PROJECT_FILES_BASE_DIR } from '@/config/file-constants';
import { getAllUsers } from '@/services/data-access/user-data';

// Define the allowed roles for file upload
const ALLOWED_ROLES = ['Owner', 'Admin Proyek', 'Arsitek', 'Struktur', 'MEP', 'Admin Developer', 'Akuntan'];

export async function POST(request: Request) {
  try {
    console.log('[API Upload] Received new file upload request.');
    const formData = await request.formData();
    console.log('[API Upload] FormData parsed successfully.');

    await ensureProjectFilesBaseDirExists(); // Make sure the base directory exists

    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const projectTitle = formData.get('projectTitle') as string | null;
    const userId = formData.get('userId') as string | null;
    console.log(`[API Upload] Extracted form fields: projectId=${projectId}, projectTitle=${projectTitle}, userId=${userId}, file=${file?.name}`);

    if (!file || !projectId || !projectTitle || !userId) {
      console.error('[API Upload] Missing required fields:', { projectId, projectTitle, userId, file: !!file });
      return NextResponse.json({ message: 'Project ID, title, and User ID are required.' }, { status: 400 });
    }
    
    console.log('[API Upload] All required fields are present. Proceeding with role check.');

    // --- Role Check ---
    const users = await getAllUsers();
    console.log(`[API Upload] users.json read successfully. Searching for user ID: ${userId}`);
    const user = users.find((u: any) => u.id === userId);

    if (!user) {
      console.error('[API Upload] User not found for ID:', userId);
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }
    console.log(`[API Upload] User found: ${user.username}, Role: ${user.role}`);


    if (!ALLOWED_ROLES.includes(user.role)) {
      console.warn('[API Upload] User role not authorized:', user.role, 'for user ID:', userId);
      return NextResponse.json({ message: 'User role is not authorized to upload files.' }, { status: 403 }); // Forbidden
    }
    
    console.log(`[API Upload] User role '${user.role}' is authorized. Proceeding with file save.`);
    // --- End Role Check ---

    const projectTitleSanitized = sanitizeForPath(projectTitle);
    const projectSpecificDirRelative = `${projectId}-${projectTitleSanitized}`;
    const projectSpecificDirAbsolute = path.join(PROJECT_FILES_BASE_DIR, projectSpecificDirRelative);

    // Ensure the project-specific directory exists
    try {
      await fs.mkdir(projectSpecificDirAbsolute, { recursive: true });
    } catch (mkdirError) {
      console.error(`Error creating directory ${projectSpecificDirAbsolute}:`, mkdirError);
      return NextResponse.json({ message: 'Failed to create project directory on server.' }, { status: 500 });
    }
    
    console.log(`[API Upload] Project directory ensured: ${projectSpecificDirAbsolute}`);

    const originalFilename = file.name;
    const safeFilenameForPath = sanitizeForPath(originalFilename) || `file_${Date.now()}`;

    const relativeFilePath = `${projectSpecificDirRelative}/${safeFilenameForPath}`;
    const absoluteFilePath = path.join(PROJECT_FILES_BASE_DIR, relativeFilePath);

    console.log(`[API Upload] Preparing to write file to: ${absoluteFilePath}`);

    // Convert ArrayBuffer to Buffer and write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(absoluteFilePath, buffer);

    console.log(`[API Upload] File uploaded successfully: ${absoluteFilePath}`);
    return NextResponse.json({ 
      message: 'File uploaded successfully.', 
      relativePath: relativeFilePath, 
      originalName: originalFilename,
    }, { status: 200 });

  } catch (error) {
    console.error('[API Upload] Unhandled error in POST handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during file upload.';
    return NextResponse.json({ message: `File upload failed: ${errorMessage}` }, { status: 500 });
  }
}