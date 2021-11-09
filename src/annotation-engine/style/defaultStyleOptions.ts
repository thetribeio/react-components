// import { StyleOptions } from "../models";

import { StyleOptions } from "../models";

export const defaultStyle = {
  text: {
    align: 'left' as CanvasTextAlign,
    color: '#0053CC',
    fillColor: '#FFFFFF'
  },
  line: {
    width: 2,
    cap: 'round' as CanvasLineCap,
    strokeColor: '#FFFFFF',
  }
}

export const unselectedStyle: StyleOptions = {
  ...defaultStyle,
  point: {
    width: 2,
    outerRadius: 7,
    innerRadius: 5,
    strokeColor: '#FFFFFF95',
    fillColor: '#0053CC30'
  },
};

export const selectedStyle: StyleOptions = {
  ...defaultStyle,
  point: {
    strokeColor: '#FFFFFF',
    fillColor: '#F0F',
    outerRadius: 8,
    innerRadius: 8,
    width: 1,
  },
  line: {
    ...defaultStyle.line,
    strokeColor: '#0053CC',
  }
};

export const temporaryHighlightedStyle: StyleOptions = {
  ...selectedStyle,
  line: {
    ...defaultStyle.line,
    strokeColor: 'red',
  },
  point: {
    ...selectedStyle.point,
    fillColor: 'red',
  }
};

export const highlightedStyle: StyleOptions = {
  ...defaultStyle,
  point: {
    strokeColor: '#FFFFFF95',
    fillColor: '#0053CC66',
    width: 2,
    outerRadius: 14,
    innerRadius: 12,
  },
};
