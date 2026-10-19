import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'pawrescue-ionic',
  webDir: 'www',
  // Windows cannot create the SPM symlink without Developer Mode; Xcode builds sync on macOS.
  experimental: { ios: { spm: { packageOptions: { '@capacitor-firebase/messaging': { symlink: process.platform !== 'win32' } } } } },
};

export default config;
