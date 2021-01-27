import { useState } from 'react';
import { Annotation, Coordinates, AnnotationEngineProps } from '.';

export interface UseAnnotationEngineArgs {
    backgroundImgPath?: string;
    foregroundImagePath?: string;
    onAnnotationEnd?: (start: Coordinates, end: Coordinates) => void;
    onAnnotationEdit?: (start: Coordinates, end: Coordinates) => void;
    annotations: Annotation[];
}

const useAnnotationEngine = ({
    annotations,
    backgroundImgPath,
    foregroundImagePath,
    onAnnotationEdit,
    onAnnotationEnd,
}: UseAnnotationEngineArgs): AnnotationEngineProps => {
    const [start, setStart] = useState<Coordinates | undefined>(undefined);
    const [end, setEnd] = useState<Coordinates | undefined>(undefined);

    const handleAnnotationEdit = (startCoordinates: Coordinates, endCoordinates: Coordinates) => {
        setStart(undefined);
        setEnd(undefined);

        if (onAnnotationEdit) {
            onAnnotationEdit(startCoordinates, endCoordinates);
        }
    };

    const handleAnnotationEnd = (startCoordinates: Coordinates, endCoordinates: Coordinates) => {
        setStart(undefined);
        setEnd(undefined);

        if (onAnnotationEnd) {
            onAnnotationEnd(startCoordinates, endCoordinates);
        }
    };

    return {
        annotations,
        backgroundImgPath,
        end,
        foregroundImagePath,
        onAnnotationEdit: handleAnnotationEdit,
        onAnnotationEnd: handleAnnotationEnd,
        setEnd,
        setStart,
        start,
    };
};

export default useAnnotationEngine;
