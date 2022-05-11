import React from "react";
import { Welcome } from "./sample/Welcome";
import { useTeamsFx } from "./sample/lib/useTeamsFx";

var showFunction = Boolean(process.env.REACT_APP_FUNC_NAME);

export default function Tab() {
  const { themeString } = useTeamsFx();
  return (
    <div className={themeString === "default" ? "" : "dark"}>
      <Welcome showFunction={showFunction} />
    </div>
  );
}
