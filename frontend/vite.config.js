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
    host: 'localhost',
    port: 5173,
    proxy: {
      // '/api'로 시작하는 모든 요청을 target 주소로 전달(프록시)합니다.
      '/api': {
        // target: 'http://127.0.0.1:8000 ', // FastAPI 서버의 주소
        target: 'https://localhost:8443',
        changeOrigin: true, // CORS 오류를 방지하기 위해 origin 헤더를 변경합니다.
        ws: true, // WebSocket 프록시를 활성화합니다. (매우 중요!)
        // 경로를 다시 작성합니다. 예: /api/ws -> /ws
        // rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false,
      }
    }
  }
})