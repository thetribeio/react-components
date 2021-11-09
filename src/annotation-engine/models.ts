export type Coordinates = {
    x: number;
    y: number;
};

export type Annotation = {
    id: string;
    name: string;
    isClosed: boolean;
    coordinates: Coordinates[];
    label?: {
        name: string,
        path: Path2D,
    },
};

export type SelectionTypes = 'UNSELECTED' | 'SELECTED' | 'HIGHLIGHTED';

export type StyleOptions = {
    point: {
        innerRadius: number;
        outerRadius: number;
        width: number;
        strokeColor: string;
        fillColor: string;
    };
    line: {
        cap: CanvasLineCap,
        strokeColor: string,
        width: number,
    };
    text: {
        color: string;
        align: CanvasTextAlign;
        fillColor: string;
    };
}

type RecursivePartial<T> = {
    [P in keyof T]?:
      T[P] extends Record<string, unknown> ? RecursivePartial<T[P]> :
      T[P];
  };

  export type PartialStyleOptions = RecursivePartial<StyleOptions>;

  export interface StylingStatusData {
    priority: number;
    annotationsId: string[];
    styleOptions: PartialStyleOptions;
  }

  export interface InputStylingStatusData {
    priority: number;
    styleOptions: PartialStyleOptions;
    name: string;
  }
