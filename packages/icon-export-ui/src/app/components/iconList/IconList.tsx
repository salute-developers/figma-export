import React, { ChangeEvent, FC, useCallback, useEffect, useState } from 'react';
import { Headline5 } from '@salutejs/plasma-web';

import type { IconPayload } from '../../../types';
import { IconItem } from '../iconItem/IconItem';

import { StyledIconList, StyledIconListContainer, StyledIconListHeader } from './IconList.style';

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
            setState({});
            return;
        }

        const fromData = iconsMetaData.reduce((acc: Record<string, IconPayload>, item, i) => {
            acc[`${item.name}${i}`] = item;
            return acc;
        }, {});
        setState(fromData);
    }, [iconsMetaData]);

    // Группируем иконки по имени и считаем уникальные
    const uniqueIcons = new Set(iconsMetaData.map((icon) => icon.name));
    const sizesText =
        uniqueIcons.size === 1
            ? `${iconsMetaData.length} size(s) of 1 icon`
            : `${iconsMetaData.length} total (${uniqueIcons.size} unique icons)`;

    return (
        <StyledIconList>
            <StyledIconListHeader>
                <Headline5>Icons: {sizesText}</Headline5>
            </StyledIconListHeader>
            <StyledIconListContainer>
                {state &&
                    iconsMetaData.map(({ name }, i) => {
                        const key = `${name}${i}`;
                        const item = state[key];

                        // Пропускаем если данные еще не синхронизированы
                        if (!item) {
                            return null;
                        }

                        return <IconItem key={key} name={key} item={item} onChangeInput={onChangeInput} />;
                    })}
            </StyledIconListContainer>
        </StyledIconList>
    );
};
