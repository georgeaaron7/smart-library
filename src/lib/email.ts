import type { Loan,Student,BookTitle,Settings } from './types';
export type EmailKind='issue'|'return'|'due_soon'|'due_today'|'overdue'|'test';
export function emailContent(kind:EmailKind,student:Student,book:BookTitle|null,loan:Loan|null,settings:Settings) {
 const name=student.full_name;const title=book?.title||'your library book';const due=loan?new Intl.DateTimeFormat('en-GB',{timeZone:settings.timezone,day:'numeric',month:'long',year:'numeric'}).format(new Date(loan.due_at)):'';
 const subject=kind==='issue'?`Library book issued: ${title}`:kind==='return'?`Library book returned: ${title}`:kind==='due_soon'?`Library reminder: ${title} is due soon`:kind==='due_today'?`Library reminder: ${title} is due today`:kind==='overdue'?`Library reminder: ${title} is overdue`:'ISG Smart Library test email';
 const message=kind==='issue'?`${name} borrowed ${title}. The return date is ${due}. Please return it by this date.`:kind==='return'?`${name} returned ${title}. Thank you for using the library.`:kind==='due_soon'?`${title}, borrowed by ${name}, is due on ${due}. Please return or renew it with the librarian.`:kind==='due_today'?`${title}, borrowed by ${name}, is due today (${due}). Please return it to the library.`:kind==='overdue'?`${title}, borrowed by ${name}, was due on ${due}. Please contact the library or return it as soon as possible.`:'This confirms that library email is configured.';
 return {subject,body:`Dear parent/guardian,\n\n${message}\n\nIndian School Al Ghubra Library`};
}
export async function deliverEmail(to:string,subject:string,body:string,mode:'mock'|'brevo'='mock') {
 if(process.env.EMAIL_MODE!=='brevo'||mode!=='brevo')return {status:'simulated' as const,provider:'mock',id:null};
 if(!process.env.BREVO_API_KEY||!process.env.BREVO_SENDER_EMAIL)throw new Error('Brevo is not configured');
 const r=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'Content-Type':'application/json','api-key':process.env.BREVO_API_KEY},body:JSON.stringify({sender:{email:process.env.BREVO_SENDER_EMAIL,name:process.env.BREVO_SENDER_NAME||'ISG Smart Library'},to:[{email:to}],subject,textContent:body})});
 if(!r.ok)throw new Error(`Email provider returned ${r.status}`);const response=await r.json();return {status:'sent' as const,provider:'brevo',id:response.messageId||null};
}
