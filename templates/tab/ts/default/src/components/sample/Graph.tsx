import React from "react";
import { ProviderState } from '@microsoft/mgt-element';
import { Person, PersonViewType, PersonCardInteraction } from '@microsoft/mgt-react';
import { useGraphToolkit } from "./lib/useGraphToolkit";

export function Graph() {
  const { providerState } = useGraphToolkit();  

  return (
    <div>
        {providerState === ProviderState.SignedIn && <Person 
          personQuery="me" 
          view={PersonViewType.threelines} 
          personCardInteraction={PersonCardInteraction.hover}>
        </Person>}
    </div>
  );
}
