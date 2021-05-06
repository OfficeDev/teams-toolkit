// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import React, { useContext } from "react";
import {
    TeamsUserCredential,
} from "@microsoft/teamsfx";

/**
 * Interface of React context containing TeamsFx credential information.
 */
export interface TeamsFxContext {
    credential?: TeamsUserCredential;
    scopes: string[];
}

/**
 * Default instance of TeamsFxContext.
 * 
 * @internal
 */
export const defaultTeamsFxCtx: TeamsFxContext = {
    scopes: [".default"]
}

/**
 * React context that contains TeamsFx credential information.
 * 
 * @beta
 */
export const TeamsFxCtx = React.createContext<TeamsFxContext>(defaultTeamsFxCtx);

/**
 * React hook that provides access to the TeamsFx React context.
 * @returns TeamsFxContext
 * 
 * @beta
 */
export const useTeamsFxContext = () => useContext(TeamsFxCtx);
