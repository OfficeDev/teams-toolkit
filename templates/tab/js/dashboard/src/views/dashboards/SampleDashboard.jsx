import { Dashboard } from "../lib/Dashboard";
import ChartWidget from "../widgets/ChartWidget";
import { ListWidget } from "../widgets/ListWidget";

export default class SampleDashboard extends Dashboard {
  rowHeights() {
    return "1fr";
  }

  columnWidths() {
    return "4fr 6fr";
  }

  dashboardLayout() {
    return (
      <>
        <ListWidget />
        <ChartWidget />
      </>
    );
  }
}
