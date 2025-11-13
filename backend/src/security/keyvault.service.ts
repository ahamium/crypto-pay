import { Injectable, Logger } from '@nestjs/common';
import { SecretClient } from '@azure/keyvault-secrets';
import { ClientSecretCredential } from '@azure/identity';

@Injectable()
export class KeyVaultService {
  private client: SecretClient | null = null;
  private readonly log = new Logger(KeyVaultService.name);

  constructor() {
    const url = process.env.AZURE_KEY_VAULT_URL;
    if (!url) {
      this.log.warn('AZURE_KEY_VAULT_URL not set, fallback to .env secrets');
      return;
    }

    const credential = new ClientSecretCredential(
      process.env.AZURE_TENANT_ID!,
      process.env.AZURE_CLIENT_ID!,
      process.env.AZURE_CLIENT_SECRET!,
    );

    this.client = new SecretClient(url, credential);
  }

  async getSecret(name: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      const secret = await this.client.getSecret(name);
      return secret.value ?? null;
    } catch (err) {
      this.log.warn(`Failed to get secret ${name}: ${String(err)}`);
      return null;
    }
  }
}
