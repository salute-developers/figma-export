import React, { FC } from 'react';
import { Headline5 } from '@salutejs/plasma-web';

import { Step } from '../step/Step';
import { PullRequestLink } from '../pullRequestLink/PullRequestLink';

import { StyledPullRequestProcess, StyledSteps } from './PullRequestProcess.style';

interface PullRequestProcessProps {
    step: number;
    pullRequestLink?: string;
}

/**
 * Окно процесса создания пулл реквеста.
 */
export const PullRequestProcess: FC<PullRequestProcessProps> = ({ step, pullRequestLink }) => (
    <StyledPullRequestProcess>
        <Headline5>Create Pull Request progress</Headline5>
        <StyledSteps>
            <Step step={step} progress={0} description="Create/get branch from dev" />
            <Step step={step} progress={1} description="Get last commit" />
            <Step step={step} progress={2} description="Create files blob" />
            <Step step={step} progress={3} description="Create files tree" />
            <Step step={step} progress={4} description="Create commit" />
            <Step step={step} progress={5} description="Set new commit to branch" />
            <Step step={step} progress={6} description="Create/update pull request" />
            <Step step={step} progress={7} description="Done!" />
        </StyledSteps>
        <PullRequestLink url={pullRequestLink} content="Link to Pull Request" />
    </StyledPullRequestProcess>
);
