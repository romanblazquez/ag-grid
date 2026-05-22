const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['selector', '.app-dark'],
  content: [
    join(__dirname, 'apps/eqt-activity/src/**/*.{html,ts}'),
    join(__dirname, 'libs/**/*.{html,ts}'),
  ],
  theme: {
    extend: {},
  },
  plugins: [require('tailwindcss-primeui')],
};
