import React, { FC, forwardRef, ForwardedRef, RefObject, useRef } from 'react';
import { Annotation, Coordinates, DrawingEvent } from './models';
import Canvas from './style/canvas';
import Container from './style/container';
import Image from './style/image';
import useAnnotationEngine from './use-annotation-engine';

export interface AnnotationEngineProps {
    className?: string;
    annotations: Annotation[];
    annotationToEdit?: Annotation;
    backgroundImagePath: string;
    drawingEvent?: DrawingEvent;
    foregroundImagePath?: string;
    id?: string;
    numberOfPoints?: number;
    onAnnotationEnded?: (annotationPoints: Coordinates[]) => void;
    onAnnotationDragged?: (annotationPoints: Coordinates[]) => void;
}

const AnnotationEngine: FC<AnnotationEngineProps> = forwardRef(
    (
        {
            annotationToEdit,
            annotations = [],
            backgroundImagePath,
            className,
            drawingEvent = 'drag',
            foregroundImagePath,
            id = 'annotation-engine',
            numberOfPoints = 2,
            onAnnotationEnded,
            onAnnotationDragged,
        },
        ref: ForwardedRef<HTMLCanvasElement>,
    ) => {
        // calling conditionally a hook is not allowed, so this one will be used if {ref} is null
        const cRef = useRef<HTMLCanvasElement>(null);
        const { canvasRef } = useAnnotationEngine({
            annotationToEdit,
            annotations,
            drawingEvent,
            numberOfPoints,
            onAnnotationEnded,
            onAnnotationDragged,
            ref: (ref as RefObject<HTMLCanvasElement>) || cRef,
        });

        return (
            <Container className={className}>
                <Image src={backgroundImagePath} />
                {foregroundImagePath && <Image src={foregroundImagePath} />}
                <Canvas ref={canvasRef} id={id} />
            </Container>
        );
    },
);

export default AnnotationEngine;
