import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login" },
  providers: [Credentials({
    credentials: { email: {}, password: {} },
    async authorize(input) {
      const parsed = z.object({ email:z.string().email(),password:z.string().min(1) }).safeParse(input);
      if (!parsed.success) return null;
      const user = await db.user.findUnique({ where:{email:parsed.data.email.toLowerCase()} });
      if (!user || !user.active || !(await bcrypt.compare(parsed.data.password,user.passwordHash))) return null;
      return {id:user.id,email:user.email,name:user.name,role:user.role};
    }
  })],
  callbacks: {
    async jwt({token,user}) { if (user) token.userId=user.id; return token; },
    async session({session,token}) { if (session.user) session.user.id=String(token.userId ?? token.sub); return session; }
  }
});
