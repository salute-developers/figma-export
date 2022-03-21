import React, { ChangeEvent, FC, FormEvent, useCallback, useState } from 'react';
import { TextField, Select } from '@salutejs/plasma-web';

import type { FormPayload, IconPayload, SelectItem } from '../../../types';
import { Input } from '../input/Input';

import { StyledCommitMessage, StyledForm } from './Form.style';

const categories: SelectItem[] = [
    { value: 'navigation', label: 'Navigation' },
    { value: 'universal', label: 'Universal' },
    { value: 'action', label: 'Action' },
    { value: 'alert', label: 'Alert' },
    { value: 'av', label: 'Av' },
    { value: 'connection', label: 'Connection' },
    { value: 'hardware', label: 'Hardware' },
    { value: 'communication', label: 'Communication' },
    { value: 'files', label: 'Files' },
    { value: 'map', label: 'Map' },
    { value: 'other', label: 'Other' },
    { value: 'logo', label: 'Logo' },
];

const commitTypes: SelectItem[] = [
    { label: 'feat', value: 'feat' },
    { label: 'fix', value: 'fix' },
];

const defaultState = {
    category: 'navigation',
    iconName: 'NameTest',
    commitType: 'feat',
    commitMessage: 'Add icon `IconNameTest`',
    pullRequestHeader: 'Add icon `IconNameTest`',
};

interface FormProps {
    onSubmit?: (data: FormPayload) => Promise<void>;
    iconMetaData: IconPayload;
}

/**
 * Элементы формы для ввода данных.
 */
export const Form: FC<FormProps> = ({ onSubmit = () => {}, iconMetaData }) => {
    const [state, setState] = useState<FormPayload>(defaultState);

    const onSubmitForm = useCallback(
        async (event: FormEvent) => {
            event.preventDefault();

            onSubmit(state);
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

    return (
        <StyledForm id="form" onSubmit={onSubmitForm}>
            <Input label="Repository" content={<TextField readOnly value="salute-developers/plasma" />} />
            <Input label="Icon size" content={<TextField readOnly value={iconMetaData.size} />} />
            <Input
                label="Icon name"
                content={<TextField name="iconName" value={state.iconName} onChange={onChangeTextField} />}
            />
            <Input
                label="Category"
                content={<Select value={state.category} onChange={onChangeSelect('category')} items={categories} />}
            />
            <Input
                label="Commit message"
                content={
                    <StyledCommitMessage>
                        <Select value={state.commitType} onChange={onChangeSelect('commitType')} items={commitTypes} />
                        <TextField name="commitMessage" value={state.commitMessage} onChange={onChangeTextField} />
                    </StyledCommitMessage>
                }
            />
            <Input
                label="Pull Request header"
                content={
                    <TextField name="pullRequestHeader" value={state.pullRequestHeader} onChange={onChangeTextField} />
                }
            />
        </StyledForm>
    );
};
