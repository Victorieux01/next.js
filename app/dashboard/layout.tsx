import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SideNav from '@/app/ui/dashboard/sidenav';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) redirect('/login');
  if ((session as any).twoFactorPending) redirect('/login/2fa');

  const user = {
    name: session.user.name ?? '',
    email: session.user.email ?? '',
  };

  return (
    <div id="main-wrapper">
      <SideNav user={user} />
      <div id="content">
        {children}
      </div>
    </div>
  );
}
