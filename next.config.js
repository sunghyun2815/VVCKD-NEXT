/** @type {import('next').NextConfig} */
const nextConfig = {
  // 프록시 설정: Next.js → Socket.IO 서버로 요청 전달
  async rewrites() {
    return [
      // 🔧 Socket.IO 연결 (가장 중요!)
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:3001/socket.io/:path*',
      },
      // 파일 업로드 API
      {
        source: '/api/upload/:path*',
        destination: 'http://localhost:3001/api/upload/:path*',
      },
      // 파일 스트리밍 API
      {
        source: '/api/stream/:path*',
        destination: 'http://localhost:3001/api/stream/:path*',
      },
      // 파일 다운로드 API
      {
        source: '/api/download/:path*',
        destination: 'http://localhost:3001/api/download/:path*',
      },
      // 파일 관리 API
      {
        source: '/api/files/:path*',
        destination: 'http://localhost:3001/api/files/:path*',
      },
      // 헬스 체크
      {
        source: '/health',
        destination: 'http://localhost:3001/health',
      },
      // 업로드된 파일 직접 접근
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:3001/uploads/:path*',
      }
    ];
  }
}

module.exports = nextConfig

/* 🔍 동작 원리:
   브라우저에서 localhost:3000/api/upload/music 요청
   ↓ (Next.js가 자동으로 변환)
   서버로 localhost:3001/api/upload/music 전달
*/