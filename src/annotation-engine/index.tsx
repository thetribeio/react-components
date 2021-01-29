import React, { FC } from 'react';
import { Annotation, Coordinates } from './models';
import Canvas from './style/canvas';
import Container from './style/container';
import Image from './style/image';
import useAnnotationEngine from './use-annotation-engine';

export interface AnnotationEngineProps {
    className?: string;
    annotations: Annotation[];
    annotationToEdit?: Annotation;
    backgroundImagePath: string;
    foregroundImagePath?: string;
    id?: string;
    numberOfPoints?: number;
    onAnnotationEnded?: (annotationPoints: Coordinates[]) => void;
}

const AnnotationEngine: FC<AnnotationEngineProps> = ({
    annotationToEdit,
    annotations = [],
    backgroundImagePath,
    className,
    foregroundImagePath,
    id = 'annotation-engine',
    numberOfPoints = 2,
    onAnnotationEnded,
}) => {
    const { canvasRef } = useAnnotationEngine({ annotationToEdit, annotations, numberOfPoints, onAnnotationEnded });

    return (
        <Container className={className}>
            <Image src={backgroundImagePath} />
            {foregroundImagePath && <Image src={foregroundImagePath} />}
            <Canvas ref={canvasRef} id={id} />
        </Container>
    );
};

export default AnnotationEngine;
