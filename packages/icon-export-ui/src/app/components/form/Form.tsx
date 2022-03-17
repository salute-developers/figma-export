import React, { ChangeEvent, FC, FormEvent, useCallback, useState } from 'react';
import { ParagraphText1, TextField, Select } from '@salutejs/plasma-web';

import type { FormPayload, IconPayload, SelectItem } from '../../../types';

import { StyledCommitMessage, StyledForm, StyledInput } from './Form.style';

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
            <StyledInput>
                <ParagraphText1>Repository</ParagraphText1>
                <TextField readOnly value="salute-developers/plasma" />
            </StyledInput>
            <StyledInput>
                <ParagraphText1>Icon size</ParagraphText1>
                <TextField readOnly value={iconMetaData.size} />
            </StyledInput>
            <StyledInput>
                <ParagraphText1>Icon name</ParagraphText1>
                <TextField name="iconName" value={state.iconName} onChange={onChangeTextField} />
            </StyledInput>
            <StyledInput>
                <ParagraphText1>Category</ParagraphText1>
                <Select value={state.category} onChange={onChangeSelect('category')} items={categories} />
            </StyledInput>
            <StyledInput>
                <ParagraphText1>Commit message</ParagraphText1>
                <StyledCommitMessage>
                    <Select value={state.commitType} onChange={onChangeSelect('commitType')} items={commitTypes} />
                    <TextField name="commitMessage" value={state.commitMessage} onChange={onChangeTextField} />
                </StyledCommitMessage>
            </StyledInput>
            <StyledInput>
                <ParagraphText1>Pull Request header</ParagraphText1>
                <TextField name="pullRequestHeader" value={state.pullRequestHeader} onChange={onChangeTextField} />
            </StyledInput>
        </StyledForm>
    );
};
