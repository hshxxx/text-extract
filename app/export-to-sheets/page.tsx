import { AppShell } from "@/components/app-shell";
import { ExportToSheetsClient } from "@/components/export-to-sheets-client";
import { requireUser } from "@/lib/auth";

export default async function ExportToSheetsPage() {
  const { user } = await requireUser();

  return (
    <AppShell activePath="/export-to-sheets" userEmail={user.email}>
      <ExportToSheetsClient />
    </AppShell>
  );
}
