import type { BookCopy, BookTitle, Loan, Student } from './types';
export type Recommendation = { book:BookTitle; available:number; score:number; reason:string };
export function recommend(student:Student,books:BookTitle[],copies:BookCopy[],loans:Loan[],limit=5):Recommendation[] {
 const eligible=books.filter(b=>!b.archived && (b.minimum_grade==null||student.grade>=b.minimum_grade) && (b.maximum_grade==null||student.grade<=b.maximum_grade));
 const own=loans.filter(l=>l.student_id===student.id);
 const held=new Set(own.filter(l=>!l.returned_at).map(l=>copies.find(c=>c.id===l.book_copy_id)?.book_title_id));
 const history=own.filter(l=>l.returned_at).sort((a,b)=>Date.parse(b.issued_at)-Date.parse(a.issued_at));
 const read=new Set(history.map(l=>copies.find(c=>c.id===l.book_copy_id)?.book_title_id));
 const subjectWeight=new Map<string,number>(),authorWeight=new Map<string,number>();
 history.forEach((loan,i)=>{ const book=books.find(b=>b.id===copies.find(c=>c.id===loan.book_copy_id)?.book_title_id); if(!book)return; const w=1/(1+i*.25); for(const s of [...book.subjects,...book.genres]) subjectWeight.set(s.toLowerCase(),(subjectWeight.get(s.toLowerCase())||0)+w); for(const a of book.authors) authorWeight.set(a.toLowerCase(),(authorWeight.get(a.toLowerCase())||0)+w); });
 const popularity=new Map<string,number>(),gradePopularity=new Map<string,number>(); for(const loan of loans){const id=copies.find(c=>c.id===loan.book_copy_id)?.book_title_id;if(id){popularity.set(id,(popularity.get(id)||0)+1);if(loan.students?.grade===student.grade)gradePopularity.set(id,(gradePopularity.get(id)||0)+1)}}
 const maxPopularity=Math.max(1,...popularity.values());
 const options=eligible.map(book=>{
  const available=copies.filter(c=>c.book_title_id===book.id&&c.status==='available').length;
  if(!available||held.has(book.id))return null;
  const matches=[...book.subjects,...book.genres].map(s=>({name:s,weight:subjectWeight.get(s.toLowerCase())||0})).sort((a,b)=>b.weight-a.weight);
  const authors=book.authors.map(a=>({name:a,weight:authorWeight.get(a.toLowerCase())||0})).sort((a,b)=>b.weight-a.weight);
  const subject=Math.min(1,(matches[0]?.weight||0)/2),author=Math.min(1,(authors[0]?.weight||0)/2),pop=((popularity.get(book.id)||0)+(gradePopularity.get(book.id)||0))/(maxPopularity*2);
  const diversity=history.length ? (matches[0]?.weight?0.15:1) : 1;
  const score=history.length?subject*.55+author*.2+pop*.15+diversity*.1:pop*.65+diversity*.35;
  const reason=matches[0]?.weight>0?`Similar to books you enjoyed about ${matches[0].name.toLowerCase()}.`:authors[0]?.weight>0?`You have enjoyed books by ${authors[0].name}.`:history.length?`A fresh subject to explore in Class ${student.grade}.`:`An age-appropriate book available in the library.`;
  return {book,available,score,reason};
 }).filter((r):r is Recommendation=>!!r).sort((a,b)=>b.score-a.score);
 const unread=options.filter(r=>!read.has(r.book.id));
 const pool=unread.length>=limit?unread:options;
 if(!history.length){const picked:Recommendation[]=[],used=new Set<string>();for(const r of pool){const genre=r.book.genres[0]||r.book.subjects[0]||'Other';if(!used.has(genre)){picked.push(r);used.add(genre)}if(picked.length>=limit)return picked}for(const r of pool)if(!picked.includes(r)){picked.push(r);if(picked.length>=limit)break}return picked}
 return pool.slice(0,limit);
}
