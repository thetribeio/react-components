import styled from 'styled-components';

interface Props {
    width: number;
    height: number;
}

const Image = styled.img<Props>`
    position: absolute;
    width: ${({ width }) => width}px;
    height: ${({ height }) => height}px;
`;

export default Image;
