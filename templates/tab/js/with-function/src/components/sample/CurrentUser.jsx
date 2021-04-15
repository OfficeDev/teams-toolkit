import React from "react";
import { teamsfx } from "teamsdev-client";

export function CurrentUser(props) {
  const { userName } = {
    userName: "",
    ...props,
  };
  return (
    <div>
      <h2>Get the current user</h2>
      <p>Access basic information about the user like this:</p>
      <pre>const user = teamsfx.getUserInfo();</pre>
      {!!userName && (
        <p>
          The currently logged in user's name is <b>{userName}</b>
        </p>
      )}
    </div>
  );
}
