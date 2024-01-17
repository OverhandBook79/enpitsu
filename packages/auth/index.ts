/* eslint-disable @typescript-eslint/unbound-method */
/* @see https://github.com/nextauthjs/next-auth/pull/8932 */

import Google from "@auth/core/providers/google";
import type { DefaultSession } from "@auth/core/types";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db, eq, schema, tableCreator } from "@enpitsu/db";
import NextAuth from "next-auth";

export type { Session } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "user";
      accountAllowed: Date | null;
    } & DefaultSession["user"];
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: {
    ...DrizzleAdapter(db, tableCreator),
    async getSessionAndUser(data) {
      const sessionAndUsers = await db
        .select({
          session: schema.sessions,
          user: schema.users,
        })
        .from(schema.sessions)
        .where(eq(schema.sessions.sessionToken, data))
        .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId));

      return sessionAndUsers[0] ?? null;
    },
  },
  providers: [Google],
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
        role: user.role,
        accountAllowed: user.accountAllowed ?? null,
      },
    }),
  },
});
