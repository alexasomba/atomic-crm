import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { drizzle } from "drizzle-orm/d1";
import * as authSchema from "./db/auth-schema.js";
import * as schema from "./db/schema.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email.js";

type AuthEnvironment = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  APP_ORIGIN: string;
  EMAIL: SendEmail;
  EMAIL_FROM: string;
};

const authOptions = {
  basePath: "/api/auth",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  advanced: {
    useSecureCookies: true,
  },
  trustedOrigins: ["http://localhost:5173"],
};

const dbSchema = { ...schema, ...authSchema };

/**
 * Creates a request-scoped Better Auth instance for a D1 binding.
 * The CLI-facing export below intentionally uses the same adapter shape so
 * `auth generate` can inspect the configuration without a live Cloudflare
 * binding.
 */
export const createAuth = (env: AuthEnvironment) =>
  betterAuth({
    ...authOptions,
    baseURL: env.APP_ORIGIN,
    secret: env.BETTER_AUTH_SECRET,
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendVerificationEmail(env, user.email, url);
      },
    },
    emailAndPassword: {
      ...authOptions.emailAndPassword,
      sendResetPassword: async ({ user, url }) => {
        await sendPasswordResetEmail(env, user.email, url);
      },
    },
    database: drizzleAdapter(drizzle(env.DB), {
      provider: "sqlite",
      schema: dbSchema,
    }),
  });

const cliDatabase = drizzle({} as D1Database);

export const auth = betterAuth({
  ...authOptions,
  database: drizzleAdapter(cliDatabase, {
    provider: "sqlite",
    schema: dbSchema,
  }),
});
