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

export type SelectionTypes = 'UNSELECTED' | 'SELECTED' | 'TEMPORARY_HIGHLIGHTED' | 'HIGHLIGHTED';

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