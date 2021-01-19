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

    return {
        annotations,
        backgroundImgPath,
        end,
        foregroundImagePath,
        onAnnotationEdit,
        onAnnotationEnd,
        setEnd,
        setStart,
        start,
    };
};

export default useAnnotationEngine;
