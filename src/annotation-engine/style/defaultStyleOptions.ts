import { AnnotationStyle } from "../models";

const defaultStyle: AnnotationStyle = {
  label: {
    textAlign: 'left',
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
    cap: 'round',
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

export default defaultStyle;
