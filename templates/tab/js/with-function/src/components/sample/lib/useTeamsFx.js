import React from "react";
import { teamsfx } from "teamsdev-client";
import { useData } from "./useData";
import { useTeams } from "msteams-react-base-component";

var teamsfxEndpoint = process.env.REACT_APP_TEAMSFX_ENDPOINT;
var startLoginPageUrl = process.env.REACT_APP_START_LOGIN_PAGE_URL;
var functionEndpoint = process.env.REACT_APP_FUNC_ENDPOINT;

// TODO fix this when the SDK stops hiding global state!
let initialized = false;

export function useTeamsFx() {
  const [result] = useTeams({});
  const { error, loading } = useData(async () => {
    if (result.inTeams && !initialized) {
      await teamsfx.init(teamsfxEndpoint, startLoginPageUrl, functionEndpoint);
      initialized = true;
    }
  });
  return { error, loading, ...result };
}
