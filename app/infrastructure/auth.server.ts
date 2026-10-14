import { betterAuth } from "better-auth/minimal";
import type { Auth, BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/auth-schema";

export interface AuthEnvironment {
  DB: D1Database;
  ASSETS_PRIVATE?: R2Bucket;
  APP_ENV: string;
  ADMIN_ORIGIN: string;
  BETTER_AUTH_SECRET?: string;
}
export function createAuth(env: AuthEnvironment): Auth {
  if (
    !env.DB ||
    !env.BETTER_AUTH_SECRET ||
    env.BETTER_AUTH_SECRET.length < 32
  ) {
    throw new Response("Serviço temporariamente indisponível", { status: 503 });
  }
  const origin = new URL(env.ADMIN_ORIGIN);
  if (env.APP_ENV !== "local" && origin.protocol !== "https:") {
    throw new Response("Configuração inválida", { status: 503 });
  }
  const options: BetterAuthOptions = {
    appName: "Eventos 77",
    baseURL: origin.origin,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(drizzle(env.DB, { schema }), {
      provider: "sqlite",
      schema,
    }),
    trustedOrigins: [origin.origin],
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
    },
    session: {
      expiresIn: 60 * 60 * 24,
      updateAge: 60 * 30,
      cookieCache: { enabled: false },
    },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
    advanced: {
      useSecureCookies: origin.protocol === "https:",
      crossSubDomainCookies: { enabled: false },
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
  };
  return betterAuth(options);
}
export async function requireUser(request: Request, env: AuthEnvironment) {
  const data = await createAuth(env).api.getSession({
    headers: request.headers,
  });
  if (!data) throw new Response("Entre para continuar", { status: 401 });
  return data;
}
