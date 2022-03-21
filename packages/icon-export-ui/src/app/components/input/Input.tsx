import { ParagraphText1 } from '@salutejs/plasma-web';
import React, { FC } from 'react';

import { StyledInput } from './Input.style';

interface InputProps {
    label: string;
    content: JSX.Element;
}

/**
 * Компонент для ввода значений в форме.
 */
export const Input: FC<InputProps> = ({ label, content }) => (
    <StyledInput>
        <ParagraphText1>{label}</ParagraphText1>
        {content}
    </StyledInput>
);
