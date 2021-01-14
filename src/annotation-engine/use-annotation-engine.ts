import { useState } from 'react';
import { Annotation, Coordinates, AnnotationEngineProps } from '.';

export interface UseAnnotationEngineArgs {
    width: number;
    height: number;
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
    height,
    onAnnotationEdit,
    onAnnotationEnd,
    width,
}: UseAnnotationEngineArgs): AnnotationEngineProps => {
    const [start, setStart] = useState<Coordinates | undefined>(undefined);
    const [end, setEnd] = useState<Coordinates | undefined>(undefined);

    return {
        annotations,
        backgroundImgPath,
        end,
        foregroundImagePath,
        height,
        onAnnotationEdit,
        onAnnotationEnd,
        setEnd,
        setStart,
        start,
        width,
    };
};

export default useAnnotationEngine;
