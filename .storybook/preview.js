


import React from 'react';
import Reset from '../src/reset';
import ThemeProvider from '../src/theme-provider';

import theme from './theme';

const resetDecorator = (Story) => (
  <>
    <Reset />
    <Story />
  </>
);

const themeDecorator = (Story) => (
  <ThemeProvider>
    <Story />
  </ThemeProvider>
);

export const decorators = [
  resetDecorator,
  themeDecorator,
];

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  options: {
    isFullscreen: false,
    showNav: true,
    showPanel: true,
    panelPosition: 'bottom',
    theme
  }
}
