import { requireUser } from "@/lib/auth/guards";
import { NotificationsPage } from "@/components/notifications/notifications-page";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata = { title: "Notifications — Fight Zone Admin" };

export default async function AdminNotificationsPage({ searchParams }: Props) {
  await requireUser();
  return <NotificationsPage role="staff" searchParams={await searchParams} />;
}
