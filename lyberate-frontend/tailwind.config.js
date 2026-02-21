/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
            },
            colors: {
                ios: {
                    bg: '#F2F2F7',
                    card: '#FFFFFF',
                    text: '#1C1C1E',
                    subtext: '#8E8E93',
                    blue: '#007AFF',
                    red: '#FF3B30',
                    green: '#34C759',
                    separator: '#C6C6C8',
                }
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
            }
        },
    },
    plugins: [],
}
