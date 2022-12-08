import React from 'react';
import styled from 'styled-components';
import zip from 'lodash.zip';
import PropTypes from 'prop-types';

import {
  Text,
} from '@Common';

/*
A tearsheet is a pairing of title: stat.

Abstraction is used to organise the layout into rows
within vertically ordered groups, and those groups
are ordered horizontally in the view.

The data is passed in list of lists so that each group
can be rendered individually
*/

const StatsWrapper = styled.div`
  display: flex;
  justify-content: space-between;
`;

const StatGroup = styled.div`
  margin: 0.5rem 0;
  min-width: 25%;
`;

const SpacedLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ShallowText = styled(Text)`
  line-height: 1.30;
`;

export const TearSheet = ({
  titles, stats,
}) => {
  const zipped = zip(titles, stats);

  return (
    <StatsWrapper>
      {
        zipped.map((group, i) => {
          const flip = zip(...group);
          return (
            <StatGroup
              key={ i }>
              {
                flip.map((v, j) => {
                  return (
                    <SpacedLine
                      key={ j }>
                      <ShallowText
                        light
                        margin={ '0 0.5rem 0 0' }>
                        {v[0]}
                      </ShallowText>
                      <ShallowText>
                        {v[1]()}
                      </ShallowText>
                    </SpacedLine>
                  );
                })
              }
            </StatGroup>
          );
        })
      }
    </StatsWrapper>
  );
};

TearSheet.propTypes = {
  titles: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
  stats: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.func)).isRequired,
};
