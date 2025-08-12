'use client';

import Link from 'next/link';
import '../../styles/main.css';

export default function Header() {
  const handleLogoClick = () => {
    if (typeof window.navigateToPage === 'function') {
      window.navigateToPage(0);
    }
  };

  return (
    <div className="menu-bar">
      <div className="menu-container">
        <div className="menu-logo" onClick={handleLogoClick}>VVCKD</div>
        <div className="menu-items">
          <Link href="/vcktor" className="menu-item">
            VCKTOR
          </Link>
          <Link href="/vlyssa" className="menu-item">
            VLYSSA
            <div className="loading-indicator"></div>
          </Link>
          <Link href="/vlynk" className="menu-item">
            VLYNK
            <div className="loading-indicator"></div>
          </Link>
        </div>
      </div>
    </div>
  );
}
