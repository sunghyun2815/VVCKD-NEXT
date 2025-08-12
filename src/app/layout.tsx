import '@/styles/reset.css';
import '@/styles/main.css';
import '@/styles/news.css';
import '@/styles/terminal.css';
import '@/styles/navigation.css';
import '@/styles/spotify.css';
import '../styles/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VVCKD',
  description: 'AI Persona Vocal Generator Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
