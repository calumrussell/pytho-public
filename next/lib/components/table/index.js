import React from "react";
import styled from "styled-components";
import PropTypes from "prop-types";

import { Text, DefaultHorizontalSpacer } from "@Common/index";

const TableWrapper = styled.div`
  display: block;
  position: relative;
`;

const Table = styled.table`
  overflow-x: scroll;
  max-width: 100%;
  display: block;
  width: 100%;
`;

const Overlay = styled.div`
  max-width: 100%;
  display: block;
  width: 100%;
  top: 0px;
  width: 140px;
  min-width: 140px;
  left: -2px;
  display: flex;
  justify-content: flex-start;
  position: absolute;
  & td:not(:first-child) > p {
    color: transparent;
  }
  overflow-x: hidden;
`;

const CellWrapper = styled.td`
  min-width: 75px;
`;

const Cell = ({ value, formattingFunc }) => {
  const formattedValue = formattingFunc ? formattingFunc(value) : value;
  return (
    <CellWrapper>
      <Text number small>
        {formattedValue}
      </Text>
    </CellWrapper>
  );
};

Cell.propTypes = {
  value: PropTypes.string.isRequired,
  formattingFunc: PropTypes.func,
};

const FirstCell = styled.td`
  min-width: 140px;
  width: 140px;
  display: flex;
  justify-content: flex-start;
  background-color: var(--default-background-color);
`;

export const Row = ({ values, title, isSubSection, formattingFunc }) => {
  return (
    <tr>
      <FirstCell>
        {isSubSection ? (
          <DefaultHorizontalSpacer>
            <Text light>{title}</Text>
          </DefaultHorizontalSpacer>
        ) : (
          <Text>{title}</Text>
        )}
      </FirstCell>
      {values &&
        values.map((r, i) => (
          <Cell formattingFunc={formattingFunc} key={i} value={r} />
        ))}
    </tr>
  );
};

Row.propTypes = {
  values: PropTypes.arrayOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  ).isRequired,
  title: PropTypes.string.isRequired,
  isSubSection: PropTypes.bool,
  formattingFunc: PropTypes.func,
};

export const ScrollableTable = ({ headerRows, bodyRows }) => {
  return (
    <TableWrapper>
      <div>
        <Table>
          <thead>{headerRows}</thead>
          <tbody>{bodyRows}</tbody>
        </Table>
      </div>

      <Overlay>
        <table>
          <thead>{headerRows}</thead>
          <tbody>{bodyRows}</tbody>
        </table>
      </Overlay>
    </TableWrapper>
  );
};

ScrollableTable.propTypes = {
  headerRows: PropTypes.arrayOf(PropTypes.node).isRequired,
  bodyRows: PropTypes.arrayOf(PropTypes.node).isRequired,
};
