import React, { ReactChild, ReactElement } from 'react';
import { ThemeProvider as OThemeProvider } from 'styled-components';

export interface Fonts {
    main: string;
}

export interface Colors {
    CONTAINED: string;
    secondary: string;
    light: string;
    grey: string;
    lightGrey: string;
    white: string;
    green: string;
    yellow: string;
    red: string;
    blue: string;
}

export interface Radius {
    sm: string;
    lg: string;
}

export interface Shadow {
    sm: string;
    md: string;
}

export interface Placeholder {
    color: string;
}

export interface Breakpoints {
    sm: number;
    md: number;
    lg: number;
}

export interface Theme {
    fonts: Fonts;
    colors: Colors;
    radius: Radius;
    shadow: Shadow;
    placeholder: Placeholder;
    breakPoints: Breakpoints;
}

export interface Props {
    children: ReactChild;
    theme: Theme;
}

const ThemeProvider = ({ children, theme }: Props): ReactElement => (
    <OThemeProvider theme={theme}>{children}</OThemeProvider>
);

export const theme: Theme = {
    fonts: {
        main: 'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
    colors: {
        CONTAINED: '#323233',
        secondary: '#45A371',
        light: '#3E3E40',
        grey: '#7D7D80',
        lightGrey: '#BBBBBF',
        white: '#ffffff',
        green: '#45A371',
        yellow: '#F1C83C',
        red: '#E05B34',
        blue: '#2D4665',
    },
    radius: {
        sm: '3px',
        lg: '8px',
    },
    shadow: {
        sm: '0 1px 3px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.24)',
        md: '0 3px 6px rgba(0,0,0,0.10), 0 3px 6px rgba(0,0,0,0.15)',
    },
    placeholder: {
        color: '#e5e5e5',
    },
    breakPoints: {
        sm: 960,
        md: 1024,
        lg: 1260,
    },
};

ThemeProvider.defaultProps = {
    theme,
};

export default ThemeProvider;
