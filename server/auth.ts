import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { drizzle } from "drizzle-orm/d1";
import * as authSchema from "./db/auth-schema.js";
import * as schema from "./db/schema.js";
import { sales } from "./db/schema.js";
import { createDb } from "./db/client.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email.js";

type AuthEnvironment = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  APP_ORIGIN: string;
  ENVIRONMENT?: string;
  BETTER_AUTH_TRUSTED_ORIGINS?: string;
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
    advanced: {
      useSecureCookies:
        env.ENVIRONMENT === "production" ||
        env.APP_ORIGIN.startsWith("https://"),
    },
    trustedOrigins: [
      env.APP_ORIGIN,
      ...(env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ].filter((origin, index, origins) => origins.indexOf(origin) === index),
    emailVerification: {
      sendOnSignUp: true,
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
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const [firstName, ...lastNameParts] = user.name.trim().split(/\s+/);
            await createDb(env.DB)
              .insert(sales)
              .values({
                userId: user.id,
                firstName: firstName || user.email,
                lastName: lastNameParts.join(" ") || "User",
                email: user.email,
                role: "user",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })
              .run();
          },
        },
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
  baseURL: "http://localhost:5173",
  database: drizzleAdapter(cliDatabase, {
    provider: "sqlite",
    schema: dbSchema,
  }),
});
