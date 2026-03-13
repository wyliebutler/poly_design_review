import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Admin Access",
      credentials: {
        password: { label: "Portal Key", type: "password" },
      },
      async authorize(credentials) {
        // Simplified for V2: "Ler542111!!" as requested for the server
        // Verify credentials securely via environment variables
        const adminPass = process.env.ADMIN_PASSWORD || "admin";
        if (credentials?.password === adminPass) {
          return { 
            id: "admin", 
            name: "Administrator", 
            email: "admin@portal.local", 
            role: "ADMIN" 
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).role = token.role;
      return session;
    },
  },
});
