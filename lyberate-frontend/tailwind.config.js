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
                    bg: '#F1F5F9', // Light blue-gray
                    card: '#FFFFFF',
                    text: '#0F172A',
                    subtext: '#64748B',
                    blue: '#E11D48', // Main World Deportes Red used for primary buttons
                    red: '#9F1239',  // Darker Red for alerts
                    green: '#10B981', // emerald
                    separator: '#CBD5E1',
                }
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
            }
        },
    },
    plugins: [],
}
