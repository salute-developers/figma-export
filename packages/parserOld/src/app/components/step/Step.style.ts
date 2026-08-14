import { Spinner, ParagraphText1 } from '@salutejs/plasma-web';
import styled from 'styled-components';
import { IconDone } from '@salutejs/plasma-icons';

export const StyledStep = styled.div`
    display: flex;
    align-items: center;
    height: 36px;
`;

export const StyledSpinner = styled(Spinner)`
    width: 16px;
    margin-right: 16px;
`;

export const StyledIcon = styled(IconDone)`
    margin-right: 16px;
`;

export const StyledParagraph = styled(ParagraphText1)<{ isActive: boolean }>`
    color: ${({ isActive }) => (isActive ? '#000000' : '#d3d3d3')};
    margin-left: ${({ isActive }) => (isActive ? '0' : '32px')};
`;
