import "../styles/ChartWidget.css";

import * as d3 from "d3-format";

import { AreaChart, IChartProps } from "@fluentui/react-charting";
import { Button, Text, ToggleButton } from "@fluentui/react-components";
import {
  ArrowRight16Filled,
  DataPie24Regular,
  MoreHorizontal32Regular,
} from "@fluentui/react-icons";
import { BaseWidget, IWidgetClassNames } from "@microsoft/teamsfx-react";

import { DayRange, TimeModel } from "../models/chartModel";
import { getChart1Points, getChart2Points, getTimeRange } from "../services/chartService";

interface IChartWidgetState {
  selectedRange: DayRange;
  chartProps: IChartProps;
  timeRange: TimeModel[];
}

export default class ChartWidget extends BaseWidget<any, IChartWidgetState> {
  async getData(): Promise<IChartWidgetState> {
    return {
      selectedRange: DayRange.Seven,
      chartProps: this.retriveChartsData(DayRange.Seven),
      timeRange: getTimeRange(),
    };
  }

  header(): JSX.Element | undefined {
    return (
      <div>
        <DataPie24Regular />
        <Text>Your chart</Text>
        <Button icon={<MoreHorizontal32Regular />} appearance="transparent" />
      </div>
    );
  }

  body(): JSX.Element | undefined {
    return (
      <div>
        <div className="chart-selector">
          {this.state.timeRange &&
            this.state.timeRange.map((t: TimeModel, i) => {
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

        <div className="chart">
          {this.state.chartProps && (
            <AreaChart
              data={this.state.chartProps}
              yAxisTickFormat={d3.format(".1s")}
              wrapXAxisLables={false}
              legendProps={{
                allowFocusOnLegends: true,
              }}
            />
          )}
        </div>
      </div>
    );
  }

  footer(): JSX.Element | undefined {
    return (
      <Button
        appearance="transparent"
        icon={<ArrowRight16Filled />}
        iconPosition="after"
        size="small"
      >
        View details
      </Button>
    );
  }

  styling(): IWidgetClassNames {
    return {
      footer: "chart-footer",
    };
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
