import React, { FC, useRef, useState, useEffect, useCallback } from 'react';
import Canvas from './style/canvas';
import Container from './style/container';
import Image from './style/image';
import useAnnotationEngine, { UseAnnotationEngineArgs } from './use-annotation-engine';

export { useAnnotationEngine, UseAnnotationEngineArgs };

export interface AnnotationEngineProps {
    width: number;
    height: number;
    backgroundImgPath?: string;
    id?: string;
    start?: Coordinates;
    end?: Coordinates;
    setStart: (start: Coordinates) => void;
    setEnd: (end: Coordinates) => void;
}

export type Coordinates = {
    x: number;
    y: number;
};

const AnnotationEngine: FC<AnnotationEngineProps> = ({
    width,
    height,
    backgroundImgPath,
    id = 'annotation-engine',
    start,
    end,
    setStart,
    setEnd,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [renderingContext, setRenderingContext] = useState<CanvasRenderingContext2D | null>(null);

    const drawPoint = useCallback(
        (coordinates: Coordinates) => {
            if (renderingContext) {
                renderingContext.beginPath();
                renderingContext.fillStyle = '#FFFFFF';
                renderingContext.arc(coordinates.x, coordinates.y, 7, 0, Math.PI * 2, true);
                renderingContext.fill();
                renderingContext.fillStyle = '#000';
                renderingContext.closePath();

                renderingContext.beginPath();
                renderingContext.fillStyle = '#0053CC';
                renderingContext.arc(coordinates.x, coordinates.y, 5, 0, Math.PI * 2, true);
                renderingContext.fill();
                renderingContext.fillStyle = '#000';
                renderingContext.closePath();
            }
        },
        [renderingContext],
    );

    const drawLine = useCallback(
        (startCoordinates: Coordinates, endCoordinates: Coordinates) => {
            if (renderingContext) {
                renderingContext.beginPath();
                renderingContext.strokeStyle = '#0053CC';
                renderingContext.moveTo(startCoordinates.x, startCoordinates.y);
                renderingContext.lineTo(endCoordinates.x, endCoordinates.y);
                renderingContext.lineWidth = 3;
                renderingContext.stroke();
                renderingContext.closePath();
            }
        },
        [renderingContext],
    );

    // Initialize canvas
    useEffect(() => {
        const currentCanvasRef = canvasRef.current;

        let offsetLeft = 0;
        let offsetTop = 0;

        const handleMouseDown = (event: MouseEvent) => {
            if (!start) {
                setStart({
                    x: event.clientX - offsetLeft,
                    y: event.clientY - offsetTop,
                });
            } else {
                setEnd({
                    x: event.clientX - offsetLeft,
                    y: event.clientY - offsetTop,
                });
            }
        };

        if (currentCanvasRef) {
            const canvasRenderingContext = currentCanvasRef.getContext('2d');

            if (canvasRenderingContext) {
                currentCanvasRef.addEventListener('mousedown', handleMouseDown);

                offsetLeft = currentCanvasRef.offsetLeft;
                offsetTop = currentCanvasRef.offsetTop;

                setRenderingContext(canvasRenderingContext);
            }
        }

        return () => {
            if (currentCanvasRef) {
                currentCanvasRef.removeEventListener('mousedown', handleMouseDown);
            }
        };
    }, [renderingContext, start, setStart, setEnd]);

    // Draw points and lines when start and end coordinates change
    useEffect(() => {
        if (renderingContext) {
            renderingContext.clearRect(0, 0, width, height);

            if (start && end) {
                drawLine(start, end);
                drawPoint(end);
            }

            if (start) {
                drawPoint(start);
            }
        }
    }, [start, end, renderingContext, drawPoint, drawLine, width, height]);

    return (
        <Container height={height} width={width}>
            <Image height={height} src={backgroundImgPath} width={width} />
            <Canvas ref={canvasRef} height={height} id={id} width={width} />
        </Container>
    );
};

export default AnnotationEngine;
