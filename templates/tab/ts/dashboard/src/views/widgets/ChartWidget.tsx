import "../styles/ChartWidget.css";

import { AreaChart, IChartProps } from "@fluentui/react-charting";
import { Button, Text, ToggleButton } from "@fluentui/react-components";
import {
  ArrowRight16Filled,
  DataPie24Regular,
  MoreHorizontal32Regular,
} from "@fluentui/react-icons";

import { DayRange, TimeModel } from "../../models/chartModel";
import { getChart1Points, getChart2Points, getTimeRange } from "../../services/chartServices";
import { Widget } from "../lib/Widget";

interface IChartWidgetState {
  timeRange: TimeModel[];
  chartProps: IChartProps;
  selectedRange: DayRange;
}

export default class ChartWidget extends Widget<any, IChartWidgetState> {
  async getData(): Promise<IChartWidgetState> {
    return {
      selectedRange: DayRange.Seven,
      chartProps: this.retriveChartsData(DayRange.Seven),
      timeRange: getTimeRange(),
    };
  }

  headerContent(): JSX.Element | undefined {
    return (
      <div>
        <DataPie24Regular />
        <Text>Your chart</Text>
        <Button icon={<MoreHorizontal32Regular />} appearance="transparent" />
      </div>
    );
  }

  bodyContent(): JSX.Element | undefined {
    return (
      <div>
        <div className="time-span">
          {this.state.timeRange?.map((t: TimeModel, i) => {
            return (
              <ToggleButton
                key={`tb-time-range-${i}`}
                appearance="transparent"
                checked={this.state.selectedRange === t.range}
                onClick={() =>
                  this.setState({
                    chartProps: this.retriveChartsData(t.range),
                    selectedRange: t.range,
                  })
                }
              >
                {t.name}
              </ToggleButton>
            );
          })}
        </div>

        {this.state.chartProps && (
          <div className="area-chart">
            <AreaChart data={this.state.chartProps} />
          </div>
        )}
      </div>
    );
  }

  footerContent(): JSX.Element | undefined {
    return (
      <Button
        id="chart-footer"
        appearance="transparent"
        icon={<ArrowRight16Filled />}
        iconPosition="after"
        size="small"
        onClick={() => {}} // navigate to detailed page
      >
        View details
      </Button>
    );
  }

  private retriveChartsData(r: DayRange): IChartProps {
    const chartPoints = [
      {
        legend: "Line 1",
        data: getChart1Points(r),
        color: "#6264A7",
      },
      {
        legend: "Line 2",
        data: getChart2Points(r),
        color: "#D9DBDB",
      },
    ];
    const chartData = {
      lineChartData: chartPoints,
    };
    return chartData;
  }
}
