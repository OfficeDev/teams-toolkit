import { PersonCard } from "@microsoft/mgt-react";
import { useTeamsFx } from "./lib/useTeamsFx";

export function PersonCardGraphToolkit(props: {
  loading?: boolean; error?: any;
}) {
  const { themeString } = useTeamsFx();

  return (
    <div className="section-margin">
      <p>This example uses Graph Toolkit's
        <a href="https://docs.microsoft.com/en-us/graph/toolkit/components/person-card" target="_blank" rel="noreferrer">person card component</a>with
        <a href="https://github.com/microsoftgraph/microsoft-graph-toolkit/tree/next/teamsfx/packages/providers/mgt-teamsfx-provider" target="_blank" rel="noreferrer">TeamsFx provider</a>to show person card.
      </p>
      <pre>{`const provider = new TeamsFxProvider(credential, scope); \nProviders.globalProvider = provider; \nProviders.globalProvider.setState(ProviderState.SignedIn);`}</pre>

      {!props.loading && props.error && (
        <div className="error">
          Failed to read your profile. Please try again later. <br /> Details: {props.error.toString()}
        </div>
      )}
      {!props.loading && !props.error && (
        <div className={
          themeString === "default" ? 'mgt-light' : 'mgt-dark'
        }>
          <PersonCard personQuery="me" isExpanded={false} ></PersonCard>
        </div>
      )}
    </div>)
}