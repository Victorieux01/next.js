import '@/app/ui/global.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: { template: '%s | Coredon', default: 'Coredon Dashboard' },
  description: 'Coredon — Invoice and project management dashboard',
};

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={jakarta.className}>{children}</body>
    </html>
  );
}
