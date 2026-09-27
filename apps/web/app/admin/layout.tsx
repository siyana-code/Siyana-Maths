import Link from "next/link";
import { redirect } from "next/navigation";

import { GridIcon, LogoutIcon, PersonIcon, PlusIcon } from "@/components/ui/Icons";
import { Brand } from "@/components/ui/Primitives";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { createClient } from "@/lib/supabase/server";

const navItems = [
  { href: "/admin", label: "Overview", icon: <GridIcon size={20} /> },
  { href: "/admin/papers/new", label: "New paper", icon: <PlusIcon size={20} /> },
];

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  return (
    <div className="admin-shell">
      <header className="top-app-bar top-app-bar--elevated">
        <div className="row" style={{ gap: 24 }}>
          <Brand href="/admin" subtitle="Tutor workspace" />
          <nav className="row" aria-label="Utility">
            <Link className="btn btn--text" href="/" style={{ textDecoration: "none" }}>
              View site
            </Link>
          </nav>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <span className="user-chip">
            <PersonIcon size={16} />
            {user.email}
          </span>
          <LogoutButton />
        </div>
      </header>

      <div className="admin-body">
        <aside className="nav-rail">
          <p className="nav-group-label">Workspace</p>
          {navItems.map((item) => (
            <Link className="nav-item" href={item.href} key={item.href}>
              {item.icon}
              {item.label}
            </Link>
          ))}
          <div style={{ height: 16 }} />
          <p className="nav-group-label">Account</p>
          <span className="nav-item" aria-disabled="true" style={{ opacity: 0.6, cursor: "default" }}>
            <LogoutIcon size={20} />
            Sign out below
          </span>
        </aside>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
