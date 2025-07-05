
// src/app/api/upload-file/route.ts
'use server';
import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { sanitizeForPath } from '@/lib/path-utils'; 
import { getAllUsers } from '@/services/data-access/user-data';

// Define the allowed roles for file upload
const ALLOWED_ROLES = ['Owner', 'Admin Proyek', 'Arsitek', 'Struktur', 'MEP', 'Admin Developer', 'Akuntan'];

export async function POST(request: Request) {
  // Define base directory safely within the handler
  const PROJECT_FILES_BASE_DIR = path.resolve(process.cwd(), 'src', 'database', 'project_files');
  
  try {
    // Ensure the base directory for all project files exists
    await fs.mkdir(PROJECT_FILES_BASE_DIR, { recursive: true });

    const formData = await request.formData();
    const projectId = formData.get('projectId') as string | null;
    const userId = formData.get('userId') as string | null;
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0 || !projectId || !userId) {
      return NextResponse.json({ message: 'Project ID, User ID and at least one file are required.' }, { status: 400 });
    }
    
    // --- Role Check ---
    const users = await getAllUsers();
    const user = users.find((u: any) => u.id === userId);

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }
    
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ message: 'User role is not authorized to upload files.' }, { status: 403 });
    }
    // --- End Role Check ---

    const projectSpecificDirRelative = projectId;
    const projectSpecificDirAbsolute = path.join(PROJECT_FILES_BASE_DIR, projectSpecificDirRelative);

    // Ensure the project-specific directory exists
    await fs.mkdir(projectSpecificDirAbsolute, { recursive: true });
    
    const uploadedFileEntries = [];

    for (const file of files) {
        const originalFilename = file.name;
        const safeFilenameForPath = sanitizeForPath(originalFilename) || `file_${Date.now()}`;
        const relativeFilePath = path.join(projectSpecificDirRelative, safeFilenameForPath);
        const absoluteFilePath = path.join(PROJECT_FILES_BASE_DIR, relativeFilePath);
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await fs.writeFile(absoluteFilePath, buffer);
        uploadedFileEntries.push({
            name: originalFilename,
            uploadedBy: user.role,
            path: relativeFilePath.replace(/\\/g, '/'),
            timestamp: new Date().toISOString(),
        });
    }

    console.log(`[API Upload] ${files.length} file(s) uploaded successfully for project ${projectId}`);
    return NextResponse.json({ 
      message: 'Files uploaded successfully.', 
      uploadedFiles: uploadedFileEntries
    }, { status: 200 });

  } catch (error) {
    console.error('[API Upload] Unhandled error in POST handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during file upload.';
    return NextResponse.json({ message: `File upload failed: ${errorMessage}` }, { status: 500 });
  }
}
