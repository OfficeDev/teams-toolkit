import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route } from "react-router-dom";
import { initializeIcons } from "@fluentui/react/lib/Icons";
import WelcomePanel from './WelcomePanel';
import LearnToolkit from './LearnToolkit';
import QuickStart from './QuickStart';
import SampleGallery from './SampleGallery'

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
      initialEntries={["/welcome-page", "/learn-toolkit", "/quick-start", "/sample-gallery"]}
      initialIndex={2}>
      <Route path='/welcome-page' component={WelcomePanel} />
      <Route path='/learn-toolkit' component={LearnToolkit} />
      <Route path='/quick-start' component={QuickStart} />
      <Route path='/sample-gallery' component={SampleGallery} />
    </MemoryRouter>
  );
}
