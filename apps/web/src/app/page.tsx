import Link from "next/link";
import { LoginButton } from "@/components/auth/auth-buttons";

// TODO: once multiple HOAs are onboarded, resolve the current HOA from the
// path/subdomain and render its published CMS pages here instead of a
// generic landing page.
export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-semibold">HOA Management</h1>
      <p className="text-gray-600">
        Documents, ARC requests, covenant violations, and community communication in one place.
      </p>
      <LoginButton />
      <Link href="/dashboard" className="text-sm text-blue-600 underline">
        Go to dashboard
      </Link>
    </main>
  );
}
