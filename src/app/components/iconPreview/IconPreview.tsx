import React, { FC } from 'react';

import { StyledIconPreview, StyledImg } from './IconPreview.style';

interface IconPreviewProps {
    svg?: string;
}

export const IconPreview: FC<IconPreviewProps> = ({ svg = '' }) => (
    <StyledIconPreview>
        <StyledImg alt="icon-preview" src={`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`} />
    </StyledIconPreview>
);
