import React from "react";
import { Welcome } from "./sample/Welcome";

var showFunction = Boolean(process.env.REACT_APP_FUNCTION_NAME);

export default function Tab() {
  return (
    <div>
      <Welcome showFunction={showFunction} />
    </div>
  );
}
