import { StyleData, PartialAnnotationStyle } from "../models";

const hoverStyleOptions: PartialAnnotationStyle = {
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
const clickStyleOptions: PartialAnnotationStyle = {
  label: {
      fillColor: 'lightblue', 
  },
};

export const hoverStyle: StyleData = {
  priority: 0,
  style: hoverStyleOptions,
  name: 'hover',
};

export const clickStyle: StyleData = {
  priority: 1,
  style: clickStyleOptions,
  name: 'click',
};
