import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import clsx from 'clsx';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '온기 장부 시스템',
  description: '온기한식뷔페의 회사별 방문 인원 및 결제 현황을 관리하는 장부 시스템',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={clsx(inter.className, 'bg-slate-100 text-slate-900')}>
        {children}
      </body>
    </html>
  );
}
