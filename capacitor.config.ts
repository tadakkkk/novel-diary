import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.tadaktadak.app',
  appName: '타닥타닥',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    // 네이티브 HTTP로 fetch를 패치 → WebView CORS 제약 우회
    CapacitorHttp: {
      enabled: true,
    },
  },
}

export default config
