create function guard_copy_status() returns trigger language plpgsql as $$
declare active_count integer;
begin
 if tg_op = 'INSERT' and new.status = 'issued' then raise exception 'New copies cannot start as issued'; end if;
 if tg_op = 'UPDATE' and new.status is distinct from old.status then
   select count(*) into active_count from loans where book_copy_id = new.id and returned_at is null;
   if new.status = 'issued' and active_count <> 1 then raise exception 'Issued copy must have an active loan'; end if;
   if new.status <> 'issued' and active_count > 0 then raise exception 'Return or resolve the active loan first'; end if;
 end if;
 return new;
end $$;
create trigger copy_status_integrity before insert or update on book_copies for each row execute function guard_copy_status();

create function change_due_date(p_loan uuid,p_due timestamptz) returns void
language plpgsql security definer set search_path=public as $$
declare old_due timestamptz;
begin
 if not is_librarian() then raise exception 'Unauthorized'; end if;
 if p_due <= now() then raise exception 'New due date must be in the future'; end if;
 select due_at into old_due from loans where id=p_loan and returned_at is null for update;
 if not found then raise exception 'Active loan not found'; end if;
 update loans set due_at=p_due where id=p_loan;
 perform audit_record('due_date_changed','loan',p_loan,'Due date changed',jsonb_build_object('old_due',old_due,'new_due',p_due));
end $$;
create function add_copies(p_title uuid,p_count integer) returns integer
language plpgsql security definer set search_path=public as $$
declare i integer;
begin
 if not is_librarian() then raise exception 'Unauthorized'; end if;
 if not exists(select 1 from book_titles where id=p_title and not archived) then raise exception 'Book title not found'; end if;
 if p_count < 1 or p_count > 100 then raise exception 'Copy count must be between 1 and 100'; end if;
 for i in 1..p_count loop insert into book_copies(book_title_id,accession_code) values(p_title,''); end loop;
 perform audit_record('copies_added','book_title',p_title,p_count||' physical copies added',jsonb_build_object('count',p_count));
 return p_count;
end $$;
grant execute on function change_due_date(uuid,timestamptz) to authenticated;
grant execute on function add_copies(uuid,integer) to authenticated;
