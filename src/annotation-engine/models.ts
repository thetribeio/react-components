export type Coordinates = {
    x: number;
    y: number;
};

export type Annotation = {
    id: string;
    name: string;
    coordinates: Coordinates[];
};

export enum DrawingEvent {
    MOUSEMOVE = 'mousemove',
    DRAG = 'drag',
}
