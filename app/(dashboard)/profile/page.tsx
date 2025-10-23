import { getCurrentUser } from "@/lib/session";
import ProfileClientPage from "./ProfileClientPage";
import User from "@/models/User";

async function ProfilePage() {
  const session = await getCurrentUser();
  let displayName: string | null = null;

  if (session?.id) {
    const u = await User.findById(session.id)
      .select({ firstName: 1, lastName: 1 })
      .lean<{ firstName?: string; lastName?: string } | null>();
    if (u) {
      const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
      displayName = full || null;
    }
  }

  const role = session?.role

  return (
    <div>
      <ProfileClientPage name={displayName || ""} role={role || ""} />
    </div>
  );
}

export default ProfilePage;
