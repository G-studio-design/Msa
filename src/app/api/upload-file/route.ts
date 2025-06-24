
// src/app/api/upload-file/route.ts
import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ensureProjectFilesBaseDirExists } from '@/services/project-service'; 
import { sanitizeForPath } from '@/lib/path-utils'; 
import { PROJECT_FILES_BASE_DIR } from '@/config/file-constants';

// Define the allowed roles for file upload
const ALLOWED_ROLES = ['Owner', 'Admin Proyek', 'Arsitek', 'Struktur', 'MEP', 'Admin Developer', 'Akuntan'];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // --- ADDED LOG FOR RECEIVED FORM DATA ---
    console.log('[API Upload] Received FormData:');
    for (const [key, value] of formData.entries()) {
      console.log(`[API Upload] Key: ${key}, Value: ${typeof value === 'string' ? value : 'File object'}`);
    }
    // --- END ADDED LOG ---

    await ensureProjectFilesBaseDirExists(); // Make sure the base directory exists

    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const projectTitle = formData.get('projectTitle') as string | null;
    const userId = formData.get('userId') as string | null; // Get userId from form data

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded.' }, { status: 400 });
    }
    if (!projectId || !projectTitle || !userId) { // Ensure userId is present
      console.error('[API Upload] Missing required fields:', { projectId, projectTitle, userId });
      return NextResponse.json({ message: 'Project ID, title, and User ID are required.' }, { status: 400 });
    }

    // --- Role Check ---
    const usersFilePath = path.join(process.cwd(), 'src/database/users.json');
    let users = [];
    try {
      const usersFileContent = await fs.readFile(usersFilePath, 'utf-8');
      users = JSON.parse(usersFileContent);
    } catch (readError) {
      console.error('Error reading users.json:', readError);
      return NextResponse.json({ message: 'Failed to read user data for authorization.' }, { status: 500 });
    }

    const user = users.find((u: any) => u.id === userId);

    if (!user) {
      console.error('[API Upload] User not found for ID:', userId);
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
      console.warn('[API Upload] User role not authorized:', user.role, 'for user ID:', userId);
      return NextResponse.json({ message: 'User role is not authorized to upload files.' }, { status: 403 }); // Forbidden
    }
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

    // Sanitize the original filename before saving for path compatibility
    const originalFilename = file.name;
    const safeFilenameForPath = sanitizeForPath(originalFilename) || `file_${Date.now()}`; // Ensure there's always a name

    const relativeFilePath = `${projectSpecificDirRelative}/${safeFilenameForPath}`;
    const absoluteFilePath = path.join(PROJECT_FILES_BASE_DIR, relativeFilePath);

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
    console.error('[API Upload] File upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during file upload.';
    return NextResponse.json({ message: `File upload failed: ${errorMessage}` }, { status: 500 });
  }
}
