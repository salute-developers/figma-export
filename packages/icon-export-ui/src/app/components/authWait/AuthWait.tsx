import React, { FC } from 'react';
import { Spinner } from '@salutejs/plasma-web';

import { StyledAuthWait, StyledSubtitle } from './AuthWait.style';

/**
 * Окно ожидания авторизации.
 */
export const AuthWait: FC = () => (
    <StyledAuthWait>
        <StyledSubtitle> Authorization with GitHub </StyledSubtitle>
        <Spinner />
    </StyledAuthWait>
);
