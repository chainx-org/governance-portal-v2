import { useState, useEffect } from 'react';
import { Icon } from '@makerdao/dai-ui-icons';
import { Text, Button, Box, Flex } from 'theme-ui';
import invariant from 'tiny-invariant';
import { DialogOverlay, DialogContent } from '@reach/dialog';
import range from 'lodash/range';
import isNil from 'lodash/isNil';
import isEqual from 'lodash/isEqual';
import shallow from 'zustand/shallow';
import lottie from 'lottie-web';

import { Account } from 'modules/app/types/account';
import { Poll } from 'modules/polling/types';
import useBallotStore from 'modules/polling/stores/ballotStore';
import { isRankedChoicePoll, extractCurrentPollVote, isActivePoll } from 'modules/polling/helpers/utils';
import Stack from 'modules/app/components/layout/layouts/Stack';
import { useAllUserVotes } from 'modules/polling/hooks/useAllUserVotes';
import useAccountsStore from 'modules/app/stores/accounts';

import RankedChoiceSelect from './RankedChoiceSelect';
import SingleSelect from './SingleSelect';
import { useRouter } from 'next/router';
import { getNetwork } from 'lib/maker';
import VotingStatus from './PollVotingStatus';
import ballotAnimation from 'lib/animation/ballotSuccess.json';
import { slideUp } from 'lib/keyframes';
import { useAnalytics } from 'modules/app/client/analytics/useAnalytics';
import { ANALYTICS_PAGES } from 'modules/app/client/analytics/analytics.constants';
import useSWR from 'swr';
import { fetchJson } from 'lib/fetchJson';

enum ViewState {
  START,
  INPUT,
  ADDING,
  NEXT
}

type Props = {
  account?: Account;
  poll: Poll;
  close?: () => void;
  setPoll?: (poll: Poll) => void;

  editingOnly?: boolean;
  withStart?: boolean;
};
export default function MobileVoteSheet({
  account,
  poll,
  setPoll,
  close,
  editingOnly,
  withStart
}: Props): JSX.Element {
  const { trackButtonClick } = useAnalytics(ANALYTICS_PAGES.POLLING);

  const voteDelegate = useAccountsStore(state => (account ? state.voteDelegate : null));
  const addressToCheck = voteDelegate ? voteDelegate.getVoteDelegateAddress() : account?.address;
  const { data: allUserVotes } = useAllUserVotes(addressToCheck);

  const currentVote = extractCurrentPollVote(poll, allUserVotes);
  const [addToBallot, removeFromBallot, ballot] = useBallotStore(
    state => [state.addToBallot, state.removeFromBallot, state.ballot],
    shallow
  );
  const ballotCount = Object.keys(ballot).length;

  const [choice, setChoice] = useState<number | number[] | null>(ballot[poll.pollId]?.option ?? null);
  const isChoiceValid = Array.isArray(choice) ? choice.length > 0 : choice !== null;
  const [viewState, setViewState] = useState<ViewState>(withStart ? ViewState.START : ViewState.INPUT);
  const router = useRouter();
  const network = getNetwork();
  const onBallot = !isNil(ballot[poll.pollId]?.option);

  const [activePolls, setActivePolls] = useState<Poll[]>([]);
  const { data: pollsData } = useSWR(`/api/polling/all-polls?network=${getNetwork()}`, fetchJson, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnMount: true
  });

  useEffect(() => {
    if (pollsData) {
      setActivePolls(pollsData.polls.filter(isActivePoll));
    }
  }, [pollsData]);

  const submit = () => {
    invariant(isChoiceValid);
    if (currentVote && isEqual(currentVote, choice)) {
      removeFromBallot(poll.pollId);
      addToBallot(poll.pollId, choice as number | number[]);
    } else {
      addToBallot(poll.pollId, choice as number | number[]);
    }
    if (editingOnly) {
      if (close) {
        close();
      } else {
        setViewState(ViewState.START);
      }
    } else {
      setViewState(ViewState.ADDING);
    }
  };

  const goToNextPoll = () => {
    setChoice(null);
    const nextPoll = activePolls.find(p => !ballot[p.pollId]);
    invariant(nextPoll && setPoll);
    setPoll(nextPoll);
    setViewState(ViewState.INPUT);
  };

  if (viewState == ViewState.START)
    return (
      <Flex
        sx={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          width: '100vw',
          mb: 0,
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
          border: '1px solid',
          borderColor: 'secondaryMuted',
          px: 3,
          py: '14px',
          backgroundColor: 'surface',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexDirection: 'row',
          zIndex: 1
        }}
      >
        <VotingStatus poll={poll} />
        {onBallot ? (
          <Button
            variant="outline"
            mr={2}
            onClick={() => setViewState(ViewState.INPUT)}
            sx={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'nowrap',
              alignItems: 'center',
              borderRadius: 'small'
            }}
          >
            <Icon name="edit" size={3} mr={2} />
            Edit Choices
          </Button>
        ) : (
          <Button
            sx={{ width: '110px', borderRadius: 'small' }}
            variant="primary"
            onClick={() => setViewState(ViewState.INPUT)}
          >
            Vote
          </Button>
        )}
      </Flex>
    );
  else
    return (
      <DialogOverlay
        sx={{ background: 'hsla(237.4%, 13.8%, 32.7%, 0.9)' }}
        onDismiss={close ? close : () => setViewState(ViewState.START)}
      >
        <DialogContent
          sx={{ variant: 'dialog.mobile', animation: `${slideUp} 350ms ease` }}
          aria-label="Vote Form"
        >
          {viewState == ViewState.NEXT ? (
            <Stack gap={2}>
              <Text variant="caps">
                {ballotCount} of {activePolls.length} available polls added to ballot
              </Text>
              <Flex
                sx={{
                  flexDirection: 'row',
                  flexWrap: 'nowrap',
                  height: 2,
                  my: 2
                }}
              >
                {range(activePolls.length).map(i => (
                  <Box
                    key={i}
                    sx={{
                      flex: 1,
                      borderLeft: i === 0 ? undefined : '2px solid white',
                      borderTopLeftRadius: i === 0 ? 'small' : undefined,
                      borderBottomLeftRadius: i === 0 ? 'small' : undefined,
                      borderTopRightRadius: i === activePolls.length - 1 ? 'small' : undefined,
                      borderBottomRightRadius: i === activePolls.length - 1 ? 'small' : undefined,
                      backgroundColor: i < ballotCount ? 'primary' : 'muted'
                    }}
                  />
                ))}
              </Flex>
              {pollsData && ballotCount < activePolls.length && (
                <Button
                  variant="outline"
                  sx={{ py: 3, fontSize: 2, borderRadius: 'small' }}
                  onClick={goToNextPoll}
                >
                  Next Poll
                </Button>
              )}
              <Button
                variant="primaryLarge"
                sx={{ py: 3, fontSize: 2, borderRadius: 'small' }}
                onClick={() => router.push({ pathname: '/polling/review', query: { network } })}
              >
                Review &amp; Submit Ballot
              </Button>
            </Stack>
          ) : (
            <Stack gap={2}>
              <Text variant="microHeading">{poll.title}</Text>
              <Text sx={{ fontSize: [2, 3] }}>{poll.summary}</Text>
              {viewState == ViewState.ADDING ? (
                <AddingView done={() => setViewState(ViewState.NEXT)} />
              ) : isRankedChoicePoll(poll) ? (
                <RankedChoiceSelect {...{ poll, setChoice }} choice={choice as number[] | null} />
              ) : (
                <SingleSelect {...{ poll, setChoice }} choice={choice as number | null} />
              )}
              <Button
                variant="primaryLarge"
                data-testid="button-add-vote-to-ballot"
                sx={{ py: 3, fontSize: 2, borderRadius: 'small' }}
                onClick={() => {
                  trackButtonClick('addVoteToBallot');
                  submit();
                }}
                disabled={!isChoiceValid || viewState == ViewState.ADDING}
              >
                {editingOnly ? 'Update vote' : 'Add vote to ballot'}
              </Button>
            </Stack>
          )}
        </DialogContent>
      </DialogOverlay>
    );
}

const AddingView = ({ done }: { done: () => void }) => {
  useEffect(() => {
    const animation = lottie.loadAnimation({
      container: document.getElementById('ballot-animation-container') as HTMLElement,
      loop: false,
      autoplay: true,
      animationData: ballotAnimation
    });

    animation.addEventListener('complete', () => setTimeout(done, 200));
  }, []);

  return (
    <Stack gap={2} sx={{ alignItems: 'center' }}>
      <div sx={{ height: '160px', width: '100%' }} id="ballot-animation-container" />
    </Stack>
  );
};
