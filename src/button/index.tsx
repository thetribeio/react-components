import React, { FC, ComponentPropsWithRef } from 'react';
import BUTTON_COLORS from './button_colors';
import BUTTON_VARIANTS from './button_variants';
import OButton from './style/button';
import Content from './style/content';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
    label: string;
    variant?: BUTTON_VARIANTS;
    color?: BUTTON_COLORS;
}

const Button: FC<ButtonProps> = ({
    label,
    variant = BUTTON_VARIANTS.CONTAINED,
    color = BUTTON_COLORS.GREEN,
    disabled,
    ...props
}) => (
    <OButton color={color} disabled={disabled} variant={variant} {...props}>
        <Content>{label}</Content>
    </OButton>
);

export default Button;
