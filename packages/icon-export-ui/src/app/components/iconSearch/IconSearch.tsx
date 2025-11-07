import React, { ChangeEvent, FC, FormEvent, useCallback, useState } from 'react';
import { TextField, Button } from '@salutejs/plasma-web';

import { StyledIconSearch, StyledSearchForm, StyledSearchButton } from './IconSearch.style';

interface IconSearchProps {
    onSearch: (iconName: string) => void;
}

/**
 * Компонент для поиска иконок по названию.
 */
export const IconSearch: FC<IconSearchProps> = ({ onSearch }) => {
    const [searchValue, setSearchValue] = useState('');

    const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setSearchValue(event.target.value);
    }, []);

    const handleSubmit = useCallback(
        (event: FormEvent) => {
            event.preventDefault();
            onSearch(searchValue);
        },
        [searchValue, onSearch],
    );

    return (
        <StyledIconSearch>
            <StyledSearchForm onSubmit={handleSubmit}>
                <TextField
                    value={searchValue}
                    onChange={handleChange}
                    placeholder="Enter icon name (e.g., ShareScreenOutline)"
                    contentRight={
                        <StyledSearchButton>
                            <Button type="submit" view="primary" size="s">
                                Search
                            </Button>
                        </StyledSearchButton>
                    }
                />
            </StyledSearchForm>
        </StyledIconSearch>
    );
};
