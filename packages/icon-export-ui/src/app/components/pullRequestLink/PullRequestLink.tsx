import { Link } from '@salutejs/plasma-web';
import React, { FC } from 'react';

import { StyledPullRequestLink } from './PullRequestLink.style';

interface PullRequestLinkProps {
    url?: string;
    content: string;
}

export const PullRequestLink: FC<PullRequestLinkProps> = ({ url, content }) => (
    <StyledPullRequestLink>
        {url && (
            <Link href={url} target="__blank">
                {content}
            </Link>
        )}
    </StyledPullRequestLink>
);
