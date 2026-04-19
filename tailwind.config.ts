import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        masters: {
          green: '#006747',
          yellow: '#FFF200',
          cream: '#FDF8E8',
          'cream-border': '#E8E5D8',
          red: '#C41E3A',
          'green-dark': '#004d34',
          'green-light': '#e8f5ef',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['Lora', 'Georgia', 'serif'],
      },
      maxWidth: {
        mobile: '480px',
      },
    },
  },
  plugins: [],
} satisfies Config
