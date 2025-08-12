'use client';

import React, { useEffect, useState, useRef } from 'react';
import '@/styles/news.css';

const GITHUB_USERNAME = 'sunghyun2815';
const REPO_NAME = 'music-news-automation';
const API_URL = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/music_news.json`;

type NewsArticle = {
  title: string;
  summary: string;
  url: string;
  published_date: string;
  category: string;
  membersOnly?: boolean;
};

const CATEGORIES = [
  { key: 'all', label: 'ALL' },
  { key: 'news', label: 'NEWS' },
  { key: 'interview', label: 'INTERVIEW' },
  { key: 'report', label: 'REPORT' },
  { key: 'members', label: 'MEMBERS ONLY' },
];

export default function NewsSection() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const newsMainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error('뉴스를 불러오지 못했습니다');
        const data = await res.json();
        let allNews: NewsArticle[] = [];
        Object.values(data.news).forEach((arr: any) => allNews.push(...arr));
        allNews.sort((a, b) =>
          Date.parse(b.published_date || '') - Date.parse(a.published_date || '')
        );
        setNews(allNews);
      } catch (e: any) {
        setError('뉴스 로딩 실패');
      }
      setLoading(false);
    })();
  }, []);

  const filterNews = news.filter((item) => {
    if (category === 'all') return true;
    if (category === 'members') return !!item.membersOnly;
    return item.category?.toLowerCase() === category;
  });
  const handleScroll = () => {
    const el = newsMainRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
      // 만약 자동전환 원할 시 사용
      // 예시: 스포티파이로 자동 넘기기
      // if (typeof window !== 'undefined' && typeof window.navigateToPage === 'function') {
      //   window.navigateToPage(2);
      // }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = newsMainRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;

    const atTop = scrollTop <= 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

    if (
      (e.deltaY < 0 && !atTop) ||
      (e.deltaY > 0 && !atBottom)  
    ) {
      e.stopPropagation();
      // (e.preventDefault(); 필요시만)
      el.scrollTop += e.deltaY;
    }
    // else: 
  };

  return (
    <section
      id="page-1"
      style={{
        height: '100vh',
        boxSizing: 'border-box',
        paddingTop: 60,
        background: '#101010'
      }}
    >
      <div
        className="news-split-layout"
        style={{
          display: 'flex',
          width: '100%',
          height: 'calc(100vh - 60px)',
          minHeight: 0
        }}
      >
        <nav className="category-sidebar">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              className={`category-item${category === cat.key ? ' active' : ''}`}
              onClick={() => {
                if (cat.key === 'members') setShowModal(true);
                else setCategory(cat.key);
              }}
            >
              {cat.label}
            </div>
          ))}
        </nav>
        <div
          className="news-main-area"
          ref={newsMainRef}
          tabIndex={-1}
          onScroll={handleScroll}
          onWheel={handleWheel}
          style={{
            flex: 1,
            minWidth: 0,
            height: '100%',
            maxHeight: '100%',
            overflowY: 'auto'
          }}
        >
          <div className="news-grid">
            {loading && <div className="news-message">LOADING...</div>}
            {error && <div className="news-message">{error}</div>}
            {!loading && !error && filterNews.length === 0 && (
              <div className="news-message">
                NO CONTENT AVAILABLE IN THIS CATEGORY
              </div>
            )}
            {!loading && !error && filterNews.map((article, idx) => {
              const date = new Date(article.published_date);
              const dateStr = isNaN(date.getTime()) ? 'UNKNOWN' :
                `${date.toLocaleString('default', { month: 'long' }).toUpperCase()} ${date.getDate()}, ${date.getFullYear()}`;
              return (
                <div className="news-item" key={idx}
                  data-category={article.category?.toLowerCase()}
                  data-url={article.url || '#'}
                  onClick={() => article.url && window.open(article.url, '_blank')}
                >
                  <div className="news-category-tag"
                    title="닫기"
                    onClick={e => {
                      e.stopPropagation();
                      (e.currentTarget.parentNode as HTMLElement).style.display = 'none';
                    }}
                  >X</div>
                  <div className="news-date">{dateStr}</div>
                  <div className="news-title">
                    {(article.title || '').toUpperCase()}
                  </div>
                  <div className="news-content">
                    <p>
                      {(article.summary || '').toUpperCase()}
                    </p>
                    {article.membersOnly && (
                      <button
                        className="access-button"
                        onClick={e => {
                          e.stopPropagation();
                          setShowModal(true);
                        }}
                      >
                        ACCESS CONTENT
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {showModal && (
        <div className="membership-modal">
          <div className="membership-modal-box">
            <div style={{ marginBottom: 20, fontSize: 18 }}>멤버십 로그인 필요</div>
            <button className="close-modal" onClick={() => setShowModal(false)}>닫기</button>
          </div>
        </div>
      )}
    </section>
  );
}
