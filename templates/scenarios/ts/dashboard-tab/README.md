# Dashboard Tab

## Introduction

This is a dashboard tab app that embed a canvas containing multiple cards that provide an overview of data or content in Microsoft Teams.

![Default theme](./public/dashboard.png)

This app also supported teams different themes, including dark theme and high contrast theme.

|            Dark theme            |      High contrast theme       |
| :------------------------------: | :----------------------------: |
| ![](./public/dashboard-dark.png) | ![](./public/dashboard-hc.png) |

## Prerequisites

- [Node.js](https://nodejs.org/), supported versions: 16, 18
- A Microsoft 365 account. If you do not have Microsoft 365 account, apply one from [Microsoft 365 developer program](https://developer.microsoft.com/en-us/microsoft-365/dev-program)
- [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) version 5.0.0 and higher or [TeamsFx CLI](https://aka.ms/teamsfx-cli)

## Getting Started

Run your app with local debugging by pressing `F5` in VSCode. Select `Debug (Edge)` or `Debug (Chrome)`.

**Congratulations**! You are running an application that can now show a dashboard in Teams.

## Understanding the code

This section walks through the generated code. The project folder contains the following:

| Folder       | Contents                                            |
| ------------ | --------------------------------------------------- |
| `.vscode`    | VSCode files for debugging                          |
| `appPackage` | Templates for the Teams application manifest        |
| `env`        | Environment files                                   |
| `infra`      | Templates for provisioning Azure resources          |
| `src`        | The source code for the dashboard Teams application |

The following files provide the business logic for the dashboard tab. These files can be updated to fit your business logic requirements. The default implementation provides a starting point to help you get started.

| File                                 | Contents                                           |
| ------------------------------------ | -------------------------------------------------- |
| `src/models/chartModel.ts`           | Data model for the chart widget                    |
| `src/models/listModel.ts`            | Data model for the list widget                     |
| `src/services/chartService.ts`       | A data retrive implementation for the chart widget |
| `src/services/listService.ts`        | A data retrive implementation for the list widget  |
| `src/dashboards/SampleDashboard.tsx` | A sample dashboard layout implementation           |
| `src/styles/ChartWidget.css`         | The chart widget style file                        |
| `src/styles/ListWidget.css`          | The list widget style file                         |
| `src/widgets/ChartWidget.tsx`        | A widget implementation that can display a chart   |
| `src/widgets/ListWidget.tsx`         | A widget implementation that can display a list    |
| `src/App.css`                        | The style of application route                     |
| `src/App.tsx`                        | Application route                                  |

The following files are project-related files. You generally will not need to customize these files.

| File                               | Contents                                                     |
| ---------------------------------- | ------------------------------------------------------------ |
| `src/index.css`                    | The style of application entry point                         |
| `src/index.tsx`                    | Application entry point                                      |
| `src/internal/addNewScopes.ts`     | Implementation of new scopes add                             |
| `src/internal/context.ts`          | TeamsFx Context                                              |
| `src/internal/login.ts`            | Implementation of login                                      |
| `src/internal/singletonContext.ts` | Implementation of the TeamsUserCredential instance singleton |

## How to add a new widget

You can use the following steps to add a new widget to the dashboard:

1. [Step 1: Define a data model](#step-1-define-a-data-model)
2. [Step 2: Create a data retrive service](#step-2-create-a-data-retrive-service)
3. [Step 3: Create a widget file](#step-3-create-a-widget-file)
4. [Step 4: Add the widget to the dashboard](#step-4-add-the-widget-to-the-dashboard)

### Step 1: Define a data model

Define a data model based on the business scenario, we recommend that you place the data model under the `src/models` directory. Here is an example of a data model::

```typescript
//sampleModel.ts
export interface SampleModel {
  content: string;
}
```

### Step 2: Create a data retrive service

Typically, a widget requires a service to retrieve the necessary data for displaying its content. This service can either fetch static data from a predefined source or retrieve dynamic data from a backend service or API.

For instance, we will implement a service that returns static data and place under the `src/services` directory.

Here is a sample service for retrieving static data:

```typescript
//sampleService.ts
import { SampleModel } from "../models/sampleModel";

export const getSampleData = (): SampleModel => {
  return { content: "Hello world!" };
};
```

### Step 3: Create a widget file

Create a widget file in `src/widgets` folder. Inherit the `BaseWidget` class from `@microsoft/teamsfx-react`. The following table lists the methods that you can override to customize your widget.

| Methods     | Function                                                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `getData()` | This method is used to get the data for the widget. You can implement it to get data from the backend service or from the Microsoft Graph API |
| `header()`  | Customize the content of the widget header                                                                                                    |
| `body()`    | Customize the content of the widget body                                                                                                      |
| `footer()`  | Customize the content of the widget footer                                                                                                    |
| `styling()` | Customize the widget style                                                                                                                    |

> All method overrides are optional.

Here's a sample widget implementation:

```tsx
//SampleWidget.tsx
import { Button, Text } from "@fluentui/react-components";
import { BaseWidget } from "@microsoft/teamsfx-react";
import { SampleModel } from "../models/sampleModel";
import { getSampleData } from "../services/sampleService";

interface SampleWidgetState {
  data?: SampleModel;
}

export class SampleWidget extends BaseWidget<any, SampleWidgetState> {
  override async getData(): Promise<SampleWidgetState> {
    return { data: getSampleData() };
  }

  override header(): JSX.Element | undefined {
    return <Text>Sample Widget</Text>;
  }

  override body(): JSX.Element | undefined {
    return <div>{this.state.data?.content}</div>;
  }

  override footer(): JSX.Element | undefined {
    return <Button>View Details</Button>;
  }
}
```

### Step 4: Add the widget to the dashboard

Open the `src/dashboards/SampleDashboard.tsx` file and add the widget to the implementation of the `layout` method. If you want create a new dashboard, please refer to [How to add a new dashboard](#how-to-add-a-new-dashboard).

```tsx
override layout(): JSX.Element | undefined {
  return (
    <>
      <ListWidget />
      <ChartWidget />
      <SampleWidget />
    </>
  );
}
```

Optional: If you want to arrange multiple widgets in the same column, you can refer to the following code snippet:

```css
.one-column {
  display: grid;
  gap: 20px;
  grid-template-rows: 1fr 1fr;
}
```

```jsx
override layout(): JSX.Element | undefined {
  return (
    <>
      <ListWidget />
      <div className="one-column">
        <ChartWidget />
        <SampleWidget />
      </div>
    </>
  );
}
```

## How to add a new dashboard

You can use the following steps to add a new dashboard:

1. [Step 1: Create a dashboard class](#step-1-create-a-dashboard-class)
2. [Step 2: Override methods to customize dashboard layout](#step-2-override-methods-to-customize-dashboard-layout)
3. [Step 3: Add a route for the new dashboard](#step-3-add-a-route-for-the-new-dashboard)
4. [Step 4: Modify manifest to add a new dashboard tab](#step-4-modify-manifest-to-add-a-new-dashboard-tab)

### Step 1: Create a dashboard class

Create a file with the extension `.tsx` for your dashboard in the `src/dashboards` directory, for example, `YourDashboard.tsx`. Then, define a class that inherits the `BaseDashboard` class from `@microsoft/teamsfx-react`.

```tsx
//YourDashboard.tsx
import { BaseDashboard } from "@microsoft/teamsfx-react";

export default class YourDashboard extends BaseDashboard<any, any> {}
```

### Step 2: Override methods to customize dashboard layout

The `BaseDashboard` class provides some methods that you can override to customize the dashboard layout. The following table lists the methods that you can override.

| Methods     | Function                             |
| ----------- | ------------------------------------ |
| `styling()` | Customize the style of the dashboard |
| `layout()`  | Define widgets layout                |

Here is an example to customize the dashboard layout.

```css
.your-dashboard-layout {
  grid-template-columns: 6fr 4fr;
}
```

```tsx
import { BaseDashboard } from "@microsoft/teamsfx-react";
import ListWidget from "../widgets/ListWidget";
import ChartWidget from "../widgets/ChartWidget";

export default class YourDashboard extends BaseDashboard<any, any> {
  override styling(): string {
    return "your-dashboard-layout";
  }

  override layout(): JSX.Element | undefined {
    return (
      <>
        <ListWidget />
        <ChartWidget />
      </>
    );
  }
}
```

### Step 3: Add a route for the new dashboard

Open the `src/App.tsx` file, and add a route for the new dashboard. Here is an example:

```tsx
import YourDashboard from "./dashboards/YourDashboard";

export default function App() {
  ...
  <Route path="/yourdashboard" element={<YourDashboard />} />
  ...
}
```

### Step 4: Modify manifest to add a new dashboard tab

Open the [`appPackage/manifest.json`](appPackage/manifest.json) file, and add a new dashboard tab under the `staticTabs`. Here is an example:

```json
{
  "entityId": "index1",
  "name": "Your Dashboard",
  "contentUrl": "${{TAB_ENDPOINT}}/index.html#/yourdashboard",
  "websiteUrl": "${{TAB_ENDPOINT}}/index.html#/yourdashboard",
  "scopes": ["personal"]
}
```

## How to add a new Graph API call

Please follow these two steps:

1. Add SSO: Refer to How-to guides in Teams Toolkit by clicking Teams Toolkit in the side bar > `View how-to guides` > `Develop single sign-on experience in Teams`.
2. Refer to [this document](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/teamsfx-sdk#microsoft-graph-scenarios:~:text=caught%20and%20transformed.-,Microsoft%20Graph%20Scenarios,-This%20section%20provides) to call a Graph API via TeamsFx SDK.

## Additional resources

- [Fluent UI](https://react.fluentui.dev/?path=/docs/concepts-introduction--page)
- [Fluent UI React Charting Example](https://fluentuipr.z22.web.core.windows.net/heads/master/react-charting/demo/index.html#/)
