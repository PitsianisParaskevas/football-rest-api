-- Primary keys
ALTER TABLE ONLY public.match_incidents          ADD CONSTRAINT match_incidents_pkey            PRIMARY KEY (id);
ALTER TABLE ONLY public.match_player_heatmap     ADD CONSTRAINT match_player_heatmap_pkey       PRIMARY KEY (id);
ALTER TABLE ONLY public.match_player_info        ADD CONSTRAINT match_player_info_pkey          PRIMARY KEY (id);
ALTER TABLE ONLY public.match_player_shot        ADD CONSTRAINT match_player_shot_pkey          PRIMARY KEY (id);
ALTER TABLE ONLY public.match_player_stats       ADD CONSTRAINT match_player_stats_pkey         PRIMARY KEY (id);
ALTER TABLE ONLY public.match_result             ADD CONSTRAINT match_result_pkey               PRIMARY KEY (match_cust_id);
ALTER TABLE ONLY public.match_result_scenarios   ADD CONSTRAINT match_result_scenarios_pkey     PRIMARY KEY (id);
ALTER TABLE ONLY public.match_stats              ADD CONSTRAINT match_stats_pkey                PRIMARY KEY (id);
ALTER TABLE ONLY public.matches                  ADD CONSTRAINT matches_pkey                    PRIMARY KEY (match_id);
ALTER TABLE ONLY public.metadata_statistics      ADD CONSTRAINT metadata_statistics_pkey        PRIMARY KEY (id);
ALTER TABLE ONLY public.player_market_value      ADD CONSTRAINT player_market_value_pkey        PRIMARY KEY (id);
ALTER TABLE ONLY public.player_team_history      ADD CONSTRAINT player_team_history_pkey        PRIMARY KEY (id);
ALTER TABLE ONLY public.players                  ADD CONSTRAINT players_pkey                    PRIMARY KEY (player_id);
ALTER TABLE ONLY public.scenarios                ADD CONSTRAINT scenarios_pkey                  PRIMARY KEY (scenario_id);
ALTER TABLE ONLY public.teams                    ADD CONSTRAINT teams_pkey                      PRIMARY KEY (id);
ALTER TABLE ONLY public.tournament_team          ADD CONSTRAINT tournament_team_pkey            PRIMARY KEY (tournament_cust_id, team_cust_id);
ALTER TABLE ONLY public.tournaments              ADD CONSTRAINT tournaments_pkey                PRIMARY KEY (id);

-- Unique constraints
ALTER TABLE ONLY public.match_incidents          ADD CONSTRAINT match_incidents_cust_incident_id_key UNIQUE (cust_incident_id);
ALTER TABLE ONLY public.match_player_heatmap     ADD CONSTRAINT match_player_heatmap_match_cust_id_player_cust_id_key UNIQUE (match_cust_id, player_cust_id);
ALTER TABLE ONLY public.match_player_info        ADD CONSTRAINT match_player_info_match_cust_id_player_cust_id_key    UNIQUE (match_cust_id, player_cust_id);
ALTER TABLE ONLY public.match_player_shot        ADD CONSTRAINT match_player_shot_shot_id_key                           UNIQUE (shot_id);
ALTER TABLE ONLY public.match_player_stats       ADD CONSTRAINT match_player_stats_match_cust_id_player_cust_id_stat_key_key UNIQUE (match_cust_id, player_cust_id, stat_key);
ALTER TABLE ONLY public.match_result_scenarios   ADD CONSTRAINT match_result_scenarios_match_cust_id_scenario_id_team_side_key UNIQUE (match_cust_id, scenario_id, team_side);
ALTER TABLE ONLY public.match_stats              ADD CONSTRAINT match_stats_match_cust_id_team_cust_id_stat_key_phase_key      UNIQUE (match_cust_id, team_cust_id, stat_key, phase);
ALTER TABLE ONLY public.matches                  ADD CONSTRAINT matches_cust_id_key                                      UNIQUE (cust_id);
ALTER TABLE ONLY public.metadata_statistics      ADD CONSTRAINT metadata_statistics_key_key                               UNIQUE (key);
ALTER TABLE ONLY public.player_market_value      ADD CONSTRAINT player_market_value_player_cust_id_value_date_source_key UNIQUE (player_cust_id, value_date, source);
ALTER TABLE ONLY public.player_team_history      ADD CONSTRAINT player_team_history_player_cust_id_team_cust_id_from_date_key UNIQUE (player_cust_id, team_cust_id, from_date);
ALTER TABLE ONLY public.players                  ADD CONSTRAINT players_cust_id_unique                                    UNIQUE (cust_id);
ALTER TABLE ONLY public.players                  ADD CONSTRAINT players_slug_unique                                       UNIQUE (slug);
ALTER TABLE ONLY public.teams                    ADD CONSTRAINT teams_cust_id_key                                         UNIQUE (cust_id);
ALTER TABLE ONLY public.tournaments              ADD CONSTRAINT tournaments_cust_id_key                                   UNIQUE (cust_id);

-- Foreign keys (all ON DELETE CASCADE exactly as in dump)
ALTER TABLE ONLY public.match_incidents
  ADD CONSTRAINT match_incidents_cust_match_id_fkey
  FOREIGN KEY (cust_match_id) REFERENCES public.matches(cust_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.match_player_heatmap
  ADD CONSTRAINT match_player_heatmap_match_cust_id_fkey
  FOREIGN KEY (match_cust_id) REFERENCES public.matches(cust_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.match_player_info
  ADD CONSTRAINT match_player_info_match_cust_id_fkey
  FOREIGN KEY (match_cust_id) REFERENCES public.matches(cust_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.match_player_shot
  ADD CONSTRAINT match_player_shot_match_cust_id_fkey
  FOREIGN KEY (match_cust_id) REFERENCES public.matches(cust_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.match_player_stats
  ADD CONSTRAINT match_player_stats_match_cust_id_fkey
  FOREIGN KEY (match_cust_id) REFERENCES public.matches(cust_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.match_result
  ADD CONSTRAINT match_result_match_cust_id_fkey
  FOREIGN KEY (match_cust_id) REFERENCES public.matches(cust_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.match_result_scenarios
  ADD CONSTRAINT match_result_scenarios_match_cust_id_fkey
  FOREIGN KEY (match_cust_id) REFERENCES public.matches(cust_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.match_result_scenarios
  ADD CONSTRAINT match_result_scenarios_scenario_id_fkey
  FOREIGN KEY (scenario_id) REFERENCES public.scenarios(scenario_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.match_result_scenarios
  ADD CONSTRAINT match_result_scenarios_team_cust_id_fkey
  FOREIGN KEY (team_cust_id) REFERENCES public.teams(cust_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.match_stats
  ADD CONSTRAINT match_stats_match_cust_id_fkey
  FOREIGN KEY (match_cust_id) REFERENCES public.matches(cust_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.match_stats
  ADD CONSTRAINT match_stats_team_cust_id_fkey
  FOREIGN KEY (team_cust_id) REFERENCES public.teams(cust_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.matches
  ADD CONSTRAINT matches_away_team_id_fkey
  FOREIGN KEY (away_team_id) REFERENCES public.teams(cust_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.matches
  ADD CONSTRAINT matches_home_team_id_fkey
  FOREIGN KEY (home_team_id) REFERENCES public.teams(cust_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.matches
  ADD CONSTRAINT matches_tournament_id_fkey
  FOREIGN KEY (tournament_id) REFERENCES public.tournaments(cust_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.player_market_value
  ADD CONSTRAINT player_market_value_player_cust_id_fkey
  FOREIGN KEY (player_cust_id) REFERENCES public.players(cust_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.player_team_history
  ADD CONSTRAINT player_team_history_player_cust_id_fkey
  FOREIGN KEY (player_cust_id) REFERENCES public.players(cust_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tournament_team
  ADD CONSTRAINT tournament_team_team_cust_id_fkey
  FOREIGN KEY (team_cust_id) REFERENCES public.teams(cust_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tournament_team
  ADD CONSTRAINT tournament_team_tournament_cust_id_fkey
  FOREIGN KEY (tournament_cust_id) REFERENCES public.tournaments(cust_id) ON DELETE CASCADE;
