import React from "react";
import { Button, Image, Loader } from "@fluentui/react-northstar";
import { useData } from "./lib/useData";
import { teamsfx } from "teamsdev-client";

function callFunction() {
  var functionName = process.env.REACT_APP_FUNC_NAME || "myFunc";
  return teamsfx.callFunction(functionName, "post", "hello");
}

export function AzureFunctions(props) {
  const { codePath, docsUrl } = {
    codePath: "api/index.js",
    docsUrl: "",
    ...props,
  };
  const { loading, data, error, reload } = useData(callFunction, {
    auto: false,
  });
  return (
    <div>
      <h2>Call your Azure Function</h2>
      <p>
        An Azure Functions app is running locally in debug mode. Click below to
        call it for a response:
      </p>
      {!loading && (
        <Button primary content="Call Azure Function" onClick={reload} />
      )}
      {loading && <Loader />}
      {!loading && !!data && !error && (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      )}
      {!loading && !data && !error && (
        <pre>Function response will be displayed here</pre>
      )}
      {!loading && !!error && <div className="error">{error.toString()}</div>}
      <h4>How to edit the Azure Function</h4>
      <p>
        See the code in <code>{codePath}</code> to add your business logic.
      </p>
      {!!docsUrl && (
        <p>
          For more information, see the <a href={docsUrl}>docs</a>.
        </p>
      )}
    </div>
  );
}
