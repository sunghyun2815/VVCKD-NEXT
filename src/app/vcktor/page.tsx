'use client';
import React, { useState } from 'react';
import styles from './vcktor.module.css';
import PlanPopup from './PlanPopup';

// 오른쪽 상단: 닉네임/코인/버튼 세트
function TopCoinBar({
  nickname,
  coin,
  onCoinClick,
}: {
  nickname: string;
  coin: string;
  onCoinClick: () => void;
}) {
  return (
    <div className={styles.topCoinBar}>
      <span className={styles.nickname}>{nickname}</span>
      <button className={styles.coinBtn} onClick={onCoinClick}>
        🪙 {coin}
      </button>
    </div>
  );
}

const characters = [
  { name: 'YUNSU', img: '/vcktor/6-1-01 YUNSU.png' },
  { name: 'BEOM', img: '/vcktor/6-2-02 BEOM.png' },
  { name: 'EUGENE', img: '/vcktor/6-3-03 EUGENE.png' },
  { name: 'XAVIER', img: '/vcktor/6-4-04 XAVIER.png' },
  { name: 'HARU', img: '/vcktor/6-5-05 HARU.png' },
  { name: 'SUAN', img: '/vcktor/6-6-06 SUAN.png' },
  { name: 'AMELIA', img: '/vcktor/6-7-07 AMELIA.png' },
  { name: 'MAISY', img: '/vcktor/6-8-08 MAISY.png' },
];

// waveform 시각화용
function WaveformBar() {
  return (
    <svg width="100%" height="48" viewBox="0 0 160 48" style={{ marginBottom: 8 }}>
      {[8, 12, 24, 36, 44, 33, 24, 13, 8, 16, 30, 47, 45, 29, 11].map((h, i) =>
        <rect key={i} x={i * 11 + 3} y={48 - h} width="7" height={h} rx="2" fill="#FF5500" />
      )}
    </svg>
  );
}

export default function Page() {
  const [selected, setSelected] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState([
    '[SYSTEM] VVCKD AI SYNTH ONLINE',
    '[USER] 빅터야, 새로운 곡 부탁해',
    '[VCKTOR] 새로운 곡을 업로드 해주세요!',
  ]);
  const [planOpen, setPlanOpen] = useState(false);

  const nickname = '도일';
  const coin = '1/10000';

  const uploads = ['audio_01.wav', 'audio_02.wav', 'audio_02.wav', 'audio_02.wav', 'audio_02.wav'];
  const downloads = [
    { name: 'audio_04_YUNSU.wav' },
    { name: 'audio_05_YUNSU.wav' },
    { name: 'audio_05_YUNSU.wav' },
    { name: 'audio_05_YUNSU.wav' },
    { name: 'audio_05_YUNSU.wav' },
    { name: 'audio_05_YUNSU.wav' },
    { name: 'audio_05_YUNSU.wav' },
    { name: 'audio_05_YUNSU.wav' },
    { name: 'audio_05_YUNSU.wav' },
    { name: 'audio_05_YUNSU.wav' },
  ];

  const handleSend = () => {
    if (!chatInput.trim()) return;
    setChatLog((l) => [...l, `[USER] ${chatInput}`]);
    setChatInput('');
  };

  return (
    <div className={styles.bg}>
      <TopCoinBar nickname={nickname} coin={coin} onCoinClick={() => setPlanOpen(true)} />
      {planOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalPopup}>
            <button className={styles.modalCloseBtn} onClick={() => setPlanOpen(false)}>
              ✕
            </button>
            <PlanPopup onClose={() => setPlanOpen(false)} />
          </div>
        </div>
      )}

      <main className={styles.grid}>
        <section className={styles.g1}>
          <div className={styles.logoWrapTop}>
            <img src="/vcktor/logo.png" alt="VCKTOR Logo" className={styles.logoBig} />
          </div>
          <div style={{ height: '300px' }} />
          <div className={styles.chatBox}>
            {chatLog.map((msg, i) => (
              <div key={i} className={styles.chatLine}>{msg}</div>
            ))}
            <input
              className={styles.chatInput}
              placeholder=">> 입력하세요"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
            />
          </div>
        </section>
        <section className={styles.g2}>
          <div className={styles.honeycomb}>
            {characters.map((char, idx) => (
              <div
                key={char.name}
                className={styles.hexCell}
                style={idx % 2 === 1 ? { marginTop: '44px' } : {}}
                onClick={() => setSelected(idx)}
              >
                <svg viewBox="0 0 100 115" className={selected === idx ? styles.hexBorderActive : styles.hexBorder}>
                  <polygon
                    points="50,3 97,29 97,85 50,112 3,85 3,29"
                    fill="none"
                    stroke={selected === idx ? 'rgba(255, 153, 0, 1)' : '#FF5500'}
                    strokeWidth="4"
                  />
                </svg>
                <div className={styles.hexMask}>
                  <img src={char.img} alt={char.name} className={styles.hexImage} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className={styles.g3}>
          <div className={styles.selectedCharBoxHuge}>
            <img src={characters[selected].img} alt={characters[selected].name} className={styles.selectedCharImgHuge} />
          </div>
          <div className={styles.charMetaBox}>
            <span className={styles.charName}>{characters[selected].name}</span>
            <span className={styles.meta}>AGE ###</span>
            <span className={styles.meta}>SPEAK ###</span>
            <span className={styles.meta}>FORTE ###</span>
            <div className={styles.knobRow}>
              <div className={styles.knobGroup}>
                <span className={styles.knobTitle}>POWER</span>
                <div className={styles.knobCtrl}>
                  <button className={styles.knobBtn}>-</button>
                  <span className={styles.knobNum}>50</span>
                  <button className={styles.knobBtn}>+</button>
                </div>
              </div>
              <div className={styles.knobGroup}>
                <span className={styles.knobTitle}>PITCH</span>
                <div className={styles.knobCtrl}>
                  <button className={styles.knobBtn}>-</button>
                  <span className={styles.knobNum}>50</span>
                  <button className={styles.knobBtn}>+</button>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className={styles.g4}>
          <div style={{ height: '130px' }} />
          <div className={styles.g4Border}>
            <span className={styles.uploadTitle}>DRAG AND DROP</span>
            <div className={styles.uploadList}>
              {uploads.map((name, i) => (
                <div className={styles.uploadItem} key={i}>
                  <WaveformBar />
                  <div className={styles.uploadFileLabel}>{name}</div>
                </div>
              ))}
            </div>
          </div>
         <div
            className={styles.topBtnRow}
            style={{
              marginTop: 24,
              marginBottom: 10,
              width: '100%',
              justifyContent: 'center',
              display: 'flex',
              gap: '10px'
            }}
          >
            <button className={styles.convertBtn}>CONVERT</button>
            <button className={styles.downloadBtn}>DOWNLOAD</button>
          </div>
        </section>
        <section className={styles.g5}>
          <div style={{ height: '20px' }} />
          <div className={styles.g5Border}>
            <span className={styles.downloadTitle}>DOWNLOAD ZONE</span>
            <div className={styles.downloadList}>
              {downloads.map((file, i) => (
                <div className={styles.downloadItem} key={i}>
                  <WaveformBar />
                  <div className={styles.downloadFileLabel}>{file.name}</div>
                  <button className={styles.downloadActionBtn}>다운로드 받기</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
