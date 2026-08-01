import { listSecretNames } from "@/lib/kernel/secrets";
import { SecretsManager } from "./SecretsManager";

export default async function SecretsPage() {
  const secrets = await listSecretNames();
  return <SecretsManager initialSecrets={secrets} />;
}
