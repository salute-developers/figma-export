import styled from 'styled-components';

export const StyledForm = styled.form`
    display: flex;
    align-items: center;
    flex-direction: column;

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
    display: flex;
    flex-direction: column;
    margin-left: 24px;

    width: 100%;
`;
