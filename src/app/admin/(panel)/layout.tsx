import { requireAdmin } from "@/lib/auth/server";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <AdminNav username={admin.username} />
      <div className="min-w-0 px-4 pb-20 pt-6 sm:px-6 lg:px-10 lg:pt-10">{children}</div>
    </div>
  );
}
