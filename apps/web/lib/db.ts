import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@claims/supabase/types";

// The typed client every query helper accepts. Both the bearer client (route handlers) and the cookie client
// (Server Components) are SupabaseClient<Database>; the helper does not care which, RLS does the rest.
export type Db = SupabaseClient<Database>;
