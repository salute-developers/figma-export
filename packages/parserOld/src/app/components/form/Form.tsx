import React, { ChangeEvent, FC, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { TextField, Select, Button } from '@salutejs/plasma-web';

import type { IconPayload, SelectItem } from '../../../types';
import { Input } from '../input/Input';
import { IconList } from '../iconList/IconList';

import { StyledCommitMessage, StyledForm, StyledPullRequestData } from './Form.style';

const commitTypes: SelectItem[] = [
    { label: 'feat', value: 'feat' },
    { label: 'fix', value: 'fix' },
];

interface FormState {
    commitType: string;
    commitMessage: string;
    iconsMetaData: IconPayload[];
}

const defaultState: Omit<FormState, 'iconsMetaData'> = {
    commitType: 'feat',
    commitMessage: 'Add icon `IconNameTest`',
};

interface FormProps {
    onSubmit: (data: { iconsMetaData: IconPayload[]; commitMessage: string }) => void | Promise<void>;
    iconsMetaData: IconPayload[];
    isLoading?: boolean;
    buttonText?: string;
}

/**
 * Элементы формы для ввода данных.
 */
export const Form: FC<FormProps> = ({ onSubmit, iconsMetaData, isLoading = false, buttonText = 'Add Icon' }) => {
    const [state, setState] = useState<FormState>({ ...defaultState, iconsMetaData });

    useEffect(() => {
        if (!iconsMetaData.length) {
            return;
        }

        setState((prevState) => ({
            ...prevState,
            iconsMetaData,
        }));
    }, [iconsMetaData]);

    const onSubmitForm = useCallback(
        async (event: FormEvent) => {
            event.preventDefault();

            // Формируем полное сообщение коммита
            const fullCommitMessage = `${state.commitType}(plasma-icons): ${state.commitMessage}`;

            await onSubmit({
                iconsMetaData: state.iconsMetaData,
                commitMessage: fullCommitMessage,
            });
        },
        [onSubmit, state],
    );

    const onChangeSelect = useCallback(
        (name: string) => (value: string) => {
            setState((prevState) => ({
                ...prevState,
                [name]: value,
            }));
        },
        [],
    );

    const onChangeTextField = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        event.persist();

        setState((prevState) => ({
            ...prevState,
            [event.target.name]: event.target.value,
        }));
    }, []);

    const onChangeIconsName = useCallback((data: IconPayload[]) => {
        setState((prevState) => ({
            ...prevState,
            iconsMetaData: data,
        }));
    }, []);

    const sortedIconsMetaData = useMemo(
        () =>
            iconsMetaData.sort((a, b) => {
                if (a.name > b.name) {
                    return 1;
                }
                if (b.name > a.name) {
                    return -1;
                }
                return 0;
            }),
        [iconsMetaData],
    );

    const isDisabled = isLoading || iconsMetaData.length === 0;

    return (
        <StyledForm id="form" onSubmit={onSubmitForm}>
            <IconList onChangeIconsName={onChangeIconsName} iconsMetaData={sortedIconsMetaData} />
            <StyledPullRequestData>
                <Input label="Repository" content={<TextField readOnly value="salute-developers/plasma" />} />
                <Input
                    label="Commit message"
                    content={
                        <StyledCommitMessage>
                            <Select
                                value={state.commitType}
                                onChange={onChangeSelect('commitType')}
                                items={commitTypes}
                            />
                            <TextField name="commitMessage" value={state.commitMessage} onChange={onChangeTextField} />
                        </StyledCommitMessage>
                    }
                />
            </StyledPullRequestData>
            <Button type="submit" view="primary" disabled={isDisabled} style={{ marginTop: '12px' }}>
                {isLoading ? 'Adding...' : buttonText}
            </Button>
        </StyledForm>
    );
};
