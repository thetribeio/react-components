import { InputStyleOptions, PartialAnnotationStyle } from "../models";

const hoverStyle: PartialAnnotationStyle = {
  label: {
      shadow: {
          blur: 8,
          color: 'white',
      },
  },
  line: {
    strokeColor: 'lightblue',
  }
};
const clickStyle: PartialAnnotationStyle = {
  label: {
      fillColor: 'lightblue', 
  },
};

export const hoverStatus: InputStyleOptions = {
  priority: 0,
  style: hoverStyle,
  name: 'hover',
};

export const clickStatus: InputStyleOptions = {
  priority: 1,
  style: clickStyle,
  name: 'click',
};
