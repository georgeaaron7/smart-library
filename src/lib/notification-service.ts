import { admin } from './supabase';
import { deliverEmail,emailContent,EmailKind } from './email';
import { dayInZone } from './dates';
import { reminderKind } from './reminders';
import type { BookCopy,BookTitle,Loan,Settings,Student } from './types';
export async function sendNotification(kind:EmailKind,student:Student,book:BookTitle|null,loan:Loan|null,settings:Settings,force=false) {
 const db=admin();const recipients=[...(settings.send_guardian&&student.guardian_email?[student.guardian_email]:[]),...(settings.send_student&&student.student_email?[student.student_email]:[])].filter((x,i,a)=>a.indexOf(x)===i);
 if(!student.notifications_enabled&&kind!=='test')return [];
 const {subject,body}=emailContent(kind,student,book,loan,settings);const results=[];
 for(const email of recipients){const date=dayInZone(new Date(),settings.timezone);
  const {data:record,error}=await db.from('notifications').insert({loan_id:loan?.id||null,student_id:student.id,notification_type:kind,recipient_email:email,scheduled_for:date,subject,body,status:'pending'}).select().single();
  if(error){if(error.code==='23505'&&!force)continue; if(error.code==='23505'&&force){results.push({email,status:'already_sent'});continue;}throw error;}
  try{const sent=await deliverEmail(email,subject,body,settings.email_mode);await db.from('notifications').update({status:sent.status,provider:sent.provider,provider_message_id:sent.id,sent_at:new Date().toISOString()}).eq('id',record.id);results.push({email,status:sent.status});}
  catch(e){await db.from('notifications').update({status:'failed',error_message:e instanceof Error?e.message:String(e)}).eq('id',record.id);results.push({email,status:'failed'});}
 }
 return results;
}
export async function runReminders(force=false){const db=admin();const {data:settings,error:sError}=await db.from('library_settings').select('*').single();if(sError)throw sError;const conf=settings as Settings;if(!conf.automatic_reminders&&!force)return {checked:0,reminders:0,disabled:true};
 let processed=0,checked=0,offset=0;for(;;){const {data,error}=await db.from('loans').select('*,students(*),book_copies(*,book_titles(*))').is('returned_at',null).order('id').range(offset,offset+999);if(error)throw error;
  for(const row of data||[]){const loan=row as Loan & {students:Student;book_copies:BookCopy & {book_titles:BookTitle}};const kind=reminderKind(loan,conf);if(kind){await sendNotification(kind,loan.students,loan.book_copies.book_titles,loan,conf);processed++;}}
  checked+=data?.length||0;if((data?.length||0)<1000)break;offset+=1000;
 }
 return {checked,reminders:processed};
}
