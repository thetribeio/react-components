export type Coordinates = {
    x: number;
    y: number;
};

export type Annotation = {
    id: string;
    name: string;
    isClosed: boolean;
    coordinates: Coordinates[];
};

export interface AnnotationPathData {
    label: Path2D;
}

export type SelectionTypes = 'UNSELECTED' | 'SELECTED' | 'HIGHLIGHTED';

export type AnnotationStyle = {
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
    label: {
        textColor: string;
        textAlign: CanvasTextAlign;
        fillColor: string;
        shadow: {
            offsetX: number;
            offsetY: number;
            blur: number;
            color: string;
        };
    };
}

type RecursivePartial<T> = {
    [P in keyof T]?:
      T[P] extends Record<string, unknown> ? RecursivePartial<T[P]> :
      T[P];
  };

  export type PartialAnnotationStyle = RecursivePartial<AnnotationStyle>;

  export interface StyleOptions {
    priority: number;
    annotationsId: string[];
    style: PartialAnnotationStyle;
  }

  export interface InputStyleOptions {
    priority: number;
    style: PartialAnnotationStyle;
    name: string;
  }
