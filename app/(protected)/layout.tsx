import { SessionShell } from "@/components/session-shell";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <SessionShell>{children}</SessionShell>;
}
