import React from "react";

export function CurrentUser(props) {
  const { userName } = {
    userName: "",
    ...props,
  };
  return (
    <div>
      <h2>Get the current user</h2>
      <p>Access basic information about the user like this:</p>
      <pre>{`const credential = new TeamsUserCredential(); \nconst user = await credential.getUserInfo();`}</pre>
      {!!userName && (
        <p>
          The currently logged in user's name is <b>{userName}</b>
        </p>
      )}
    </div>
  );
}
