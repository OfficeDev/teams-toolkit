// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogLevel, setLogLevel, setLogFunction, TeamsFx, IdentityType } from "@microsoft/teamsfx";
import { TeamsFxContextConfig } from "./TeamsFxContext";
import { useTeams } from "msteams-react-base-component";
import { useData } from "./useData";

/**
 * Initialize TeamsFx SDK with customized configuration.
 *
 * @param teamsfxConfig - custom configuration to override default ones.
 * @returns TeamsFxContextConfig object
 *
 * @beta
 */
export function useTeamsFx(teamsfxConfig?: Record<string, string>): TeamsFxContextConfig {
  const [result] = useTeams({});
  const { data, error, loading } = useData(async () => {
    if (process.env.NODE_ENV === "development") {
      setLogLevel(LogLevel.Verbose);
      setLogFunction((level: LogLevel, message: string) => {
        console.log(message);
      });
    }
    return new TeamsFx(IdentityType.User, teamsfxConfig);
  });
  return { teamsfx: data, error, loading, ...result };
}
