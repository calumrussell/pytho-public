import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

import {
  Text,
  DefaultHorizontalSpacer,
} from '@Common';

const TableWrapper = styled.div`
  display: block;
  position: relative;
`;

const Overlay = styled.div`
  top: 0px;
  width: 140px;
  min-width: 140px;
  left: -2px;
  display: flex;
  justify-content: flex-start;
  position: absolute;
`;

const Table = styled.table`
  overflow-x: scroll;
  max-width: 100%;
  display: block;
  width: 100%;
`;
const CellWrapper = styled.td`
  min-width: 75px
`;

const Cell = ({
  value,
}) => {
  return (
    <CellWrapper>
      <Text
        number
        small>
        {value}
      </Text>
    </CellWrapper>
  );
};

Cell.propTypes = {
  value: PropTypes.string.isRequired,
};

const FirstCell = styled.td`
  min-width: 140px;
  width: 140px;
  display: flex;
  justify-content: flex-start;
  background-color: var(--default-background-color);
`;

export const Row = ({
  values, title, isSubSection,
}) => {
  return (
    <tr>
      <FirstCell>
        {
          isSubSection ?
            <DefaultHorizontalSpacer>
              <Text
                light>
                {title}
              </Text>
            </DefaultHorizontalSpacer> :
            <Text>
              {title}
            </Text>
        }
      </FirstCell>
      {
        values && values.map((r, i) => <Cell
          key={ i }
          value={ r } />)
      }
    </tr>
  );
};

Row.propTypes = {
  values: PropTypes.arrayOf(PropTypes.string),
  title: PropTypes.string,
  isSubSection: PropTypes.bool,
};


export const ScrollableTable = ({
  headerRows, bodyRows, overlayHeader, overlayBody,
}) => {
  return (
    <TableWrapper>
      <div>
        <Table>
          <thead>
            {headerRows}
          </thead>
          <tbody>
            {bodyRows}
          </tbody>
        </Table>
      </div>

      <Overlay>
        <table>
          <thead>
            {overlayHeader}
          </thead>
          <tbody>
            {overlayBody}
          </tbody>
        </table>
      </Overlay>
    </TableWrapper>
  );
};

ScrollableTable.propTypes = {
  headerRows: PropTypes.arrayOf(PropTypes.node).isRequired,
  bodyRows: PropTypes.arrayOf(PropTypes.node).isRequired,
  overlayHeader: PropTypes.arrayOf(PropTypes.node).isRequired,
  overlayBody: PropTypes.arrayOf(PropTypes.node).isRequired,
};
