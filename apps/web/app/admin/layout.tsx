import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <Link className="brand" href="/admin">Siyana Maths</Link>
          <p className="admin-kicker">Tutor workspace</p>
        </div>
        <div className="admin-header-actions">
          <span className="user-chip">{user.email}</span>
          <form action="/api/auth/logout" method="post">
            <button className="button button-quiet" type="submit">Sign out</button>
          </form>
        </div>
      </header>
      <div className="admin-body">
        <aside className="admin-sidebar">
          <nav aria-label="Admin navigation">
            <Link className="admin-nav-link" href="/admin">Overview</Link>
            <Link className="admin-nav-link" href="/admin/papers/new">New paper</Link>
          </nav>
        </aside>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
