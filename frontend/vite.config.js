import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // 개발 서버 설정을 추가합니다.
  server: {
    proxy: {
      // '/api'로 시작하는 모든 요청을 target 주소로 전달(프록시)합니다.
      '/api': {
        // target: 'http://127.0.0.1:8000 ', // FastAPI 서버의 주소
        target: 'http://localhost:9000',
        changeOrigin: true, // CORS 오류를 방지하기 위해 origin 헤더를 변경합니다.
        ws: true, // WebSocket 프록시를 활성화합니다. (매우 중요!)
        // 경로를 다시 작성합니다. 예: /api/ws -> /ws
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  }
})