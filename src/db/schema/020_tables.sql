-- Tables + sequences + defaults. No data, no sequence setval.

-- match_incidents
CREATE TABLE public.match_incidents (
    id bigint NOT NULL,
    cust_incident_id bigint,
    cust_match_id bigint NOT NULL,
    cust_team_id bigint,
    incident_type text NOT NULL,
    type text,
    incident_class text,
    description text,
    team_side text,
    "time" integer,
    added_time integer,
    period text,
    player_id bigint,
    assist_id bigint,
    player_in_id bigint,
    player_out_id bigint,
    goalkeeper_id bigint,
    home_score integer,
    away_score integer,
    goal_type text,
    body_part text,
    details_json jsonb,
    CONSTRAINT match_incidents_team_side_check CHECK (team_side = ANY (ARRAY['home','away']))
);

CREATE SEQUENCE public.match_incidents_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.match_incidents_id_seq OWNED BY public.match_incidents.id;
ALTER TABLE ONLY public.match_incidents ALTER COLUMN id SET DEFAULT nextval('public.match_incidents_id_seq'::regclass);

-- match_player_heatmap
CREATE TABLE public.match_player_heatmap (
    id bigint NOT NULL,
    match_cust_id bigint NOT NULL,
    player_cust_id bigint NOT NULL,
    heatmap jsonb NOT NULL
);

CREATE SEQUENCE public.match_player_heatmap_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.match_player_heatmap_id_seq OWNED BY public.match_player_heatmap.id;
ALTER TABLE ONLY public.match_player_heatmap ALTER COLUMN id SET DEFAULT nextval('public.match_player_heatmap_id_seq'::regclass);

-- match_player_info
CREATE TABLE public.match_player_info (
    id bigint NOT NULL,
    match_cust_id bigint NOT NULL,
    player_cust_id bigint NOT NULL,
    starter boolean,
    minutes_played integer,
    substitute boolean DEFAULT false,
    rating numeric
);

CREATE SEQUENCE public.match_player_info_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.match_player_info_id_seq OWNED BY public.match_player_info.id;
ALTER TABLE ONLY public.match_player_info ALTER COLUMN id SET DEFAULT nextval('public.match_player_info_id_seq'::regclass);

-- match_player_shot
CREATE TABLE public.match_player_shot (
    id bigint NOT NULL,
    shot_id bigint NOT NULL,
    match_cust_id bigint NOT NULL,
    player_cust_id bigint NOT NULL,
    "time" integer,
    shot_type text,
    situation text,
    body_part text,
    xg numeric,
    xgot numeric,
    details_json jsonb
);

CREATE SEQUENCE public.match_player_shot_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.match_player_shot_id_seq OWNED BY public.match_player_shot.id;
ALTER TABLE ONLY public.match_player_shot ALTER COLUMN id SET DEFAULT nextval('public.match_player_shot_id_seq'::regclass);

-- Preserve identity on shot_id as in dump
ALTER TABLE public.match_player_shot ALTER COLUMN shot_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.match_player_shot_shot_id_seq
    START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1
);

-- match_player_stats
CREATE TABLE public.match_player_stats (
    id bigint NOT NULL,
    match_cust_id bigint NOT NULL,
    player_cust_id bigint NOT NULL,
    stat_key text NOT NULL,
    stat_value numeric
);

CREATE SEQUENCE public.match_player_stats_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.match_player_stats_id_seq OWNED BY public.match_player_stats.id;
ALTER TABLE ONLY public.match_player_stats ALTER COLUMN id SET DEFAULT nextval('public.match_player_stats_id_seq'::regclass);

-- match_result
CREATE TABLE public.match_result (
    match_cust_id bigint NOT NULL,
    home_score_ft integer NOT NULL,
    home_score_ht integer,
    home_formation text,
    home_result text NOT NULL,
    away_score_ft integer NOT NULL,
    away_score_ht integer,
    away_formation text,
    away_result text NOT NULL,
    CONSTRAINT match_result_away_result_check CHECK (away_result = ANY (ARRAY['win','draw','loss'])),
    CONSTRAINT match_result_home_result_check CHECK (home_result = ANY (ARRAY['win','draw','loss']))
);

-- match_result_scenarios
CREATE TABLE public.match_result_scenarios (
    id bigint NOT NULL,
    match_cust_id bigint NOT NULL,
    team_cust_id bigint NOT NULL,
    team_side text NOT NULL,
    scenario_id integer NOT NULL,
    CONSTRAINT match_result_scenarios_team_side_check CHECK (team_side = ANY (ARRAY['home','away']))
);

CREATE SEQUENCE public.match_result_scenarios_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.match_result_scenarios_id_seq OWNED BY public.match_result_scenarios.id;
ALTER TABLE ONLY public.match_result_scenarios ALTER COLUMN id SET DEFAULT nextval('public.match_result_scenarios_id_seq'::regclass);

-- match_stats
CREATE TABLE public.match_stats (
    id bigint NOT NULL,
    match_cust_id bigint NOT NULL,
    team_cust_id bigint NOT NULL,
    team_side text NOT NULL,
    stat_key text NOT NULL,
    phase text NOT NULL,
    value double precision,
    display text,
    total double precision,
    CONSTRAINT match_stats_phase_check CHECK (phase = ANY (ARRAY['ALL','1ST','2ND'])),
    CONSTRAINT match_stats_team_side_check CHECK (team_side = ANY (ARRAY['home','away']))
);

CREATE SEQUENCE public.match_stats_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.match_stats_id_seq OWNED BY public.match_stats.id;
ALTER TABLE ONLY public.match_stats ALTER COLUMN id SET DEFAULT nextval('public.match_stats_id_seq'::regclass);

-- matches
CREATE TABLE public.matches (
    match_id bigint NOT NULL,
    tournament_id bigint NOT NULL,
    cust_id bigint NOT NULL,
    round integer,
    match_date timestamptz,
    home_team_id bigint NOT NULL,
    away_team_id bigint NOT NULL
);

CREATE SEQUENCE public.matches_match_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.matches_match_id_seq OWNED BY public.matches.match_id;
ALTER TABLE ONLY public.matches ALTER COLUMN match_id SET DEFAULT nextval('public.matches_match_id_seq'::regclass);

-- metadata_statistics
CREATE TABLE public.metadata_statistics (
    id bigint NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    "group" text NOT NULL,
    description text
);

CREATE SEQUENCE public.metadata_statistics_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.metadata_statistics_id_seq OWNED BY public.metadata_statistics.id;
ALTER TABLE ONLY public.metadata_statistics ALTER COLUMN id SET DEFAULT nextval('public.metadata_statistics_id_seq'::regclass);

-- player_market_value
CREATE TABLE public.player_market_value (
    id bigint NOT NULL,
    player_cust_id bigint NOT NULL,
    market_value bigint NOT NULL,
    market_currency varchar(10) NOT NULL,
    value_date date NOT NULL,
    source text NOT NULL
);

CREATE SEQUENCE public.player_market_value_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.player_market_value_id_seq OWNED BY public.player_market_value.id;
ALTER TABLE ONLY public.player_market_value ALTER COLUMN id SET DEFAULT nextval('public.player_market_value_id_seq'::regclass);

-- player_team_history
CREATE TABLE public.player_team_history (
    id bigint NOT NULL,
    player_cust_id bigint NOT NULL,
    team_cust_id bigint NOT NULL,
    from_date date NOT NULL,
    to_date date,
    shirt_number integer
);

CREATE SEQUENCE public.player_team_history_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.player_team_history_id_seq OWNED BY public.player_team_history.id;
ALTER TABLE ONLY public.player_team_history ALTER COLUMN id SET DEFAULT nextval('public.player_team_history_id_seq'::regclass);

-- players
CREATE TABLE public.players (
    player_id bigint NOT NULL,
    cust_id bigint NOT NULL,
    name text NOT NULL,
    slug text,
    short_name text,
    "position" varchar(10),
    height integer,
    country_code char(2),
    country_name text,
    birthdate timestamp without time zone,
    current_team_cust_id bigint,
    shirt_number integer,
    updated_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.players_player_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.players_player_id_seq OWNED BY public.players.player_id;
ALTER TABLE ONLY public.players ALTER COLUMN player_id SET DEFAULT nextval('public.players_player_id_seq'::regclass);

-- scenarios
CREATE TABLE public.scenarios (
    scenario_id integer NOT NULL,
    name text NOT NULL,
    team text NOT NULL,
    category text NOT NULL,
    script text NOT NULL
);

CREATE SEQUENCE public.scenarios_scenario_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.scenarios_scenario_id_seq OWNED BY public.scenarios.scenario_id;
ALTER TABLE ONLY public.scenarios ALTER COLUMN scenario_id SET DEFAULT nextval('public.scenarios_scenario_id_seq'::regclass);

-- teams
CREATE TABLE public.teams (
    id bigint NOT NULL,
    cust_id bigint NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    short_name text,
    name_code text,
    country_name text,
    country_slug text
);

CREATE SEQUENCE public.teams_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.teams_id_seq OWNED BY public.teams.id;
ALTER TABLE ONLY public.teams ALTER COLUMN id SET DEFAULT nextval('public.teams_id_seq'::regclass);

-- tournament_team
CREATE TABLE public.tournament_team (
    tournament_cust_id bigint NOT NULL,
    team_cust_id bigint NOT NULL
);

-- tournaments
CREATE TABLE public.tournaments (
    id bigint NOT NULL,
    cust_id bigint NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    country_name text,
    country_slug text,
    rounds integer,
    total_teams integer
);

CREATE SEQUENCE public.tournaments_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.tournaments_id_seq OWNED BY public.tournaments.id;
ALTER TABLE ONLY public.tournaments ALTER COLUMN id SET DEFAULT nextval('public.tournaments_id_seq'::regclass);
