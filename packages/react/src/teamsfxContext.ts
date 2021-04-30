import React, { useContext } from "react";
import {
    TeamsUserCredential,
} from "@microsoft/teamsfx";

export interface TeamsFxContext {
    credential?: TeamsUserCredential;
    scopes: string[];
}

export const defaultTeamsFxCtx: TeamsFxContext = {
    scopes: [".default"]
}

export const TeamsFxCtx = React.createContext<TeamsFxContext>(defaultTeamsFxCtx);

export const useTeamsFxContext = () => useContext(TeamsFxCtx);
