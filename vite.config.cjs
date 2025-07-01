const tailwind = require('tailwindcss');
const autoprefixer = require('autoprefixer');

module.exports = {
  css: {
    postcss: {
      plugins: [
        tailwind,
        autoprefixer
      ],
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000
  }
}; 