// app/page.tsx
'use client';

import Header from './components/Header';
import MainSection from './components/MainSection';
import NewsSection from './components/NewsSection';
import SpotifySection from './components/SpotifySection';
import Navigation from './components/Navigation';
import VisualEffects from './components/VisualEffects';
import PageNavigator from './components/PageNavigator';

export default function HomePage() {
  return (
    <>
      <VisualEffects />
      <Header />
      <div className="page-transition-overlay" />
      <Navigation />
      <PageNavigator>
        <MainSection />
        <NewsSection />
        <SpotifySection />
      </PageNavigator>
    </>
  );
}