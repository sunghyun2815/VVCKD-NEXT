'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/app/components/Header';
import styles from './vlynk.module.css';

export default function VlynkPage() {
  const [currentUser] = useState('GUEST');
  const [userRole] = useState('[GUEST]');

  return (
    <>
      <Header />
      <div className={styles.vlynkContainer}>
        {/* User Info */}
        <div className={styles.userInfo}>
          USER: <span id="currentUser">{currentUser}</span>
          <span className={styles.userRole} id="userRole">{userRole}</span>
        </div>

        {/* Main Content */}
        <div className={styles.mainContainer}>
          <div className={styles.vlynkHeader}>
            <h1>VLYNK NETWORK <span className={styles.cursor}>▌</span></h1>
            <div className={styles.subtitle}>PROFESSIONAL TALENT COLLABORATION PLATFORM</div>
          </div>

          {/* Service Selection */}
          <div className={styles.serviceGrid}>
            <Link href="/vlynk/chatroom" className={styles.serviceCard}>
              <div className={styles.cardIcon}>💬</div>
              <div className={styles.cardTitle}>CHAT ROOMS</div>
              <div className={styles.cardDescription}>
                Real-time collaboration spaces for creative teams
              </div>
              <div className={styles.cardStatus}>ACTIVE</div>
            </Link>

            <Link href="/vlynk/project" className={styles.serviceCard}>
              <div className={styles.cardIcon}>🎵</div>
              <div className={styles.cardTitle}>MUSIC PROJECTS</div>
              <div className={styles.cardDescription}>
                Collaborative music production and sharing platform
              </div>
              <div className={styles.cardStatus}>ACTIVE</div>
            </Link>
          </div>

          {/* Feature Highlights */}
          <div className={styles.featuresSection}>
            <h2>PLATFORM FEATURES</h2>
            <div className={styles.featuresList}>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>🔒</span>
                <span>Secure Real-time Communication</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>🎤</span>
                <span>Voice Message Support</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>📁</span>
                <span>File Sharing & Collaboration</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>🎨</span>
                <span>Project Management Tools</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}