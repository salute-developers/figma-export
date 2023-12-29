import React, { ChangeEvent, FC, useCallback, useEffect, useState } from 'react';
import { ParagraphText1 } from '@salutejs/plasma-web';

import type { IconPayload } from '../../../types';
import { IconItem } from '../iconItem/IconItem';

import { StyledIconList, StyledIconListContainer } from './IconList.style';

interface IconListProps {
    iconsMetaData: IconPayload[];
    onChangeIconsName: (data: IconPayload[]) => void;
}

/**
 * Список выбранных иконок.
 */
export const IconList: FC<IconListProps> = ({ onChangeIconsName, iconsMetaData }) => {
    const [state, setState] = useState<Record<string, IconPayload>>();

    const onChangeInput = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            event.persist();

            const iconKey = event.target.name;

            if (!state) {
                return;
            }

            const newState = {
                ...state,
                [iconKey]: {
                    size: state[iconKey].size,
                    svg: state[iconKey].svg,
                    name: event.target.value,
                    category: state[iconKey].category,
                },
            };

            setState(newState);

            onChangeIconsName(Object.values(newState));
        },
        [state, onChangeIconsName],
    );

    useEffect(() => {
        if (!iconsMetaData.length) {
            return;
        }

        const fromData = iconsMetaData.reduce((acc: Record<string, IconPayload>, item, i) => {
            acc[`${item.name}${i}`] = item;
            return acc;
        }, {});
        setState(fromData);
    }, [iconsMetaData]);

    return (
        <StyledIconList>
            <ParagraphText1>Icon list: {iconsMetaData.length}</ParagraphText1>
            <StyledIconListContainer>
                {state &&
                    iconsMetaData.map(({ name }, i) => (
                        <IconItem
                            key={`${name}${i}`}
                            name={`${name}${i}`}
                            item={state[`${name}${i}`]}
                            onChangeInput={onChangeInput}
                        />
                    ))}
            </StyledIconListContainer>
        </StyledIconList>
    );
};
