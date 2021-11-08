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
