import React from "react";
import styled from "styled-components";
import PropTypes from "prop-types";

const Line = styled.div`
  width: 35px;
  height: 5px;
  background-color: var(--default-text-color);
  margin: 6px 0;
  transition: 0.4s;
`;

const FirstLine = styled(Line)`
  --webkit-transform: ${(props) =>
    props.clicked ? "rotate(-45deg) translate(-9px, 7px)" : "none"};
  transform: ${(props) =>
    props.clicked ? "rotate(-45deg) translate(-9px, 7px)" : "none"};
`;

const SecondLine = styled(Line)`
  opacity: ${(props) => (props.clicked ? "0" : "none")};
`;

const LastLine = styled(Line)`
  --webkit-transform: ${(props) =>
    props.clicked ? "rotate(45deg) translate(-8px, -7px)" : "none"};
  transform: ${(props) =>
    props.clicked ? "rotate(45deg) translate(-8px, -7px)" : "none"};
`;

const Wrapper = styled.div`
  cursor: pointer;
`;

export const MenuIcon = ({ showMenu, toggleMenu }) => {
  return (
    <Wrapper onClick={() => toggleMenu(!showMenu)}>
      <FirstLine clicked={showMenu} />
      <SecondLine clicked={showMenu} />
      <LastLine clicked={showMenu} />
    </Wrapper>
  );
};

MenuIcon.propTypes = {
  showMenu: PropTypes.bool.isRequired,
  toggleMenu: PropTypes.func.isRequired,
};
