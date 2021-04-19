import React from "react";
import { Button, Image, Loader } from "@fluentui/react-northstar";
import { useData } from "./lib/useData";
import * as axios from "axios";
import {
  TeamsUserCredential,
  getResourceConfiguration,
  ResourceType,
} from "teamsdev-client"

async function callFunction() {
  var functionName = process.env.REACT_APP_FUNC_NAME || "myFunc";
  const credential = new TeamsUserCredential();
  const accessToken = await credential.getToken("");
  const apiConfig = getResourceConfiguration(ResourceType.API);
  const response = await axios.default.get(apiConfig.endpoint + "/api/" + functionName, {
    headers: {
      authorization: "Bearer " + accessToken.token
    }
  });
  return response.data;
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
