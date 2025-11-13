import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ],
    esbuild: {
        jsx: 'automatic',
    },
    server: {
        host: '0.0.0.0', // Escuchar en todas las interfaces de red
        port: 5173,
        strictPort: true,
        hmr: {
            // Usar la IP de la red para HMR - esto es lo que Laravel usará para generar las URLs
            host: '192.168.2.202',
            port: 5173,
            protocol: 'ws',
        },
        cors: {
            origin: true, // Permitir cualquier origen
            credentials: true,
        },
    },
});
