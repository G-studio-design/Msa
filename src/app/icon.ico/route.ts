// src/app/icon.ico/route.ts
import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

// This route handler will intercept requests for /icon.ico (and /favicon.ico)
// and serve the msarch-logo.png file instead of any default file.

export async function GET() {
  try {
    // Construct the path to the logo in the public directory
    const imagePath = path.join(process.cwd(), 'public', 'msarch-logo.png');
    
    // Read the image file
    const imageBuffer = await fs.readFile(imagePath);

    // Return the image with the correct content type
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        // Add a cache-control header to encourage browsers to re-fetch
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error serving icon.ico:', error);
    // If the logo is not found, return a 404 error
    return new NextResponse('Icon not found', { status: 404 });
  }
}
