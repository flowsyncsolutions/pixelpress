"use client";

import { useRouter } from "next/navigation";
import { THEME } from "@/src/lib/theme";

export default function ExitGate() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push("/")}
      className={`fixed right-4 top-20 z-40 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-[0_10px_22px_rgba(2,6,23,0.4)] transition focus-visible:outline-2 focus-visible:outline-offset-2 ${THEME.brandColors.secondaryButton}`}
    >
      Exit
    </button>
  );
}
