import React, { useState } from 'react';
import styles from './planpopup.module.css';

const plans = [
  {
    name: 'FREE',
    icon: '🟢',
    highlight: false,
    price: 0,
    desc: 'Try VCKTOR',
    detailList: [
      'Use all released vocal models',
      'Get 60 coins (~6 minutes of voice conversion)',
      'Perfect for testing and trying out VCKTOR'
    ],
    btn: 'GET STARTED',
    color: '#27ef7e'
  },
  {
    name: 'ROOKIE',
    icon: '🔵',
    highlight: false,
    price: 9,
    desc: 'For beginners',
    detailList: [
      'Use all released vocal models',
      'Get 600 coins (~60 minutes)',
      'Great for small projects or demos'
    ],
    btn: 'GET STARTED',
    color: '#36a0ff'
  },
  {
    name: 'ELITE',
    icon: '🟣',
    highlight: false,
    price: 19,
    desc: 'For creators',
    detailList: [
      'Use all released models + 2 early-access models every month',
      'Get 3,600 coins (~360 minutes)',
      'Ideal for regular production and exploring new voices early'
    ],
    btn: 'GET STARTED',
    color: '#b076f4'
  },
  {
    name: 'MASTER',
    icon: '🔴',
    highlight: false,
    price: 190,
    desc: 'For teams',
    detailList: [
      'Use all released models + up to 10 early-access models/month',
      'Unlimited coins* for voice conversion',
      'Includes VVCKD’s weekly tutor session ‘VCKTOR’S ROOM’ through Zoom',
      'Best for teams, camps, or full-time creators'
    ],
    btn: 'GET STARTED',
    color: '#ff4444'
  },
];

const noticeText = `
WAV Download Availability: All plan users (FREE, ROOKIE, ELITE, MASTER) can download converted audio files in WAV format.

Commercial Use Inquiries: Commercial usage (e.g. release, sale, distribution) is not permitted without prior email approval from VVCKD.

[사업자 정보] 뷔키드 (VVCKD) | 대표: 원정직 | 사업자등록번호: 462‑33‑01694 | 주소: 서울 서초구 반포대로14길 36, 1007호 | 이메일: support@vvckd.ai | 전화: 010‑2931‑7270
[통신판매업 신고] 제2025‑서울강남‑00001호 (서울특별시 강남구청)
[청약철회 안내] 결제일로부터 7일 이내 전액 환불 요청 가능. 단, 서비스 사용 개시 또는 소비자 과실로 가치가 감소한 경우 제한될 수 있습니다.
[환불정책] 자세한 환불/교환 정책은 FAQ 페이지를 참고하세요.
[결제 안전성] 결제는 Toss Payments PG(에스크로)로 안전하게 처리됩니다.
`;

export default function PlanPopup({ onClose }: { onClose: () => void }) {
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [selected, setSelected] = useState(0);

  return (
    <div className={styles.popupOuterWrap}>
      <button className={styles.planCloseBtn} onClick={onClose}>✕</button>
      <div className={styles.popupInnerWrap}>
        <div className={styles.planBg}>
          <div className={styles.planWrap}>
            <div className={styles.planRow}>
              {plans.map((plan, idx) => (
                <div
                  key={plan.name}
                  className={
                    styles.planCard +
                    (selected === idx ? ' ' + styles.planCardSelected : '')
                  }
                  onClick={() => setSelected(idx)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${plan.name} 선택`}
                >
                  <div className={styles.planCardInner}>
                    <div
                      className={styles.planTitle}
                      style={{ color: plan.color }}
                    >
                      {plan.icon} {plan.name}
                    </div>
                    <div className={styles.planDesc}>{plan.desc}</div>
                    <div className={styles.planPrice} style={{ color: plan.color }}>
                      <span className={styles.dollar}>${plan.price}</span>
                      <span className={styles.perMonth}>/month</span>
                    </div>
                    <button className={styles.planBtn}>GET STARTED</button>
                    <ul className={styles.planDetailList}>
                      {plan.detailList.map((text, i) => (
                        <li key={i}>
                          <span className={styles.planDetailBullet} style={{ color: plan.color }}>•</span>
                          <span>{text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.noticeInlineBox}>
              <button
                className={styles.noticeInlineBtn}
                onClick={() => setNoticeOpen(true)}
                tabIndex={0}
              >
                NOTICE
              </button>
            </div>
          </div>
        </div>
      </div>
      {noticeOpen && (
        <div className={styles.noticeModalOverlay} onClick={() => setNoticeOpen(false)}>
          <div
            className={styles.noticeModal}
            onClick={e => e.stopPropagation()}
          >
            <button
              className={styles.noticeCloseBtn}
              onClick={() => setNoticeOpen(false)}
              tabIndex={0}
              aria-label="Close Notice"
            >✕</button>
            <pre className={styles.noticeModalText}>{noticeText}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
