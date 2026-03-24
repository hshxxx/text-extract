import { AppShell } from "@/components/app-shell";
import { QuantityTemplatesClient } from "@/components/quantity-templates-client";
import { requireUser } from "@/lib/auth";

export default async function QuantityTemplatesPage() {
  const { user } = await requireUser();

  return (
    <AppShell activePath="/settings/quantity-templates" userEmail={user.email}>
      <QuantityTemplatesClient />
    </AppShell>
  );
}
