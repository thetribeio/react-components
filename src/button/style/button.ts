import { Button as OButton } from 'reakit';
import styled, { keyframes } from 'styled-components';
import { Theme } from '../../theme-provider';
import BUTTON_COLORS from '../button_colors';
import BUTTON_VARIANTS from '../button_variants';

const press = keyframes`
  from {
    transform: scale(1.01);
  }
  70% {
    transform: scale(0.97);
  }
  to {
    transform: scale(1);
  }
`;

interface Props {
    theme: Theme;
    variant: BUTTON_VARIANTS;
    color: BUTTON_COLORS;
    disabled?: boolean;
}

const getColor = (theme: Theme, color: BUTTON_COLORS): string => {
    const { colors } = theme;

    switch (color) {
        case BUTTON_COLORS.GREEN:
            return colors.green;
        case BUTTON_COLORS.YELLOW:
            return colors.yellow;
        case BUTTON_COLORS.RED:
            return colors.red;
        case BUTTON_COLORS.BLUE:
            return colors.blue;
        default:
            return colors.green;
    }
};

const getBackgroundColor = ({ theme, variant, color, disabled }: Props): string => {
    const { colors } = theme;

    if (disabled) {
        return colors.lightGrey;
    }

    if (variant === BUTTON_VARIANTS.CONTAINED) {
        return getColor(theme, color);
    }

    return colors.white;
};

const getFontColor = ({ theme, variant, color, disabled }: Props): string => {
    const { colors } = theme;

    if (disabled) {
        return colors.grey;
    }

    if (variant === BUTTON_VARIANTS.OUTLINED) {
        return getColor(theme, color);
    }

    return colors.white;
};

const getBorder = ({ theme, variant, color, disabled }: Props): string => {
    if (!disabled && variant === BUTTON_VARIANTS.OUTLINED) {
        return `1px solid ${getColor(theme, color)}`;
    }

    return 'none';
};

const Button = styled(OButton)<Props>`
    height: 40px;
    background-color: ${getBackgroundColor};
    color: ${getFontColor};
    border: ${getBorder};
    border-radius: ${({ theme: { radius } }) => radius.lg};
    opacity: ${({ disabled }) => (disabled ? '0.7' : '1')};
    cursor: ${({ disabled }) => (disabled ? 'auto' : 'pointer')};
    font-size: 12px;
    line-height: 16px;
    min-height: 26px;
    letter-spacing: 1px;
    transition: 150ms;
    white-space: nowrap;
    padding: 5px 16px;
    outline: 0;
    position: relative;
    text-transform: uppercase;
    font-weight: 600;
    font-family: ${({ theme: { fonts } }) => fonts.main};

    &:hover {
        box-shadow: ${({ disabled, theme: { shadow } }) => (disabled ? 'none' : shadow.sm)};
        transform: ${({ disabled }) => (disabled ? 'scale(1)' : 'scale(1.01)')};
    }
    &:hover:active {
        box-shadow: none;
        animation: ${press} 200ms ease-in-out;
    }
`;

export default Button;
