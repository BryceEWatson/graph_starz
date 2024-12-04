'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
    theme: 'light',
    toggleTheme: () => {},
});

export function useTheme() {
    return useContext(ThemeContext);
}

export default function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        // Check local storage or system preference on mount
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
        setTheme(initialTheme);
        updateTheme(initialTheme);
    }, []);

    const updateTheme = (newTheme) => {
        // Update CSS classes
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
        
        // Update CSS variables
        document.documentElement.style.setProperty(
            '--graph-bg',
            newTheme === 'dark' ? '#1a1f2e' : '#f7fafc'
        );
        document.documentElement.style.setProperty(
            '--graph-text',
            newTheme === 'dark' ? '#e2e8f0' : '#2d3748'
        );
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        updateTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
