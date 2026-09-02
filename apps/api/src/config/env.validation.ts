import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Microsoft Entra External ID (CIAM)
  ENTRA_TENANT_ID: z.string().min(1, 'ENTRA_TENANT_ID is required'),
  ENTRA_CLIENT_ID: z.string().min(1, 'ENTRA_CLIENT_ID is required'),
  ENTRA_JWKS_URI: z.string().url('ENTRA_JWKS_URI must be a valid URL'),
  ENTRA_ISSUER: z.string().url('ENTRA_ISSUER must be a valid URL'),

  // Azure Blob Storage
  AZURE_STORAGE_ACCOUNT_NAME: z.string().min(1),

  // Azure Communication Services
  ACS_CONNECTION_STRING: z.string().min(1),
  ACS_SENDER_ADDRESS: z.string().min(1),

  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration:\n${parsed.error.toString()}`,
    );
  }
  return parsed.data;
}
