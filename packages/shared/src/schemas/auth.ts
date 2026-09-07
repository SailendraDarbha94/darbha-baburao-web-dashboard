import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "../constants";

/**
 * Password rule for sign-up and password reset. Length only, mirroring Supabase Auth's "Minimum password
 * length" (docs/PLAN.md §5 step 3): the dashboard's optional character-class requirement is left off there
 * too. Supabase re-checks server-side; this just gives the mobile forms a message before the request.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`);
