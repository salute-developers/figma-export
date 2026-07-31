import styled from 'styled-components';

export const StyledAccumulatedIcons = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    margin-top: 16px;
`;

export const StyledAccumulatedIconsHeader = styled.header`
    padding: 8px 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

export const StyledSection = styled.div`
    margin-bottom: 12px;
`;

export const StyledSectionTitle = styled.h4`
    font-size: 12px;
    font-weight: 600;
    margin: 8px 0;
    color: #666;
`;

export const StyledIconsContainer = styled.div`
    border: 1px solid lightgray;
    border-radius: 4px;
    padding: 8px;
    max-height: 150px;
    overflow: auto;
`;

export const StyledCommitItem = styled.div<{ $published?: boolean }>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    border-bottom: 1px solid #eee;
    background-color: ${({ $published }) => ($published ? '#f5f5f5' : '#fff')};

    &:last-child {
        border-bottom: none;
    }
`;

export const StyledCommitInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
`;

export const StyledIconNames = styled.strong`
    font-size: 13px;
`;

export const StyledSizes = styled.span`
    font-size: 11px;
    color: #888;
`;

export const StyledMessage = styled.span`
    font-size: 11px;
    color: #666;
    font-style: italic;
`;

export const StyledRemoveButton = styled.button`
    background: #ff4444;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 11px;
    cursor: pointer;
    margin-left: 8px;

    &:hover {
        background: #cc0000;
    }
`;

export const StyledPublishedBadge = styled.span`
    background: #4caf50;
    color: white;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 10px;
    margin-left: 8px;
`;
