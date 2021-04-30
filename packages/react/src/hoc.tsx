import React from "react";
import { TeamsFxCtx, TeamsFxContext, defaultTeamsFxCtx } from "./teamsfxContext";
import { getCredential } from "./credential";

export function withTeamsFxContext(WrappedComponent: React.ComponentType, scopes: string[] = [".default"]): () => JSX.Element {
    const credential = getCredential(scopes);
    const teamsFxCtx: TeamsFxContext = {
        credential: credential,
        scopes: scopes
    };
    return () => (
      <TeamsFxCtx.Provider value={teamsFxCtx}>
        <WrappedComponent></WrappedComponent>
      </TeamsFxCtx.Provider>
    );    
}

export const TeamsFxProvider = (props: any) => {
  const credential = getCredential();
  const teamsFxCtx: TeamsFxContext = {
    credential: credential,
    ...defaultTeamsFxCtx
  }
  return (
    <TeamsFxCtx.Provider value={teamsFxCtx}>
      {props.children}
    </TeamsFxCtx.Provider>
  )
}
