import React, { ChangeEvent, FC } from 'react';
import { TextField } from '@salutejs/plasma-web';

import { Input } from '../input/Input';
import type { IconPayload } from '../../../types';
import { IconPreview } from '../iconPreview/IconPreview';

import { StyledFirstBlock, StyledIconItem, StyledSecondBlock } from './IconItem.style';

interface IconItemProps {
    name: string;
    item: IconPayload;
    onChangeInput: (event: ChangeEvent<HTMLInputElement>) => void;
}

export const IconItem: FC<IconItemProps> = ({ name, item, onChangeInput }) => {
    return (
        <StyledIconItem>
            <StyledFirstBlock>
                <Input label="Svg" content={<IconPreview svg={item.svg} />} />
                <Input label="Size" content={<TextField readOnly value={item.size} />} />
            </StyledFirstBlock>
            <StyledSecondBlock>
                <Input label="Name" content={<TextField name={name} value={item.name} onChange={onChangeInput} />} />
                <Input label="Category" content={<TextField readOnly value={item.category} />} />
            </StyledSecondBlock>
        </StyledIconItem>
    );
};
