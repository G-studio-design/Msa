
// src/app/api/workflows/route.ts
import { NextResponse } from 'next/server';
import { getAllWorkflows, addWorkflow } from '@/services/workflow-service';

export async function GET(request: Request) {
    try {
        const workflows = await getAllWorkflows();
        return NextResponse.json(workflows);
    } catch (error: any) {
        console.error('[API/Workflows GET] Error:', error);
        return NextResponse.json({ message: "Failed to fetch workflows." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json() as { name: string; description?: string };
        if (!body.name) {
            return NextResponse.json({ message: 'Workflow name is required.' }, { status: 400 });
        }
        const newWorkflow = await addWorkflow(body.name, body.description || '');
        return NextResponse.json(newWorkflow, { status: 201 });
    } catch (error: any) {
        console.error('[API/Workflows POST] Error:', error);
        return NextResponse.json({ message: error.message || 'Failed to add workflow.' }, { status: 500 });
    }
}
