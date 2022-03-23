import React from "react";

const functionName = process.env.REACT_APP_FUNC_NAME || "myFunc";

export function EditCode(props: {
  showFunction?: boolean;
  tabCodeEntry?: string;
  functionCodePath?: string;
}) {
  const { showFunction, tabCodeEntry, functionCodePath } = {
    showFunction: true,
    tabCodeEntry: "tabs/src/index.tsx",
    functionCodePath: `api/${functionName}/index.ts`,
    ...props,
  };
  return (
    <div>
      <h2>Change this code</h2>
      <p>
        The front end is a <code>create-react-app</code>. The entry point is{" "}
        <code>{tabCodeEntry}</code>. Just save any file and this page will reload automatically.
      </p>
      {showFunction && (
        <p>
          This app contains an Azure Functions backend. Find the code in{" "}
          <code>{functionCodePath}</code>
        </p>
      )}
    </div>
  );
}
