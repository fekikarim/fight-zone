import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { getMemberProfileData } from "@/lib/supabase/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { ProfileForm } from "@/components/member/profile-form";

export const metadata: Metadata = {
  title: "My Profile",
  description: "Manage your Fight Zone member profile.",
};

export default async function MemberProfilePage() {
  const { profile, member } = await getMemberProfileData();

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
          My profile
        </h1>
        <p className="text-sm text-muted">
          Your personal details help Coach Seif tailor every session to you.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-6 p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-border pb-5">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted">Email</p>
              <p className="font-medium">{profile.email}</p>
            </div>
            <Badge variant="neutral">
              <MailCheck className="h-3.5 w-3.5" aria-hidden />
              {member ? "Member" : "Profile pending"}
            </Badge>
          </div>

          <ProfileForm
            fullName={profile.full_name}
            phone={profile.phone}
            member={member}
          />
        </CardContent>
      </Card>
    </Container>
  );
}
