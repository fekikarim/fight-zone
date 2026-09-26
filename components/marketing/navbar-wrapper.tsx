import { getCurrentUser } from "@/lib/auth/guards";
import { getContentFreshness } from "@/lib/supabase/queries";
import { NavbarClient } from "./navbar";

export async function Navbar() {
  const [user, freshness] = await Promise.all([
    getCurrentUser(),
    getContentFreshness(),
  ]);
  return <NavbarClient user={user} freshness={freshness} />;
}