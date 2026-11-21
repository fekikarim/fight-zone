import type { Metadata } from "next";
import Link from "next/link";
import { getMemberProfileData } from "@/lib/supabase/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { ProfileForm } from "@/components/member/profile-form";
import { AvatarUploader } from "@/components/member/avatar-uploader";
import { avatarUrl } from "@/lib/avatar";

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
          <div className="border-b border-ink-border pb-6 sm:pb-8">
            <AvatarUploader
              userId={profile.id}
              name={profile.full_name}
              email={profile.email}
              url={avatarUrl(profile.avatar_url)}
              status={member ? "Member" : "Profile pending"}
            />
          </div>

          <ProfileForm
            fullName={profile.full_name}
            phone={profile.phone}
            member={member}
          />
        </CardContent>
      </Card>

      <Link href="/member/achievements" className="text-sm font-medium text-primary hover:underline">View your achievements →</Link>
    </Container>
  );
}
