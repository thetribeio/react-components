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

interface LabelPathData {
    label: Path2D;
}

export interface PointAnnotationPathData extends LabelPathData {
    point: Path2D;
}

export interface LinearAnnotationPathData extends LabelPathData {
    lines: Path2D[];
}

export type AnnotationPathData = PointAnnotationPathData | LinearAnnotationPathData;

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
        shadow: ShadowStyle;
    };
}

export type ShadowStyle = {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
};

type RecursivePartial<T> = {
    [P in keyof T]?:
      T[P] extends Record<string, unknown> ? RecursivePartial<T[P]> :
      T[P];
  };

export type PartialAnnotationStyle = RecursivePartial<AnnotationStyle>;

export interface StyleData {
name: string;
style: PartialAnnotationStyle;
}

// FIXME LATER split types between stylesfor anno (string key), styles for points (number key)
export type StyleDataById = Map<string, StyleData>;
export type AnnotationPathDataById = Map<string, AnnotationPathData>;
export type Segment = [Coordinates, Coordinates];

export interface AnnotationIdWithStyleData {
    id: string;
    style?: StyleData;
}
