import { AnnotationStyle } from "../models";

export const defaultStyle: AnnotationStyle = {
  label: {
    textAlign: 'left' as CanvasTextAlign,
    textColor: '#0053CC',
    fillColor: '#FFFFFF',
    shadow: {
      offsetX: 0,
      offsetY: 0,
      color: 'black',
      blur: 0,
    },
  },
  line: {
    width: 2,
    cap: 'round' as CanvasLineCap,
    strokeColor: '#FFFFFF',
  },
  point: {
    width: 2,
    outerRadius: 7,
    innerRadius: 5,
    strokeColor: '#FFFFFF95',
    fillColor: '#0053CC30'
  },
}

export const selectedStyle: AnnotationStyle = {
  ...defaultStyle,
  point: {
    strokeColor: '#FFFFFF',
    fillColor: '#0053CC66',
    outerRadius: 8,
    innerRadius: 8,
    width: 1,
  },
  line: {
    ...defaultStyle.line,
    strokeColor: '#0053CC',
  }
};


export const highlightedStyle: AnnotationStyle = {
  ...defaultStyle,
  point: {
    strokeColor: '#FFFFFF95',
    fillColor: '#0053CC66',
    width: 2,
    outerRadius: 14,
    innerRadius: 12,
  },
};
