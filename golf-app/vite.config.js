import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages는 /저장소이름/ 경로 아래에서 서빙되기 때문에 base를 설정해야 해요
  base: '/4556778899/',
})
