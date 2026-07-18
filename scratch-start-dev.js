import { dev } from 'astro';

async function start() {
  console.log('Memulai Astro dev server secara programmatik...');
  try {
    const server = await dev({
      root: '.',
      server: {
        port: 4321,
        host: true
      }
    });
    console.log('Astro dev server berhasil berjalan!');
  } catch (error) {
    console.error('Error saat menjalankan Astro dev server:', error);
  }
}

start();
