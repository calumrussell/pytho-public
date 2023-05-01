import React from "react";
import PropTypes from "prop-types";

import { PlusIcon, MinusIcon, getCssVar } from "@Common/index";

export const Accordion = (props) => {
  const [isVisible, setVisibility] = React.useState(false);

  const wrapperStyle = {
    borderRadius: "3px",
    margin: "0.5rem 0",
    backgroundColor: getCssVar("--alt-background-color"),
    boxShadow: "0.2rem 0.3rem " + getCssVar("--off-background-color"),
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: "3px",
    borderLeft: "0.5rem solid " + getCssVar("--highlight-background-color"),
    padding: "0.5rem 1rem 0.5rem 0.5rem",
  };

  return (
    <div style={wrapperStyle}>
      <div style={headerStyle} onClick={() => setVisibility(!isVisible)}>
        {props.title}
        {isVisible ? <MinusIcon /> : <PlusIcon />}
      </div>
      {isVisible && props.children}
    </div>
  );
};

Accordion.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.element.isRequired,
};
