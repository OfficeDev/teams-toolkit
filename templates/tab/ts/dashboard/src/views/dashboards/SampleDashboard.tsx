import { Dashboard } from "../lib/Dashboard";
import ChartWidget from "../widgets/ChartWidget";
import ListWidget from "../widgets/ListWidget";

export default class SampleDashboard extends Dashboard {
  protected dashboardLayout(): JSX.Element | undefined {
    return (
      <>
        <ListWidget />
        <ChartWidget />
      </>
    );
  }
}
