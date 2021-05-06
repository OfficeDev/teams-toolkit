// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import React from "react";
import { TeamsFxCtx, TeamsFxContext, defaultTeamsFxCtx } from "./teamsfxContext";
import { getCredential } from "./credential";

/**
 * HOC that wraps credential using TeamsFxCtx.
 * 
 * @param WrappedComponent - child component that can use the authenticated credential instance in TeamsFxContext.
 * @param scopes - The array of Microsoft Token scope of access. Default value is  `[.default]`. Scopes provide a way to manage permissions to protected resources.
 * @returns Wrapped JSX element to render.
 * 
 * @beta
 */
export function withTeamsFxContext(WrappedComponent: React.ComponentType, scopes: string[] = [".default"]): () => JSX.Element {
    const credential = getCredential(scopes);
    credential.login(scopes);
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

interface WithScopesProps {
  scopes: string[];
  children: React.ReactNode;
}

/**
 * A React provider component with pre-configured value.
 * 
 * @param props - React component props.
 * @returns Wrapped JSX element to render.
 * 
 * @beta
 */
export const TeamsFxProvider = (props: WithScopesProps) => {
  const credential = getCredential(props.scopes);
  credential.login(props.scopes);
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
