import { useState } from 'react';
import { Coordinates, AnnotationEngineProps } from '.';

export interface UseAnnotationEngineArgs {
    width: number;
    height: number;
    backgroundImgPath?: string;
}

const useAnnotationEngine = ({ width, height, backgroundImgPath }: UseAnnotationEngineArgs): AnnotationEngineProps => {
    const [start, setStart] = useState<Coordinates | undefined>(undefined);
    const [end, setEnd] = useState<Coordinates | undefined>(undefined);

    return { start, setStart, end, setEnd, width, height, backgroundImgPath };
};

export default useAnnotationEngine;
