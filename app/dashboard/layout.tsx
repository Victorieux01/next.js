import SideNav from '@/app/ui/dashboard/sidenav';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div id="main-wrapper">
      <SideNav />
      <div id="content">
        {children}
      </div>
    </div>
  );
}
