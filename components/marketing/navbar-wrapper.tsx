import { getCurrentUser } from "@/lib/auth/guards";
import { NavbarClient } from "./navbar";

export async function Navbar() {
  const user = await getCurrentUser();
  return <NavbarClient user={user} />;
}