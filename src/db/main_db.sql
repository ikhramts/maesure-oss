SET TIME ZONE 'UTC';

create table accounts (
	id uuid not null primary key,
	name text not null,
	auth0_user_id text not null,
	is_deleted boolean not null default(FALSE),
	temp_account_session_id text null,
	trial_expiry_utc timestamp null,
	paddle_subscription_id bigint null,
	paddle_update_payment_url text null
);

create index accounts_auth0_user_id_idx on accounts (auth0_user_id);

create index accounts_temp_account_session_id_idx on accounts(temp_account_session_id)

create table account_flags (
	id uuid not null primary key,
	account_id uuid not null references accounts(id),
	name text not null,
	value boolean not null,
	last_changed_time_utc timestamp not null
)

create index account_flags_account_id_idx on account_flags (account_id);

create table activity_groups (
	id uuid not null primary key,
	poll_id uuid not null references polls(id),
	name text not null,
	parent_id uuid null,
	position int not null,
	match_response_text text null,
	is_uncategorized boolean not null default(FALSE)
)

create index activity_groups_poll_id_idx on activity_groups (poll_id)

create table polls (
	id uuid not null primary key,
	account_id uuid not null references accounts(id),
	is_active boolean not null,
	active_from interval hour to second not null,
	active_to interval hour to second not null,
	desired_frequency interval not null,
	name text not null,
	poll_type text not null,
	was_started boolean not null default(false),
	started_at timestamp null
);

create index polls_account_id_idx on polls (account_id);

create table poll_responses (
	id uuid not null primary key,
	poll_id uuid not null references polls(id),
	time_collected timestamp not null,
	response_option smallint not null,
	response_text text not null,
	time_block_length interval not null,
	time_zone_offset interval not null,
	time_zone text null,
	created_time_utc timestamp null
);

create index poll_responses_poll_id_idx on poll_responses (poll_id);
create index poll_responses_poll_id_time_collected_idx on poll_responses(poll_id, time_collected);

create table poll_fixed_options (
	id uuid not null primary key,
	poll_id uuid not null references polls(id),
	option_text text not null,
	color text not null,
	position int not null
)

create index poll_fixed_options_poll_id_idx on poll_fixed_options (poll_id);

create table time_log_entries (
	id uuid not null primary key,
	poll_id uuid not null references polls(id),
	from_time timestamp not null,
	to_time timestamp not null,
	time_block_length interval not null,
	entry_text text not null,
	time_zone_offset interval not null,
	time_zone text null,
	undo_target uuid null,
	
	created_time_utc timestamp null,
	is_deletion boolean default false,
	submission_type text null
)

create index time_log_entries_poll_id_idx on time_log_entries (poll_id);
create index time_log_entries_poll_id_from_time_idx on time_log_entries(poll_id, from_time);
create index time_log_entries_poll_id_from_to_time_idx on time_log_entries(poll_id, from_time, to_time);

create table client_checkins (
	account_id uuid not null,
	timestamp_utc timestamp not null,
	client_type text not null,
	client_version text not null
)

create index client_checkins_timestamp_utc_idx on client_checkins (timestamp_utc);



create user svc_taposcope with password 'xxx'
grant connect on database postgres to svc_taposcope
grant usage on schema public to svc_taposcope
grant select, update, insert, delete on all tables in schema public to svc_taposcope;

create user analytics_reader with password 'xxx'
grant connect on database postgres to analytics_reader
grant usage on schema public to analytics_reader
grant select on all tables in schema public to analytics_reader


