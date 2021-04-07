import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route } from "react-router-dom";
import { initializeIcons } from "@fluentui/react/lib/Icons";
import WelcomePanel from './WelcomePanel'

const language = "en";

ReactDOM.render(
    <IntlProvider locale={language}>
        <App />
    </IntlProvider>,
  document.getElementById('root') as HTMLElement
);

export default function App(props: any) {
  // Initializing the office-ui-fabric-icons here to avoid multiple initializations in every component.
  initializeIcons();

  return (
    <MemoryRouter
      initialEntries={["/welcome-page", "/sample-page"]}
      initialIndex={0}>
      <Route path='/welcome-page' component={WelcomePanel} />
    </MemoryRouter>
  );
}
