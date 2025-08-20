import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VLYNK - Professional Collaboration Platform',
  description: 'Connect, collaborate, and create with VLYNK',
};

export default function VlynkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}