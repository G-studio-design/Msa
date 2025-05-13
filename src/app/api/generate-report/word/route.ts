// Server-side API route catch block
// ...
        const errorResponsePayload = { 
            error: 'Word Report Generation Failed', 
            details: finalDetailMessage 
        };
        console.error(`[API/WordReport] Responding with error payload:`, JSON.stringify(errorResponsePayload));
        return NextResponse.json(errorResponsePayload, { status: 500 });
// ...
