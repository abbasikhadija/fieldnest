-- M3: private immutable receipts plus a version-checked transactional RPC.
create table private.inspection_operation_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  inspection_id uuid not null,
  base_version integer not null,
  payload jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);
revoke all on private.inspection_operation_receipts from public, anon, authenticated;

create function public.apply_inspection_operation(
  operation_id uuid, inspection_id uuid, base_version integer, payload jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  receipt private.inspection_operation_receipts%rowtype;
  current_record public.inspection_records%rowtype;
  response jsonb;
begin
  if actor is null or not private.is_inspection_assignee(inspection_id) then
    raise exception 'Not authorized for this inspection' using errcode = '42501';
  end if;
  if operation_id is null or base_version is null or base_version < 1 or payload is null
    or jsonb_typeof(payload) <> 'object'
    or not (payload ?& array['answers','notes','status'])
    or (payload - array['answers','notes','status']) <> '{}'::jsonb
    or jsonb_typeof(payload->'answers') <> 'object'
    or not private.valid_inspection_answers(payload->'answers')
    or jsonb_typeof(payload->'notes') <> 'string'
    or length(payload->>'notes') > 5000
    or payload->>'status' not in ('draft','completed')
    or jsonb_typeof(payload->'status') <> 'string'
    or (payload->>'status' = 'completed' and not ((payload->'answers') ?& array['walls','floors','kitchen','water','bathroom','leaks','electrical','alarm'])) then
    raise exception 'Invalid operation' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text || operation_id::text, 0));
  select * into receipt from private.inspection_operation_receipts r
    where r.user_id = actor and r.operation_id = apply_inspection_operation.operation_id;
  if found then
    if receipt.inspection_id <> inspection_id or receipt.base_version <> base_version or receipt.payload <> payload then
      raise exception 'Operation identifier reused' using errcode = '22023';
    end if;
    return receipt.result;
  end if;
  select * into current_record from public.inspection_records r
    where r.inspection_id = apply_inspection_operation.inspection_id for update;
  if not found then
    raise exception 'Record unavailable' using errcode = '42501';
  end if;
  if current_record.version <> base_version or current_record.status = 'completed' then
    response := jsonb_build_object('kind','conflict','record',to_jsonb(current_record));
  else
    update public.inspection_records r set
      answers = payload->'answers', notes = payload->>'notes', status = payload->>'status',
      version = r.version + 1, updated_at = clock_timestamp(),
      completed_at = case when payload->>'status' = 'completed' then clock_timestamp() else null end
      where r.inspection_id = apply_inspection_operation.inspection_id
      returning * into current_record;
    response := jsonb_build_object('kind','accepted','record',to_jsonb(current_record));
  end if;
  insert into private.inspection_operation_receipts(user_id,operation_id,inspection_id,base_version,payload,result)
    values(actor,operation_id,inspection_id,base_version,payload,response);
  return response;
end;
$$;
revoke all on function public.apply_inspection_operation(uuid,uuid,integer,jsonb) from public, anon;
grant execute on function public.apply_inspection_operation(uuid,uuid,integer,jsonb) to authenticated;

