import { PersonCard } from '@microsoft/mgt-react';
import { ProfileCard } from "./ProfileCard";
import "./Graph.css";
import { useGraph } from "./lib/useGraph";
import { Providers, ProviderState } from '@microsoft/mgt-element';
import { TeamsFxProvider } from '@microsoft/mgt-teamsfx-provider';
import { useTeamsFx } from "./lib/useTeamsFx";
import { Button, CardFooter, CardHeader, CardBody, Card, Flex, Text } from "@fluentui/react-northstar";

export function Graph() {
  const { themeString } = useTeamsFx();

  const { loading, error, data, reload } = useGraph(
    async (graph, credential, scope) => {
      // Call graph api directly to get user profile information
      const profile = await graph.api("/me").get();

      // Initialize Graph Toolkit TeamsFx provider
      const provider = new TeamsFxProvider(credential, scope);
      Providers.globalProvider = provider;
      Providers.globalProvider.setState(ProviderState.SignedIn);

      let photoUrl = "";
      try {
        const photo = await graph.api("/me/photo/$value").get();
        photoUrl = URL.createObjectURL(photo);
      } catch {
        // Could not fetch photo from user's profile, return empty string as placeholder.
      }
      return { profile, photoUrl };
    },
    { scope: ["User.Read"] }
  );

  return (
    <div>
      <h2>Design your app</h2>
      <h3>Teams App UI design</h3>
      <div className="section-margin">
        <p>These guidelines can help you quickly make the right design decisions for your Microsoft Teams app.</p>
        <Flex gap="gap.small">
          <Card aria-roledescription="card avatar"
            elevated
            inverted
            styles={{ height: "280px", width: "330px" }}>
            <Flex gap="gap.small" column fill vAlign="stretch" space="between" >
              <CardHeader>
                <Text content="Microsoft Teams UI Kit" weight="bold" size="large" />
              </CardHeader>
              <CardBody>
                Based on Fluent UI, the Microsoft Teams UI Kit includes components and patterns that are designed specifically for building Teams apps. In the UI kit, you can grab and insert the components listed here directly into your design and see more examples of how to use each component.
              </CardBody>
              <CardFooter fitted={true}>
                <Button primary fluid content="Get the Microsoft Teams UI Kit (Figma)" onClick={() => { window.open('https://www.figma.com/community/file/916836509871353159', '_blank', 'noreferrer') }} />
              </CardFooter>
            </Flex>
          </Card>

          <Card aria-roledescription="card avatar"
            elevated
            inverted
            styles={{ height: "280px", width: "330px" }}>
            <Flex gap="gap.small" column fill vAlign="stretch" space="between" >
              <CardHeader>
                <Text content="Microsoft Graph Toolkit" weight="bold" size="large" />
              </CardHeader>
              <CardBody>
                The Microsoft Graph Toolkit is a collection of reusable, framework-agnostic components and authentication providers for accessing and working with Microsoft Graph. The components are fully functional out of the box, with built-in providers that authenticate with and fetch data from Microsoft Graph.
              </CardBody>
              <CardFooter fitted={true}>
                <Button fluid primary content="Get Started with Graph Toolkit for React" onClick={() => { window.open('https://docs.microsoft.com/en-us/graph/toolkit/get-started/mgt-react', '_blank', 'noreferrer') }} />
              </CardFooter>
            </Flex>
          </Card>
        </Flex>
        <p>Learn more about <a href='https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/design/design-teams-app-overview' target="_blank" rel="noreferrer">designing Microsoft Teams app</a>.</p>
        <p></p>
      </div>

      <h3>Example: Get the user's profile</h3>
      <div className="section-margin">
        <p>Click below to authorize button to grant permission to using Microsoft Graph.</p>
        <pre className={themeString}>{`const credential = new TeamsUserCredential(); \nawait credential.login(scope);`}</pre>
        <Button  primary content="Authorize" disabled={loading} onClick={reload} />

        <p>Below are two different implementations of retrieving profile photo for currently signed-in user using Fluent UI component and Graph Toolkit respectively.</p>

        <h4>1. Display user profile using Fluent UI Component</h4>
        <div className="section-margin">
          <p>This example uses Fluent UI component with user's profile photo, name and email address fetched from Graph API calls.</p>
          <pre>{`const graph = createMicrosoftGraphClient(credential, scope); \nconst profile = await graph.api("/me").get(); \nconst photo = await graph.api("/me/photo/$value").get();`}</pre>

          {loading && ProfileCard(true)}
          {!loading && error && (
            <div className="error">
              Failed to read your profile. Please try again later. <br /> Details: {error.toString()}
            </div>
          )}
          {!loading && data && ProfileCard(false, data)}
        </div>

        <h4>2. Display user profile using Graph Toolkit</h4>
        <div className="section-margin">

        <p>This example uses Graph Toolkit's <a href="https://docs.microsoft.com/en-us/graph/toolkit/components/person-card" target="_blank" rel="noreferrer">person card component</a> with <a href="https://github.com/microsoftgraph/microsoft-graph-toolkit/tree/next/teamsfx/packages/providers/mgt-teamsfx-provider" target="_blank" rel="noreferrer">TeamsFx provider</a> to show person card.</p>
        <pre>{`const provider = new TeamsFxProvider(credential, scope); \nProviders.globalProvider = provider; \nProviders.globalProvider.setState(ProviderState.SignedIn);`}</pre>

        {!loading && error && (
          <div className="error">
            Failed to read your profile. Please try again later. <br /> Details: {error.toString()}
          </div>
        )}
        {!loading && !error && (
          <div className={
            themeString === "default" ? 'mgt-light' : 'mgt-dark'
          }>
            <PersonCard personQuery="me" isExpanded={false} ></PersonCard>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
