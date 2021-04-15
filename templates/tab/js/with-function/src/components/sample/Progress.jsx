import React from "react";
import classnames from "classnames";
import { AcceptIcon } from "@fluentui/react-northstar";
import "./Progress.css";

export function Progress({ children, selectedIndex }) {
  return (
    <div className="progress-indicator">
      <div className="line"></div>
      {React.Children.map(children, (child, i) => (
        <div
          className={classnames("progress-item", {
            selected: selectedIndex == i,
          })}
          key={i}
        >
          <div className={classnames("check")}>
            {selectedIndex == i && <AcceptIcon size="smaller" />}
          </div>
          <div className="content">{child}</div>
        </div>
      ))}
    </div>
  );
}
