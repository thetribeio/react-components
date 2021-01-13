import styled from 'styled-components';

interface Props {
    width: number;
    height: number;
}

const Container = styled.div<Props>`
    width: ${({ width }) => width}px;
    height: ${({ height }) => height}px;
`;

export default Container;
