import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const twoFactorPending = (auth as any)?.twoFactorPending === true;
      const { pathname } = nextUrl;

      const isOnDashboard = pathname.startsWith('/dashboard');
      const isOn2FAVerify = pathname.startsWith('/login/2fa');
      const isOn2FASetup = pathname.startsWith('/register/2fa-setup');
      const isOnRegister = pathname === '/register';
      const isOnLogin = pathname === '/login' || pathname === '/';

      if (isOnDashboard) {
        if (!isLoggedIn) return Response.redirect(new URL('/login', nextUrl));
        if (twoFactorPending) return Response.redirect(new URL('/login/2fa', nextUrl));
        return true;
      }

      if (isOn2FAVerify) {
        if (!isLoggedIn) return Response.redirect(new URL('/login', nextUrl));
        if (!twoFactorPending) return Response.redirect(new URL('/dashboard', nextUrl));
        return true;
      }

      if (isOn2FASetup) {
        if (!isLoggedIn) return Response.redirect(new URL('/login', nextUrl));
        if (twoFactorPending) return Response.redirect(new URL('/login/2fa', nextUrl));
        return true;
      }

      if ((isOnLogin || isOnRegister) && isLoggedIn) {
        if (twoFactorPending) return Response.redirect(new URL('/login/2fa', nextUrl));
        return Response.redirect(new URL('/dashboard', nextUrl));
      }

      return true;
    },

    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id    = user.id;
        token.email = user.email;
        token.twoFactorPending = user.twoFactorPending ?? false;
      }
      if (trigger === 'update' && session !== null && session !== undefined) {
        if ((session as any).twoFactorPending !== undefined) {
          token.twoFactorPending = (session as any).twoFactorPending;
        }
      }
      return token;
    },

    session({ session, token }) {
      (session as any).twoFactorPending = token.twoFactorPending ?? false;
      if (session.user) {
        (session.user as any).id    = token.id    as string;
        session.user.email          = (token.email as string) ?? session.user.email;
        (session.user as any).twoFactorPending = token.twoFactorPending ?? false;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
