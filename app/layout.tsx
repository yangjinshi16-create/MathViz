import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/hooks/use-i18n';

export const metadata: Metadata = {
  title: 'zju_math_helper',
  description: 'Generate interactive animated HTML pages from a concept.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
