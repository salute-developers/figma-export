import React, { FC } from 'react';
import { accent } from '@salutejs/plasma-tokens-web';

import { StyledIcon, StyledParagraph, StyledSpinner, StyledStep } from './Step.style';

interface StepProps {
    step: number;
    progress: number;
    description: string;
}

/**
 * Шаг процесса создания пул реквеста.
 */
export const Step: FC<StepProps> = ({ step, progress, description }) => (
    <StyledStep>
        {step > progress && <StyledIcon size="xs" color={accent} />}
        {step === progress && <StyledSpinner />}
        <StyledParagraph isActive={step >= progress}>{description}</StyledParagraph>
    </StyledStep>
);
