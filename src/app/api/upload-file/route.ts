// src/app/api/upload-file/route.ts
import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PROJECT_FILES_BASE_DIR, ensureProjectFilesBaseDirExists } from '@/services/project-service'; 
import { sanitizeForPath } from '@/lib/path-utils'; // Updated import

export async function POST(request: Request) {
  try {
    await ensureProjectFilesBaseDirExists(); // Make sure the base directory exists

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const projectTitle = formData.get('projectTitle') as string | null;

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded.' }, { status: 400 });
    }
    if (!projectId || !projectTitle) {
      return NextResponse.json({ message: 'Project ID and title are required.' }, { status: 400 });
    }

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

    console.log(`File uploaded successfully: ${absoluteFilePath}`);
    return NextResponse.json({ 
      message: 'File uploaded successfully.', 
      relativePath: relativeFilePath, 
      originalName: originalFilename, // Send back the original name for display/metadata
    }, { status: 200 });

  } catch (error) {
    console.error('File upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during file upload.';
    return NextResponse.json({ message: `File upload failed: ${errorMessage}` }, { status: 500 });
  }
}
