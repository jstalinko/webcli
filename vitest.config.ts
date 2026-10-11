import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom', 'lucide-react'],
    alias: {
      react: path.resolve(import.meta.dirname, 'node_modules/react'),
      'react-dom': path.resolve(import.meta.dirname, 'node_modules/react-dom'),
      'lucide-react': path.resolve(import.meta.dirname, 'node_modules/lucide-react'),
    },
  },
  test: {
    globals: true,
  },
});
