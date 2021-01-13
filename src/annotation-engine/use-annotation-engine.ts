import { useState } from 'react';
import { Coordinates, AnnotationEngineProps } from '.';

export interface UseAnnotationEngineArgs {
    width: number;
    height: number;
    backgroundImgPath?: string;
    onAnnotationEnd?: (start: Coordinates, end: Coordinates) => void;
    onAnnotationEdit?: (start: Coordinates, end: Coordinates) => void;
}

const useAnnotationEngine = ({
    width,
    height,
    backgroundImgPath,
    onAnnotationEnd,
    onAnnotationEdit,
}: UseAnnotationEngineArgs): AnnotationEngineProps => {
    const [start, setStart] = useState<Coordinates | undefined>(undefined);
    const [end, setEnd] = useState<Coordinates | undefined>(undefined);

    return { start, setStart, end, setEnd, width, height, backgroundImgPath, onAnnotationEnd, onAnnotationEdit };
};

export default useAnnotationEngine;
