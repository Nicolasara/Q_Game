import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: 'src/electron/main/main.ts'
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    build: {
      lib: {
        entry: 'src/electron/preload/preload.ts'
      }
    }
  },
  renderer: {
    root: 'src/electron/renderer',
    build: {
      rollupOptions: {
        input: 'src/electron/renderer/renderer.ts'
      }
    }
  }
});
