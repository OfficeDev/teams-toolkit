import { Button, CardFooter, CardHeader, CardBody, Card, Flex, Text } from "@fluentui/react-northstar";

export function Design() {
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
    </div>
  )
}