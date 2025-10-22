import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
      react(),
      mkcert()
  ],

  // CSS 설정
  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: '[name]__[local]___[hash:base64:5]'
    }
  },

  // 개발 서버 설정을 추가합니다.
  server: {
    https: true,
    proxy: {
      // '/api'로 시작하는 모든 요청을 target 주소로 전달(프록시)합니다.
      '/api': {
        // target: 'http://127.0.0.1:8000 ', // FastAPI 서버의 주소
        target: 'https://localhost:8443',
        changeOrigin: true, // CORS 오류를 방지하기 위해 origin 헤더를 변경합니다.
        ws: true, // WebSocket 프록시를 활성화합니다. (매우 중요!)
        // 경로를 다시 작성합니다. 예: /api/ws -> /ws
        // rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false, // 개발 환경에서 자체 서명된 인증서 허용
      },

      // FastAPI 전용 프록시: 프론트엔드에서 '/fastapi'로 요청하면 백엔드 루트로 전달됩니다.
      '/fastapi': {
        target: 'https://localhost:8000',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/fastapi/, ''),
        secure: false,
      },

      // 프론트엔드에서 직접 '/ws/:session' 같은 경로로 접속할 경우를 위한 WS 프록시
      '/ws': {
        target: 'https://localhost:8443',
        changeOrigin: true,
        ws: true,
        secure: false, // 개발 환경에서 자체 서명된 인증서 허용 (필요 시)
        // WebSocket은 경로 그대로 전달되므로 rewrite는 필요 없습니다.
      }
    }
  }
})