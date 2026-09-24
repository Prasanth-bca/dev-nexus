import { listSecretNames } from "@/lib/kernel/secrets";
import { SecretsManager } from "./SecretsManager";

// Force dynamic rendering — this page reads from MongoDB
export const dynamic = 'force-dynamic';

export default async function SecretsPage() {
  const secrets = await listSecretNames();
  return <SecretsManager initialSecrets={secrets} />;
}
