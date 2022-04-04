import styled from 'styled-components';

export const StyledForm = styled.form`
    display: flex;
    align-items: center;

    margin-top: 12px;
    margin-bottom: 24px;
`;

export const StyledCommitMessage = styled.div`
    display: flex;

    & > div:last-child {
        width: 100%;
    }
`;

export const StyledPullRequestData = styled.div`
    flex: 1;
    margin-left: 24px;
`;
