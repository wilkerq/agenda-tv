
import { NextResponse, type NextRequest } from 'next/server';
import { syncExternalEvents } from '@/lib/sync-actions';
import { ScrapedEventSchema } from '@/lib/types';
import { z } from 'zod';

export async function POST(req: NextRequest) {
    // 1. Authenticate the request
    const secretKey = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    const providedKey = authHeader?.split(' ')[1]; // Expects "Bearer YOUR_SECRET_KEY"

    if (!secretKey) {
        console.error("CRON_SECRET is not set on the server.");
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (!providedKey || providedKey !== secretKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate the incoming data
    let body;
    try {
        body = await req.json();
    } catch (error) {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    
    const ScrapedEventListSchema = z.array(ScrapedEventSchema);
    const validationResult = ScrapedEventListSchema.safeParse(body);

    if (!validationResult.success) {
        return NextResponse.json({ error: 'Invalid data format', details: validationResult.error.flatten() }, { status: 400 });
    }

    // 3. Call the server action to perform the sync
    try {
        const result = await syncExternalEvents(validationResult.data);
        return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
        console.error("Error during external event sync:", error);
        return NextResponse.json({ error: 'Failed to synchronize events', details: error.message }, { status: 500 });
    }
}
