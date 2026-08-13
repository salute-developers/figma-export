import React, { FC } from 'react';
import { Headline5 } from '@salutejs/plasma-web';

import type { AccumulatedCommit } from '../../../types';

import {
    StyledAccumulatedIcons,
    StyledAccumulatedIconsHeader,
    StyledSection,
    StyledSectionTitle,
    StyledIconsContainer,
    StyledCommitItem,
    StyledCommitInfo,
    StyledIconNames,
    StyledSizes,
    StyledMessage,
    StyledRemoveButton,
    StyledPublishedBadge,
} from './AccumulatedIcons.style';

interface AccumulatedIconsListProps {
    commits: AccumulatedCommit[];
    onRemove: (index: number) => void;
}

/**
 * Список накопленных иконок (коммитов) в сессии.
 */
export const AccumulatedIconsList: FC<AccumulatedIconsListProps> = ({ commits, onRemove }) => {
    if (commits.length === 0) {
        return null;
    }

    // Разделяем на опубликованные и новые
    const publishedCommits = commits.filter((c) => c.published);
    const unpublishedCommits = commits.filter((c) => !c.published);

    return (
        <StyledAccumulatedIcons>
            <StyledAccumulatedIconsHeader>
                <Headline5>Accumulated icons ({commits.length})</Headline5>
            </StyledAccumulatedIconsHeader>

            {/* Опубликованные иконки */}
            {publishedCommits.length > 0 && (
                <StyledSection>
                    <StyledSectionTitle>Published ({publishedCommits.length})</StyledSectionTitle>
                    <StyledIconsContainer>
                        {publishedCommits.map((commit) => (
                            <StyledCommitItem key={commit.timestamp} $published>
                                <StyledCommitInfo>
                                    <StyledIconNames>{commit.iconNames.join(', ')}</StyledIconNames>
                                    <StyledSizes>Sizes: {commit.sizes.join(', ')}</StyledSizes>
                                    <StyledMessage>{commit.message}</StyledMessage>
                                </StyledCommitInfo>
                                <StyledPublishedBadge>Published</StyledPublishedBadge>
                            </StyledCommitItem>
                        ))}
                    </StyledIconsContainer>
                </StyledSection>
            )}

            {/* Неопубликованные иконки */}
            {unpublishedCommits.length > 0 && (
                <StyledSection>
                    <StyledSectionTitle>New ({unpublishedCommits.length})</StyledSectionTitle>
                    <StyledIconsContainer>
                        {unpublishedCommits.map((commit) => {
                            // Находим индекс в полном массиве для удаления
                            const originalIndex = commits.findIndex((c) => c.timestamp === commit.timestamp);

                            return (
                                <StyledCommitItem key={commit.timestamp}>
                                    <StyledCommitInfo>
                                        <StyledIconNames>{commit.iconNames.join(', ')}</StyledIconNames>
                                        <StyledSizes>Sizes: {commit.sizes.join(', ')}</StyledSizes>
                                        <StyledMessage>{commit.message}</StyledMessage>
                                    </StyledCommitInfo>
                                    <StyledRemoveButton type="button" onClick={() => onRemove(originalIndex)}>
                                        Remove
                                    </StyledRemoveButton>
                                </StyledCommitItem>
                            );
                        })}
                    </StyledIconsContainer>
                </StyledSection>
            )}
        </StyledAccumulatedIcons>
    );
};
