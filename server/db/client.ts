import { drizzle } from "drizzle-orm/d1";
import * as authSchema from "./auth-schema.js";
import * as schema from "./schema.js";

export const dbSchema = { ...schema, ...authSchema };

export const createDb = (database: D1Database) => drizzle(database);
