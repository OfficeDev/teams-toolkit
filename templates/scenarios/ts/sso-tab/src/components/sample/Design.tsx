import { Button, Text, CardFooter, CardHeader, Card } from "@fluentui/react-components";

export function Design() {
  return (
    <div>
      <h2>Design your app</h2>
      <h3>Teams App UI design</h3>
      <div className="section-margin">
        <p>
          These guidelines can help you quickly make the right design decisions for your Microsoft
          Teams app.
        </p>
        <div className="flex row">
          <Card aria-roledescription="Teams UI Kit" appearance="filled-alternative" size="large">
            <CardHeader
              header={
                <Text weight="bold" size={500}>
                  Microsoft Teams UI Kit
                </Text>
              }
            />
            Based on Fluent UI, the Microsoft Teams UI Kit includes components and patterns that are
            designed specifically for building Teams apps. In the UI kit, you can grab and insert
            the components listed here directly into your design and see more examples of how to use
            each component.
            <CardFooter>
              <Button
                appearance="primary"
                onClick={() => {
                  window.open(
                    "https://www.figma.com/community/file/916836509871353159",
                    "_blank",
                    "noreferrer"
                  );
                }}
                className="fluid button"
              >
                Get the Microsoft Teams UI Kit (Figma)
              </Button>
            </CardFooter>
          </Card>
          <Card aria-roledescription="Graph Toolkit" appearance="filled-alternative" size="large">
            <CardHeader
              header={
                <Text weight="bold" size={500}>
                  Microsoft Graph Toolkit
                </Text>
              }
            />
            The Microsoft Graph Toolkit is a collection of reusable, framework-agnostic components
            and authentication providers for accessing and working with Microsoft Graph. The
            components are fully functional out of the box, with built-in providers that
            authenticate with and fetch data from Microsoft Graph.
            <CardFooter>
              <Button
                appearance="primary"
                onClick={() => {
                  window.open(
                    "https://docs.microsoft.com/en-us/graph/toolkit/get-started/mgt-react",
                    "_blank",
                    "noreferrer"
                  );
                }}
                className="flow button"
              >
                Get Started with Graph Toolkit for React
              </Button>
            </CardFooter>
          </Card>
        </div>
        <p>
          Learn more about{" "}
          <a
            href="https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/design/design-teams-app-overview"
            target="_blank"
            rel="noreferrer"
          >
            designing Microsoft Teams app
          </a>
          .
        </p>
        <p></p>
      </div>
    </div>
  );
}
