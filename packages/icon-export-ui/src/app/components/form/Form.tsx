import React, { ChangeEvent, FC, FormEvent, useCallback, useMemo, useState } from 'react';
import { TextField, Select } from '@salutejs/plasma-web';

import type { FormPayload, IconPayload, SelectItem } from '../../../types';
import { Input } from '../input/Input';
import { IconList } from '../iconList/IconList';

import { StyledCommitMessage, StyledForm, StyledPullRequestData } from './Form.style';

const commitTypes: SelectItem[] = [
    { label: 'feat', value: 'feat' },
    { label: 'fix', value: 'fix' },
];

const defaultState = {
    commitType: 'feat',
    commitMessage: 'Add icon `IconNameTest`',
    pullRequestHeader: 'Add icon `IconNameTest`',
};

interface FormProps {
    onSubmit?: (data: FormPayload) => Promise<void>;
    iconsMetaData: IconPayload[];
}

/**
 * Элементы формы для ввода данных.
 */
export const Form: FC<FormProps> = ({ onSubmit = () => {}, iconsMetaData }) => {
    const [state, setState] = useState<FormPayload>({ ...defaultState, iconsMetaData });

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
                <Input
                    label="Pull Request header"
                    content={
                        <TextField
                            name="pullRequestHeader"
                            value={state.pullRequestHeader}
                            onChange={onChangeTextField}
                        />
                    }
                />
            </StyledPullRequestData>
        </StyledForm>
    );
};
