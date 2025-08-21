/** @type {import('next').NextConfig} */
const nextConfig = {
  // 프록시 설정: Next.js → Socket.IO 서버로 요청 전달
  async rewrites() {
    return [
      // 🔧 Socket.IO 연결 (이 부분이 중요!)
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:3001/socket.io/:path*',
      },
      // 파일 업로드 요청
      {
        source: '/upload/:path*',           
        destination: 'http://localhost:3001/upload/:path*', 
      },
      // 업로드된 파일 접근
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:3001/uploads/:path*',
      },
      // 파일 다운로드
      {
        source: '/download/:path*',
        destination: 'http://localhost:3001/download/:path*',
      },
      // 음악 스트리밍
      {
        source: '/stream/:path*',
        destination: 'http://localhost:3001/stream/:path*',
      }
    ];
  },
  
  // Socket.IO 호환성 설정
  experimental: {
    esmExternals: false, // Socket.IO가 제대로 작동하도록 설정
  },
}

module.exports = nextConfig

/* 🔍 동작 원리:
   브라우저: localhost:3000/socket.io/...
   ↓ (Next.js가 자동으로 변환)
   서버: localhost:3001/socket.io/...
*/