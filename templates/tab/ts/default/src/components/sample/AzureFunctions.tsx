import React from "react";
import { Button, Loader } from "@fluentui/react-northstar";
import { useData } from "./lib/useData";
import * as axios from "axios";
import { TeamsUserCredential, getResourceConfiguration, ResourceType } from "@microsoft/teamsfx";

var functionName = process.env.REACT_APP_FUNC_NAME || "myFunc";

async function callFunction() {
  try {
    const credential = new TeamsUserCredential();
    const accessToken = await credential.getToken("");
    const apiConfig = getResourceConfiguration(ResourceType.API);
    const response = await axios.default.get(apiConfig.endpoint + "/api/" + functionName, {
      headers: {
        authorization: "Bearer " + accessToken?.token || "",
      },
    });
    return response.data;
  } catch (err: unknown) {
    if (axios.default.isAxiosError(err)) {
      let funcErrorMsg = "";

      if (err?.response?.status === 404) {
        funcErrorMsg = `There may be a problem with the deployment of Azure Function App, please deploy Azure Function (Run command palette "Teams: Deploy to the cloud") first before running this App`;
      } else if (err.message === "Network Error") {
        funcErrorMsg =
          "Cannot call Azure Function due to network error, please check your network connection status and ";
        if (err.config?.url && err.config.url.indexOf("localhost") >= 0) {
          funcErrorMsg += `make sure to start Azure Function locally (Run "npm run start" command inside api folder from terminal) first before running this App`;
        } else {
          funcErrorMsg += `make sure to provision and deploy Azure Function (Run command palette "Teams: Provision in the cloud" and "Teams: Deploy to the cloud) first before running this App`;
        }
      } else {
        funcErrorMsg = err.message;
        if (err.response?.data?.error) {
          funcErrorMsg += ": " + err.response.data.error;
        }
      }

      throw new Error(funcErrorMsg);
    }
    throw err;
  }
}

export function AzureFunctions(props: { codePath?: string; docsUrl?: string }) {
  const { codePath, docsUrl } = {
    codePath: `api/${functionName}/index.ts`,
    docsUrl: "https://aka.ms/teamsfx-azure-functions",
    ...props,
  };
  const { loading, data, error, reload } = useData(callFunction, {
    auto: false,
  });
  return (
    <div>
      <h2>Call your Azure Function</h2>
      <p>An Azure Functions app is running. Click below to call it for a response:</p>
      <Button primary content="Call Azure Function" disabled={loading} onClick={reload} />
      {loading && (
        <pre className="fixed">
          {" "}
          <Loader />{" "}
        </pre>
      )}
      {!loading && !!data && !error && <pre className="fixed">{JSON.stringify(data, null, 2)}</pre>}
      {!loading && !data && !error && <pre className="fixed"></pre>}
      {!loading && !!error && <div className="error fixed">{error.toString()}</div>}
      <h4>How to edit the Azure Function</h4>
      <p>
        See the code in <code>{codePath}</code> to add your business logic.
      </p>
      {!!docsUrl && (
        <p>
          For more information, see the{" "}
          <a href={docsUrl} target="_blank" rel="noreferrer">
            docs
          </a>
          .
        </p>
      )}
    </div>
  );
}
