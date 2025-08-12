'use client';

import { useEffect, useState } from 'react';
import '../../styles/spotify.css';

type ChartItem = {
  rank: number;
  title: string;
  artist: string;
  change: string;
};

export default function SpotifySection() {
  const [chart, setChart] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChart() {
      try {
        const res = await fetch('/api/mcp/chart-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });

        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setChart(json.data);
        }
      } catch (err) {
        console.error('Error fetching chart data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchChart();
  }, []);

  return (
    <section className="page spotify-section" id="page-2">
      <div className="page-content centered-content">
        <div className="content-container spotify-container">
          <div className="chart-container">
            <div className="chart-title">
              <span className="main">SPOTIFY WEEKLY CHART</span>
            </div>
            {loading ? (
              <div className="chart-loading">Loading...</div>
            ) : (
              <>
                {chart.map((item) => (
                  <div className="chart-item" key={item.rank}>
                    <div className="rank-bar" />
                    <div className="item-content">
                      <div className="rank-section">{item.rank}.</div>
                      <div className="title-section">{item.title}</div>
                      <div className="streams-section">{item.artist}</div>
                      <div className="change-section">{item.change}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
