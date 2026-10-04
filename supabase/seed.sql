-- Run after creating the first librarian profile. All people and addresses are fictional.
do $$
declare actor uuid; i integer; sid uuid; cid uuid; lid uuid;
  names text[] := array['Aarav Mehta','Diya Nair','Kabir Shah','Ananya Rao','Vihaan Patel','Myra Iyer','Arjun Menon','Sana Kapoor','Reyansh Bose','Tara Joshi','Aditya Sen','Nisha Bhat','Ishaan Desai','Zoya Khan','Rohan Pillai','Meera Varma','Dev Malhotra','Aisha Fernandes','Neel Gupta','Priya Reddy'];
  titles text[] := array['The Secret Garden','Journey to the River Sea','The Wild Robot','A Wrinkle in Time','Matilda','The Blue Umbrella','The Jungle Book','The Hobbit','The Lion, the Witch and the Wardrobe','The Phantom Tollbooth','Charlotte''s Web','The Boy Who Harnessed the Wind','Hidden Figures Young Readers','The Story of My Life','The Railway Children','The Swiss Family Robinson','Around the World in Eighty Days','Twenty Thousand Leagues Under the Sea','The Adventures of Tom Sawyer','Black Beauty','The Little Prince','Anne of Green Gables','The Mysterious Benedict Society','The Invention of Hugo Cabret','The Alchemist','The Diary of a Young Girl','Wings of Fire','A Brief History of Time','The Stars: A New Way to See Them','The Usborne Encyclopedia of World History','The Magic of Reality','Wonder','Holes','The Giver','The Tale of Despereaux'];
  authors text[] := array['Frances Hodgson Burnett','Eva Ibbotson','Peter Brown','Madeleine L''Engle','Roald Dahl','Ruskin Bond','Rudyard Kipling','J. R. R. Tolkien','C. S. Lewis','Norton Juster','E. B. White','William Kamkwamba','Margot Lee Shetterly','Helen Keller','E. Nesbit','Johann David Wyss','Jules Verne','Jules Verne','Mark Twain','Anna Sewell','Antoine de Saint-Exupéry','L. M. Montgomery','Trenton Lee Stewart','Brian Selznick','Paulo Coelho','Anne Frank','A. P. J. Abdul Kalam','Stephen Hawking','H. A. Rey','Jane Chisholm','Richard Dawkins','R. J. Palacio','Louis Sachar','Lois Lowry','Kate DiCamillo'];
  genres text[] := array['Nature','Adventure','Science fiction','Science fiction','Humour','Nature','Adventure','Fantasy','Fantasy','Fantasy','Animals','Science','Science','Biography','Adventure','Adventure','Adventure','Science fiction','Adventure','Animals','Fantasy','Classic','Mystery','Mystery','Fiction','Biography','Biography','Science','Astronomy','History','Science','Fiction','Mystery','Science fiction','Fantasy'];
begin
 select id into actor from librarian_profiles order by created_at limit 1;
 if actor is null then raise exception 'Create a librarian profile before loading demo data'; end if;
 for i in 1..20 loop
  insert into students(student_number,full_name,grade,section,guardian_name,guardian_email,student_email,notifications_enabled)
  values('DEMO-'||lpad(i::text,3,'0'),names[i],4+((i-1)%7),chr(65+((i-1)%3)),'Guardian of '||names[i],'guardian'||i||'@example.test','student'||i||'@example.test',true)
  on conflict(student_number) do nothing;
 end loop;
 for i in 1..35 loop
  if not exists(select 1 from book_titles where title=titles[i] and metadata_source='demo') then
   insert into book_titles(title,authors,genres,subjects,minimum_grade,maximum_grade,metadata_source,description)
   values(titles[i],array[authors[i]],array[genres[i]],array[genres[i]],case when i in (26,28) then 8 else 4 end,10,'demo','A library title for demonstration.');
  end if;
 end loop;
 for sid in select id from book_titles where metadata_source='demo' order by title loop
  if not exists(select 1 from book_copies where book_title_id=sid) then
   insert into book_copies(book_title_id,accession_code) values(sid,'');
  end if;
 end loop;
 for sid in select id from book_titles where metadata_source='demo' order by title limit 15 loop
  if (select count(*) from book_copies where book_title_id=sid)=1 then
   insert into book_copies(book_title_id,accession_code) values(sid,'');
  end if;
 end loop;
 if not exists(select 1 from loans where issued_by=actor) then
  for i in 1..18 loop
   select id into sid from students where student_number='DEMO-'||lpad((1+((i-1)%20))::text,3,'0');
   select id into cid from book_copies order by accession_code offset (i-1) limit 1;
   insert into loans(student_id,book_copy_id,issued_at,due_at,returned_at,resolution,issued_by,returned_by)
   values(sid,cid,now()-make_interval(days=>70-i*2),now()-make_interval(days=>56-i*2),now()-make_interval(days=>54-i*2),'returned',actor,actor);
  end loop;
  for i in 1..5 loop
   select id into sid from students where student_number='DEMO-'||lpad((i+3)::text,3,'0');
   select id into cid from book_copies order by accession_code offset (i+25) limit 1;
   insert into loans(student_id,book_copy_id,issued_at,due_at,issued_by)
   values(sid,cid,now()-make_interval(days=>i*5),case when i<=2 then now()-make_interval(days=>i*3) else now()+make_interval(days=>i*2) end,actor)
   returning id into lid;
   update book_copies set status='issued' where id=cid;
  end loop;
 end if;
end $$;
