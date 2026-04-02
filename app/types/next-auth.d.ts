import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    twoFactorPending: boolean;
    user: {
      id: string;
      twoFactorPending: boolean;
    } & DefaultSession['user'];
  }
  interface User {
    twoFactorPending?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    twoFactorPending?: boolean;
  }
}
