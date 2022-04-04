import React, { ChangeEvent, FC, useCallback, useState } from 'react';
import { ParagraphText1 } from '@salutejs/plasma-web';

import type { SelectItem, IconPayload } from '../../../types';
import { IconItem } from '../iconItem/IconItem';

import { StyledIconList, StyledIconListContainer } from './IconList.style';

const categories: SelectItem[] = [
    { value: '--no-category--', label: '--no-category--' },
    // { value: 'navigation', label: 'Navigation' },
    // { value: 'universal', label: 'Universal' },
    // { value: 'action', label: 'Action' },
    // { value: 'alert', label: 'Alert' },
    // { value: 'av', label: 'Av' },
    // { value: 'connection', label: 'Connection' },
    // { value: 'hardware', label: 'Hardware' },
    // { value: 'communication', label: 'Communication' },
    // { value: 'files', label: 'Files' },
    // { value: 'map', label: 'Map' },
    // { value: 'other', label: 'Other' },
    // { value: 'logo', label: 'Logo' },
];

interface IconListProps {
    iconsMetaData: IconPayload[];
    onChangeIconsName: (data: IconPayload[]) => void;
}

/**
 * Список выбранных иконок.
 */
export const IconList: FC<IconListProps> = ({ onChangeIconsName, iconsMetaData }) => {
    const [state, setState] = useState(
        iconsMetaData.reduce((acc: Record<string, IconPayload>, item, i) => {
            acc[`${item.name}${i}`] = item;
            return acc;
        }, {}),
    );

    const onChangeInput = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            event.persist();

            const iconKey = event.target.name;

            const newState = {
                ...state,
                [iconKey]: {
                    size: state[iconKey].size,
                    svg: state[iconKey].svg,
                    name: event.target.value,
                },
            };

            setState(newState);

            onChangeIconsName(Object.values(newState));
        },
        [state, onChangeIconsName],
    );

    return (
        <StyledIconList>
            <ParagraphText1>Icon list: {iconsMetaData.length}</ParagraphText1>
            <StyledIconListContainer>
                {iconsMetaData.map(({ name }, i) => (
                    <IconItem
                        key={`${name}${i}`}
                        name={`${name}${i}`}
                        item={state[`${name}${i}`]}
                        category="--no-category--"
                        categories={categories}
                        onChangeInput={onChangeInput}
                    />
                ))}
            </StyledIconListContainer>
        </StyledIconList>
    );
};
