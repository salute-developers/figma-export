import styled from 'styled-components';
import { accent } from '@salutejs/plasma-tokens-web';
import { IconApps } from '@salutejs/plasma-icons';

export const StyledIcon = styled(IconApps)`
    margin-right: 4px;

    && svg {
        color: ${accent};
    }
`;

export const StyledHeader = styled.div`
    display: flex;
`;
