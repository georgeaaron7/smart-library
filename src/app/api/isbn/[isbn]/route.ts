import { NextRequest,NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { admin } from '@/lib/supabase';
export async function GET(request:NextRequest,{params}:{params:Promise<{isbn:string}>}) {
 const token=request.headers.get('authorization')?.replace(/^Bearer /,'');
 if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
 const {data:{user}}=await db.auth.getUser(token);
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const {data:profile}=await admin().from('librarian_profiles').select('id').eq('id',user.id).single();
 if(!profile)return NextResponse.json({error:'Forbidden'},{status:403});
 const {isbn}=await params;const normalized=isbn.replace(/[^0-9X]/gi,'');
 if(!/^([0-9]{13}|[0-9]{9}[0-9X])$/.test(normalized))return NextResponse.json({error:'Enter a valid ISBN-10 or ISBN-13.'},{status:400});
 try {const response=await fetch(`https://openlibrary.org/isbn/${normalized}.json`,{signal:AbortSignal.timeout(8000),headers:{'User-Agent':'ISGSmartLibrary/1.0 (school library metadata lookup)'}});
  if(!response.ok)return NextResponse.json({error:"We couldn't find this ISBN. You can enter the book details manually."},{status:404});
  const edition=await response.json();let authors:string[]=[];
  if(Array.isArray(edition.authors))authors=await Promise.all(edition.authors.slice(0,5).map(async(a:{key:string})=>{try{const r=await fetch(`https://openlibrary.org${a.key}.json`,{signal:AbortSignal.timeout(5000)});const x=await r.json();return x.name||''}catch{return ''}}));
  const subjects=(edition.subjects||[]).filter((s:unknown)=>typeof s==='string').slice(0,8);
  return NextResponse.json({isbn10:edition.isbn_10?.[0]||'',isbn13:edition.isbn_13?.[0]||'',title:edition.title||'',subtitle:edition.subtitle||'',authors:authors.filter(Boolean),publisher:edition.publishers?.[0]||'',publication_year:Number((edition.publish_date||'').match(/\d{4}/)?.[0])||null,language:edition.languages?.[0]?.key?.split('/').pop()||'',description:typeof edition.description==='string'?edition.description:edition.description?.value||'',subjects,genres:[],cover_url:edition.covers?.[0]?`https://covers.openlibrary.org/b/id/${edition.covers[0]}-M.jpg`:`https://covers.openlibrary.org/b/isbn/${normalized}-M.jpg`,metadata_source:'open_library'});
 }catch{return NextResponse.json({error:'Book lookup is unavailable right now. Enter the details manually.'},{status:503})}
}
