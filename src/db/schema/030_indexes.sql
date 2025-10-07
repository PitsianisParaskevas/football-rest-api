-- Non-unique performance/supporting indexes only.
-- Do NOT add indexes created implicitly by PK/UNIQUE constraints here.

CREATE INDEX idx_inc_match_player   ON public.match_incidents        USING btree (cust_match_id, player_id);
CREATE INDEX idx_match_incidents_match ON public.match_incidents     USING btree (cust_match_id);
CREATE INDEX idx_match_incidents_team  ON public.match_incidents     USING btree (cust_team_id);
CREATE INDEX idx_match_incidents_type  ON public.match_incidents     USING btree (incident_type);

CREATE INDEX idx_matches_match_date ON public.matches                USING btree (match_date DESC);

CREATE INDEX idx_mph_heatmap_gin    ON public.match_player_heatmap   USING gin   (heatmap);
CREATE INDEX idx_mph_match_player   ON public.match_player_heatmap   USING btree (match_cust_id, player_cust_id);

CREATE INDEX idx_mpi_match          ON public.match_player_info      USING btree (match_cust_id);
CREATE INDEX idx_mpi_player         ON public.match_player_info      USING btree (player_cust_id);

CREATE INDEX idx_mps_match_player   ON public.match_player_stats     USING btree (match_cust_id, player_cust_id);
CREATE INDEX idx_mps_stat_key       ON public.match_player_stats     USING btree (stat_key);

CREATE INDEX idx_mrs_match          ON public.match_result_scenarios USING btree (match_cust_id);
CREATE INDEX idx_mrs_scenario       ON public.match_result_scenarios USING btree (scenario_id);
CREATE INDEX idx_mrs_team_cust_id   ON public.match_result_scenarios USING btree (team_cust_id);
CREATE INDEX idx_mrs_team_side      ON public.match_result_scenarios USING btree (team_side);

CREATE INDEX idx_pth_player_from_date ON public.player_team_history  USING btree (player_cust_id, from_date);

-- NOTE: Unique composite (match_cust_id, team_cust_id, stat_key, phase) is enforced by constraint in 040_constraints.sql,
-- which creates an implicit unique index. Do not duplicate it here.
