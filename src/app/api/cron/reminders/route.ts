import { NextRequest,NextResponse } from 'next/server';
import { runReminders } from '@/lib/notification-service';
export async function GET(request:NextRequest){if(!process.env.CRON_SECRET||request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:'Unauthorized'},{status:401});try{return NextResponse.json(await runReminders())}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Reminder check failed'},{status:500})}}
