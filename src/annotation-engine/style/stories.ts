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
  style: hoverStyleOptions,
  name: 'hover',
};

export const clickStyle: StyleData = {
  style: clickStyleOptions,
  name: 'click',
};
