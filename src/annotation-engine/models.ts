export type ShapeType = 'INACTIVE' |'POINT' | 'LINE' | 'POLYGON' | 'POLYLINE';

export type Coordinates = {
    x: number;
    y: number;
};

export type Annotation = {
    id: string;
    name: string;
    type: ShapeType;
    coordinates: Coordinates[];
};
