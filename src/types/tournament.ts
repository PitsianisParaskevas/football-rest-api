export interface Tournament {
  id: number; // db primary key (if needed)
  cust_id: number; // external identifier
  name: string;
  slug: string;
  country_name: string;
  country_slug: string;
  rounds: number;
  total_teams: number;
}
