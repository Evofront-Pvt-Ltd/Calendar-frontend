export default function GoogleOAuthPage() {
  return (
    <main className="center-state">
      <span>Google sign-in is currently disabled.</span>
    </main>
  );
}

/*
Google OAuth callback page is parked for future reactivation.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function GoogleOAuthPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Finishing Google sign-in");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setMessage("Google sign-in did not return a token.");
      return;
    }

    api
      .me(token)
      .then((user) => {
        localStorage.setItem("calendar_token", token);
        localStorage.setItem("calendar_user", JSON.stringify(user));
        window.history.replaceState({}, "", "/oauth/google");
        router.replace("/dashboard");
      })
      .catch(() => {
        setMessage("Google sign-in could not be completed.");
      });
  }, [router]);

  return (
    <main className="center-state">
      <Loader2 className="spin" size={28} />
      <span>{message}</span>
    </main>
  );
}
*/
