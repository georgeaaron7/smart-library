import { describe,it,expect } from 'vitest';
import { recommend } from '../src/lib/recommend';
import { reminderKind } from '../src/lib/reminders';
import { zonedEndOfDay } from '../src/lib/dates';
import type { BookCopy,BookTitle,Loan,Settings,Student } from '../src/lib/types';
const student={id:'s1',full_name:'Asha Example',student_number:'1',grade:6,section:'A',active:true} as Student;
const book=(id:string,genre:string,min=4,max=10):BookTitle=>({id,title:id,authors:[],genres:[genre],subjects:[genre],minimum_grade:min,maximum_grade:max,archived:false} as unknown as BookTitle);
const copy=(id:string,title:string,status:BookCopy['status']='available'):BookCopy=>({id,book_title_id:title,status} as BookCopy);
const loan=(id:string,studentId:string,copyId:string,returned_at:string|null='2026-01-15T00:00:00Z'):Loan=>({id,student_id:studentId,book_copy_id:copyId,issued_at:'2026-01-01T00:00:00Z',due_at:'2026-01-15T00:00:00Z',returned_at} as Loan);
const settings={...({} as Settings),due_soon_days:3,overdue_repeat_days:3,timezone:'Asia/Muscat'};
describe('recommendations',()=>{
 it('uses completed borrowing subjects and explains the match',()=>{const books=[book('read','Space'),book('match','Space'),book('other','History')];const copies=[copy('c1','read'),copy('c2','match'),copy('c3','other')];const result=recommend(student,books,copies,[loan('l1','s1','c1')],2);expect(result[0].book.id).toBe('match');expect(result[0].reason).toMatch(/space/i)});
 it('filters out unavailable copies and active loans',()=>{const books=[book('held','Space'),book('lost','Space'),book('good','Space')];const copies=[copy('c1','held','issued'),copy('c2','lost','lost'),copy('c3','good')];const result=recommend(student,books,copies,[loan('l1','s1','c1',null)]);expect(result.map(r=>r.book.id)).toEqual(['good'])});
 it('filters by class suitability',()=>{const result=recommend(student,[book('older','Science',8,10),book('fit','Science')],[copy('c1','older'),copy('c2','fit')],[]);expect(result.map(r=>r.book.id)).toEqual(['fit'])});
 it('offers diverse cold-start books',()=>{const books=[book('a','Space'),book('b','Space'),book('c','History'),book('d','Fantasy')];const copies=books.map((b,i)=>copy(`c${i}`,b.id));const result=recommend(student,books,copies,[],3);expect(new Set(result.map(r=>r.book.genres[0])).size).toBe(3)});
 it('avoids already read books when enough alternatives exist',()=>{const books=[book('read','Space'),book('a','Space'),book('b','Space')];const copies=books.map((b,i)=>copy(`c${i}`,b.id));const result=recommend(student,books,copies,[loan('l1','s1','c0')],2);expect(result.map(r=>r.book.id)).not.toContain('read')});
});
describe('reminder schedule',()=>{
 const base={...loan('x','s1','c1',null),due_at:'2026-10-10T12:00:00Z'};
 it('sends due-soon at configured offset',()=>expect(reminderKind(base,settings,'2026-10-07')).toBe('due_soon'));
 it('sends on due date',()=>expect(reminderKind(base,settings,'2026-10-10')).toBe('due_today'));
 it('repeats overdue at configured interval',()=>{expect(reminderKind(base,settings,'2026-10-13')).toBe('overdue');expect(reminderKind(base,settings,'2026-10-14')).toBeNull()});
 it('does not remind for returned loans',()=>expect(reminderKind({...base,returned_at:'2026-10-09T00:00:00Z'},settings,'2026-10-10')).toBeNull());
});
describe('school due dates',()=>{
 it('stores the end of a Muscat due date in UTC',()=>expect(zonedEndOfDay('2026-10-10','Asia/Muscat')).toBe('2026-10-10T19:59:00.000Z'));
});
