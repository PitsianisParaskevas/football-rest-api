export interface Team {
  id?: number; // db id if you store it
  cust_id: number; // external identifier
  name: string;
  slug: string;
  short_name?: string;
  name_code?: string;
  country_name: string;
  country_slug: string;
}
