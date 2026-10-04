create extension if not exists pgcrypto;

create type copy_status as enum ('available','issued','lost','damaged','archived');
create type notification_status as enum ('pending','sent','simulated','failed');

create table librarian_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Librarian',
  tutorial_completed_at timestamptz,
  created_at timestamptz not null default now()
);
create table students (
  id uuid primary key default gen_random_uuid(),
  student_number text not null unique,
  full_name text not null,
  grade integer not null check (grade between 1 and 12),
  section text not null,
  student_email text,
  guardian_name text not null,
  guardian_email text,
  guardian_phone text,
  notifications_enabled boolean not null default true,
  qr_token text not null unique default ('ISG-STUDENT:' || gen_random_uuid()::text),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_address check (not notifications_enabled or student_email is not null or guardian_email is not null)
);
create table book_titles (
  id uuid primary key default gen_random_uuid(),
  isbn10 text,
  isbn13 text,
  title text not null,
  subtitle text,
  authors text[] not null default '{}',
  publisher text,
  publication_year integer,
  language text,
  description text,
  subjects text[] not null default '{}',
  genres text[] not null default '{}',
  cover_url text,
  minimum_grade integer,
  maximum_grade integer,
  metadata_source text not null default 'manual',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grade_range check (minimum_grade is null or maximum_grade is null or minimum_grade <= maximum_grade)
);
create table book_copies (
  id uuid primary key default gen_random_uuid(),
  book_title_id uuid not null references book_titles(id),
  accession_code text not null unique,
  qr_token text not null unique default ('ISG-COPY:' || gen_random_uuid()::text),
  status copy_status not null default 'available',
  shelf_location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create sequence accession_sequence;
create function assign_accession() returns trigger language plpgsql as $$
begin
  if new.accession_code is null or new.accession_code = '' then
    new.accession_code := 'ISG-BK-' || lpad(nextval('accession_sequence')::text, 6, '0');
  end if;
  return new;
end $$;
create trigger book_copy_accession before insert on book_copies for each row execute function assign_accession();
create table loans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id),
  book_copy_id uuid not null references book_copies(id),
  issued_at timestamptz not null default now(),
  due_at timestamptz not null,
  returned_at timestamptz,
  resolution text,
  issued_by uuid not null references auth.users(id),
  returned_by uuid references auth.users(id),
  override_reason text,
  created_at timestamptz not null default now()
);
create unique index one_active_loan_per_copy on loans(book_copy_id) where returned_at is null;
create table library_settings (
  id integer primary key default 1 check (id = 1),
  loan_days integer not null default 14 check (loan_days between 1 and 365),
  max_books integer not null default 3 check (max_books between 1 and 50),
  due_soon_days integer not null default 3 check (due_soon_days between 0 and 90),
  overdue_repeat_days integer not null default 3 check (overdue_repeat_days between 1 and 90),
  overdue_policy text not null default 'warn' check (overdue_policy in ('allow','warn','block')),
  automatic_reminders boolean not null default true,
  send_guardian boolean not null default true,
  send_student boolean not null default true,
  issue_confirmation boolean not null default true,
  return_confirmation boolean not null default true,
  school_name text not null default 'Indian School Al Ghubra',
  app_name text not null default 'ISG Smart Library System',
  timezone text not null default 'Asia/Muscat',
  email_mode text not null default 'mock' check (email_mode in ('mock','brevo')),
  updated_at timestamptz not null default now()
);
insert into library_settings(id) values (1);
create table notifications (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid references loans(id),
  student_id uuid references students(id),
  notification_type text not null,
  recipient_email text not null,
  scheduled_for date not null,
  subject text not null,
  body text not null,
  sent_at timestamptz,
  status notification_status not null default 'pending',
  provider text,
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  unique (loan_id, notification_type, recipient_email, scheduled_for)
);
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  description text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create function touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
create trigger touch_students before update on students for each row execute function touch_updated_at();
create trigger touch_titles before update on book_titles for each row execute function touch_updated_at();
create trigger touch_copies before update on book_copies for each row execute function touch_updated_at();
create trigger touch_settings before update on library_settings for each row execute function touch_updated_at();
create function prevent_audit_change() returns trigger language plpgsql as $$ begin raise exception 'Audit records are immutable'; end $$;
create trigger immutable_audit before update or delete on audit_logs for each row execute function prevent_audit_change();

create function is_librarian() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from librarian_profiles where id = auth.uid())
$$;
alter table librarian_profiles enable row level security;
alter table students enable row level security;
alter table book_titles enable row level security;
alter table book_copies enable row level security;
alter table loans enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;
alter table library_settings enable row level security;
create policy profile_read on librarian_profiles for select to authenticated using (is_librarian());
create policy profile_self_update on librarian_profiles for update to authenticated using (id = auth.uid() and is_librarian()) with check (id = auth.uid());
create policy students_select on students for select to authenticated using (is_librarian());
create policy students_insert on students for insert to authenticated with check (is_librarian());
create policy students_update on students for update to authenticated using (is_librarian()) with check (is_librarian());
create policy titles_select on book_titles for select to authenticated using (is_librarian());
create policy titles_insert on book_titles for insert to authenticated with check (is_librarian());
create policy titles_update on book_titles for update to authenticated using (is_librarian()) with check (is_librarian());
create policy copies_select on book_copies for select to authenticated using (is_librarian());
create policy copies_insert on book_copies for insert to authenticated with check (is_librarian());
create policy copies_update on book_copies for update to authenticated using (is_librarian()) with check (is_librarian());
create policy loans_select on loans for select to authenticated using (is_librarian());
create policy notifications_select on notifications for select to authenticated using (is_librarian());
create policy audit_select on audit_logs for select to authenticated using (is_librarian());
create policy settings_select on library_settings for select to authenticated using (is_librarian());
create policy settings_update on library_settings for update to authenticated using (is_librarian()) with check (is_librarian());

create function audit_record(p_action text, p_type text, p_id uuid, p_description text, p_metadata jsonb default '{}') returns void
language plpgsql security definer set search_path = public as $$
begin
 if not is_librarian() then raise exception 'Unauthorized'; end if;
 insert into audit_logs(actor_id,action,entity_type,entity_id,description,metadata)
 values(auth.uid(),p_action,p_type,p_id,p_description,p_metadata);
end $$;
create function issue_copy(p_student uuid, p_copy uuid, p_due timestamptz default null, p_override_reason text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_student students%rowtype; v_copy book_copies%rowtype; v_settings library_settings%rowtype; v_count integer; v_overdue integer; v_loan uuid; v_due timestamptz;
begin
 if not is_librarian() then raise exception 'Unauthorized'; end if;
 select * into v_student from students where id=p_student for update;
 if not found or not v_student.active then raise exception 'Student is unavailable'; end if;
 select * into v_copy from book_copies where id=p_copy for update;
 if not found or v_copy.status <> 'available' then raise exception 'Copy is unavailable'; end if;
 if exists(select 1 from book_titles where id=v_copy.book_title_id and archived) then raise exception 'Book title is archived'; end if;
 select * into v_settings from library_settings where id=1;
 select count(*), count(*) filter(where due_at < now()) into v_count,v_overdue from loans where student_id=p_student and returned_at is null;
 if v_count >= v_settings.max_books and nullif(trim(coalesce(p_override_reason,'')),'') is null then raise exception 'Student is at the book limit. Provide an override reason.'; end if;
 if v_overdue > 0 and v_settings.overdue_policy='block' and nullif(trim(coalesce(p_override_reason,'')),'') is null then raise exception 'Student has overdue books. Provide an override reason.'; end if;
 v_due := coalesce(p_due, now() + make_interval(days=>v_settings.loan_days));
 if v_due <= now() then raise exception 'Due date must be in the future'; end if;
 insert into loans(student_id,book_copy_id,due_at,issued_by,override_reason) values(p_student,p_copy,v_due,auth.uid(),nullif(trim(coalesce(p_override_reason,'')),'')) returning id into v_loan;
 update book_copies set status='issued' where id=p_copy;
 perform audit_record('book_issued','loan',v_loan,'Book issued to '||v_student.full_name,jsonb_build_object('copy_id',p_copy,'override_reason',p_override_reason));
 if p_due is not null then perform audit_record('due_date_override','loan',v_loan,'Due date set by librarian',jsonb_build_object('due_at',v_due)); end if;
 return v_loan;
end $$;
create function return_copy(p_copy uuid, p_resolution text default 'returned') returns uuid
language plpgsql security definer set search_path = public as $$
declare v_loan loans%rowtype; v_status copy_status;
begin
 if not is_librarian() then raise exception 'Unauthorized'; end if;
 if p_resolution not in ('returned','damaged','lost') then raise exception 'Invalid resolution'; end if;
 select * into v_loan from loans where book_copy_id=p_copy and returned_at is null for update;
 if not found then
   select id into v_loan.id from loans where book_copy_id=p_copy and returned_at is not null order by returned_at desc limit 1;
   return v_loan.id;
 end if;
 v_status := case when p_resolution='returned' then 'available'::copy_status else p_resolution::copy_status end;
 update loans set returned_at=now(),returned_by=auth.uid(),resolution=p_resolution where id=v_loan.id;
 update book_copies set status=v_status where id=p_copy;
 perform audit_record('book_'||p_resolution,'loan',v_loan.id,'Book '||p_resolution,jsonb_build_object('copy_id',p_copy));
 return v_loan.id;
end $$;
create function add_book_with_copies(p_book jsonb,p_count integer) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; i integer;
begin
 if not is_librarian() then raise exception 'Unauthorized'; end if;
 if p_count < 1 or p_count > 100 then raise exception 'Copy count must be between 1 and 100'; end if;
 if nullif(trim(p_book->>'title'),'') is null then raise exception 'Title is required'; end if;
 insert into book_titles(isbn10,isbn13,title,subtitle,authors,publisher,publication_year,language,description,subjects,genres,cover_url,minimum_grade,maximum_grade,metadata_source)
 values(nullif(p_book->>'isbn10',''),nullif(p_book->>'isbn13',''),p_book->>'title',nullif(p_book->>'subtitle',''),coalesce(array(select jsonb_array_elements_text(p_book->'authors')),'{}'),nullif(p_book->>'publisher',''),nullif(p_book->>'publication_year','')::int,nullif(p_book->>'language',''),nullif(p_book->>'description',''),coalesce(array(select jsonb_array_elements_text(p_book->'subjects')),'{}'),coalesce(array(select jsonb_array_elements_text(p_book->'genres')),'{}'),nullif(p_book->>'cover_url',''),nullif(p_book->>'minimum_grade','')::int,nullif(p_book->>'maximum_grade','')::int,coalesce(p_book->>'metadata_source','manual')) returning id into v_id;
 for i in 1..p_count loop insert into book_copies(book_title_id,accession_code) values(v_id,''); end loop;
 perform audit_record('book_created','book_title',v_id,'Book added: '||(p_book->>'title'),jsonb_build_object('copies',p_count));
 return v_id;
end $$;
grant execute on function is_librarian() to authenticated;
grant execute on function audit_record(text,text,uuid,text,jsonb) to authenticated;
grant execute on function issue_copy(uuid,uuid,timestamptz,text) to authenticated;
grant execute on function return_copy(uuid,text) to authenticated;
grant execute on function add_book_with_copies(jsonb,integer) to authenticated;
