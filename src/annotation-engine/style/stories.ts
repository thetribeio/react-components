import { StyleData, PartialAnnotationStyle } from "../models";

const hoverStyleOptions: PartialAnnotationStyle = {
  label: {
      shadow: {
          blur: 8,
          color: 'white',
      },
  },
};

const clickStyleOptions: PartialAnnotationStyle = {
  label: {
      fillColor: 'lightblue', 
  },
  line: {
    strokeColor: 'lightblue',
  },
  point: {
    strokeColor: 'lightblue',
  },
};

const editStyleOptions: PartialAnnotationStyle = {
  point: {
    strokeColor: '#FFFFFF',
    fillColor: '#0053CC66',
    outerRadius: 8,
    innerRadius: 8,
    width: 1,
  },
  line: {
    strokeColor: '#0053CC',
  },
};

const hiddenStyleOptions: PartialAnnotationStyle = {
  point: {
    strokeColor: 'transparent',
    fillColor: 'transparent',
  },
};

export const highlightStyleOptions: PartialAnnotationStyle = {
  point: {
    strokeColor: '#FFFFFF95',
    fillColor: '#0053CC66',
    width: 2,
    outerRadius: 14,
    innerRadius: 12,
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

export const editStyle: StyleData = {
  style: editStyleOptions,
  name: 'edit',
};

export const highlightStyle: StyleData = {
  style: highlightStyleOptions,
  name: 'highlight',
};

export const hiddenStyle: StyleData = {
  style: hiddenStyleOptions,
  name: 'hidden',
};
