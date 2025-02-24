import Link from 'next/link';
import { Box, Text, Link as ThemeUILink, Flex, IconButton, Heading } from 'theme-ui';
import { useBreakpointIndex } from '@theme-ui/match-media';
import { Icon } from '@makerdao/dai-ui-icons';

import BigNumber from 'bignumber.js';
import { getNetwork } from 'lib/maker';
import { Address } from 'modules/address/components/Address';
import Skeleton from 'modules/app/components/SkeletonThemed';
import { DelegationHistory } from 'modules/delegates/types';
import { useState } from 'react';
import { getEtherscanLink } from 'lib/utils';
import { formatDateWithTime } from 'lib/datetime';
import Tooltip from 'modules/app/components/Tooltip';

type CollapsableRowProps = {
  delegate: DelegationHistory;
  network: string;
  bpi: number;
  totalDelegated: number;
};

const CollapsableRow = ({ delegate, network, bpi, totalDelegated }: CollapsableRowProps) => {
  const [expanded, setExpanded] = useState(false);

  const { address, lockAmount, events } = delegate;
  const sortedEvents = events.sort((prev, next) => (prev.blockTimestamp > next.blockTimestamp ? -1 : 1));

  return (
    <tr>
      <Flex as="td" sx={{ flexDirection: 'column', mb: 3 }}>
        <Heading variant="microHeading">
          <Link href={{ pathname: `/address/${address}`, query: { network } }} passHref>
            <ThemeUILink title="View address detail" sx={{ fontSize: bpi < 1 ? 1 : 3 }}>
              <Address address={address} />
            </ThemeUILink>
          </Link>
        </Heading>
        {expanded && (
          <Flex sx={{ pl: 3, flexDirection: 'column' }}>
            {sortedEvents.map(({ blockTimestamp }) => {
              return (
                <Text
                  key={blockTimestamp}
                  variant="smallCaps"
                  sx={{
                    ':first-of-type': { pt: 3 },
                    ':not(:last-of-type)': { pb: 2 }
                  }}
                >
                  {formatDateWithTime(blockTimestamp)}
                </Text>
              );
            })}
          </Flex>
        )}
      </Flex>
      <Box as="td" sx={{ verticalAlign: 'top' }}>
        <Text sx={{ fontSize: bpi < 1 ? 1 : 3 }}>
          {`${new BigNumber(lockAmount).toFormat(2)}${bpi > 0 ? ' MKR' : ''}`}
        </Text>
        {expanded && (
          <Flex sx={{ flexDirection: 'column' }}>
            {sortedEvents.map(({ blockTimestamp, lockAmount }) => {
              return (
                <Flex
                  key={blockTimestamp}
                  sx={{
                    alignItems: 'center',
                    ':first-of-type': { pt: 3 },
                    ':not(:last-of-type)': { pb: 2 }
                  }}
                >
                  {lockAmount.indexOf('-') === 0 ? (
                    <Icon name="decrease" size={2} color="bear" />
                  ) : (
                    <Icon name="increase" size={2} color="bull" />
                  )}
                  <Text key={blockTimestamp} variant="smallCaps" sx={{ pl: 2 }}>
                    {`${new BigNumber(
                      lockAmount.indexOf('-') === 0 ? lockAmount.substring(1) : lockAmount
                    ).toFormat(2)}${bpi > 0 ? ' MKR' : ''}`}
                  </Text>
                </Flex>
              );
            })}
          </Flex>
        )}
      </Box>
      <Box as="td" sx={{ verticalAlign: 'top' }}>
        <Flex sx={{ alignSelf: 'flex-start' }}>
          {totalDelegated ? (
            <Text>{`${new BigNumber(lockAmount).div(totalDelegated).times(100).toFormat(1)}%`}</Text>
          ) : (
            <Box sx={{ width: '100%' }}>
              <Skeleton />
            </Box>
          )}
        </Flex>
      </Box>
      <Box as="td" sx={{ textAlign: 'end', verticalAlign: 'top', width: '100%' }}>
        <Box sx={{ height: '32px' }}>
          <Flex
            sx={{
              bg: 'background',
              size: 'auto',
              width: '17px',
              height: '17px',
              float: 'right',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'round'
            }}
          >
            <IconButton aria-label="Delegated to expand" onClick={() => setExpanded(!expanded)}>
              <Icon name={expanded ? 'minus' : 'plus'} />
            </IconButton>
          </Flex>
        </Box>
        {expanded && (
          <Flex sx={{ flexDirection: 'column' }}>
            {sortedEvents.map(({ blockTimestamp, hash }) => {
              return (
                <Flex
                  key={blockTimestamp}
                  sx={{
                    justifyContent: 'flex-end',
                    lineHeight: '20px',
                    ':not(:last-of-type)': { pb: 2 }
                  }}
                >
                  <ThemeUILink
                    href={getEtherscanLink(getNetwork(), hash as string, 'transaction')}
                    target="_blank"
                    title="View on Etherscan"
                    sx={{
                      textAlign: 'right'
                    }}
                  >
                    <Icon name="arrowTopRight" size={2} />
                  </ThemeUILink>
                </Flex>
              );
            })}
          </Flex>
        )}
      </Box>
    </tr>
  );
};

type DelegatedByAddressProps = {
  delegatedTo: DelegationHistory[];
  totalDelegated: number;
};

const AddressDelegatedTo = ({ delegatedTo, totalDelegated }: DelegatedByAddressProps): JSX.Element => {
  const bpi = useBreakpointIndex();
  const network = getNetwork();

  return (
    <Box>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse'
        }}
      >
        <thead>
          <tr>
            <Text as="th" sx={{ textAlign: 'left', pb: 2, width: '30%' }} variant="caps">
              Address
            </Text>
            <Text as="th" sx={{ textAlign: 'left', pb: 2, width: '30%' }} variant="caps">
              MKR Delegated
            </Text>
            <Tooltip label={'This is the percentage of the total MKR delegated by this address.'}>
              <Text as="th" sx={{ textAlign: 'left', pb: 2, width: '20%' }} variant="caps">
                Voting Weight
              </Text>
            </Tooltip>
            <Text as="th" sx={{ textAlign: 'right', pb: 2, width: '20%' }} variant="caps">
              Expand
            </Text>
          </tr>
        </thead>
        <tbody>
          {delegatedTo ? (
            delegatedTo.map((delegate, i) => (
              <CollapsableRow
                key={i}
                delegate={delegate}
                network={network}
                bpi={bpi}
                totalDelegated={totalDelegated}
              />
            ))
          ) : (
            <tr key={0}>
              <td colSpan={3}>
                <Text color="text" variant="allcaps">
                  Loading
                </Text>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Box>
  );
};

export default AddressDelegatedTo;
