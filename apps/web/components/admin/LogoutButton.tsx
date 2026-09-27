"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { LogoutIcon } from "@/components/ui/Icons";

export function LogoutButton() {
  const [confirming, setConfirming] = useState(false);

  async function signOut() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (response.redirected) {
      window.location.href = response.url;
      return;
    }
    window.location.href = "/login";
  }

  return (
    <>
      <Button variant="outlined" size="sm" icon={<LogoutIcon size={16} />} onClick={() => setConfirming(true)}>
        Sign out
      </Button>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Sign out of the workspace?"
        confirmLabel="Sign out"
        tone="default"
        onConfirm={() => {
          setConfirming(false);
          void signOut();
        }}
      >
        <p style={{ margin: 0 }}>
          You will need your email and password to sign back in. Any unsaved draft changes stay in
          the database, so nothing is lost.
        </p>
      </Dialog>
    </>
  );
}
