import * as d3 from "d3-format";

import { AreaChart } from "@fluentui/react-charting";
import {
  ArrowRight16Filled,
  DataPie24Regular,
  MoreHorizontal32Regular,
} from "@fluentui/react-icons";
import { Text, Button, ToggleButton } from "@fluentui/react-components";

import {
  chart1Points_30D,
  chart1Points_60D,
  chart1Points_7D,
  chart2Points_30D,
  chart2Points_60D,
  chart2Points_7D,
} from "../../services/chartServices";
import { Widget } from "../lib/Widget";
import { headerContentStyle, headerTextStyle } from "../lib/Widget.styles";
import {
  areaChartStyle,
  footerButtonStyle,
  timeSpanStyle,
  pieIconStyle,
} from "../styles/ChartWidget.style";

export default class ChartWidget extends Widget {
  async getData() {
    const chartPoints = [
      {
        legend: "Line 1",
        data: chart1Points_7D,
        color: "#6264A7",
      },
      {
        legend: "Line 2",
        data: chart2Points_7D,
        color: "#D9DBDB",
      },
    ];
    const chartData = {
      chartTitle: "Area chart multiple example",
      lineChartData: chartPoints,
    };
    return { dayRange: "7D", chartProps: chartData };
  }

  headerContent() {
    return (
      <div style={headerContentStyle()}>
        <DataPie24Regular style={pieIconStyle()} />
        <Text style={headerTextStyle()}>Your chart</Text>
        <Button icon={<MoreHorizontal32Regular />} appearance="transparent" />
      </div>
    );
  }

  bodyContent() {
    return (
      <>
        <div>
          <ToggleButton
            appearance="transparent"
            checked={this.state.data?.dayRange === "7D"}
            style={timeSpanStyle()}
            onClick={() =>
              this.setState({
                data: {
                  chartProps: this.retriveChartsData("7D"),
                  dayRange: "7D",
                },
              })
            }
          >
            7 Days
          </ToggleButton>
          <ToggleButton
            appearance="transparent"
            checked={this.state.data?.dayRange === "30D"}
            style={timeSpanStyle()}
            onClick={() =>
              this.setState({
                data: {
                  chartProps: this.retriveChartsData("30D"),
                  dayRange: "30D",
                },
              })
            }
          >
            30 Days
          </ToggleButton>
          <ToggleButton
            appearance="transparent"
            checked={this.state.data?.dayRange === "60D"}
            style={timeSpanStyle()}
            onClick={() =>
              this.setState({
                data: {
                  chartProps: this.retriveChartsData("60D"),
                  dayRange: "60D",
                },
              })
            }
          >
            60 Days
          </ToggleButton>
        </div>

        <div style={areaChartStyle()}>
          {this.state.data && (
            <AreaChart
              data={this.state.data.chartProps}
              legendsOverflowText={"Overflow Items"}
              yAxisTickFormat={d3.format(".1s")}
              wrapXAxisLables={false}
              legendProps={{
                allowFocusOnLegends: true,
              }}
            />
          )}
        </div>
      </>
    );
  }

  footerContent() {
    return (
      <Button
        appearance="transparent"
        icon={<ArrowRight16Filled />}
        iconPosition="after"
        size="small"
        style={footerButtonStyle()}
        onClick={() => {}} // navigate to detailed page
      >
        View details
      </Button>
    );
  }

  retriveChartsData(r) {
    const chartPoints = [
      {
        legend: "Line 1",
        data:
          r === "7D"
            ? chart1Points_7D
            : r === "30D"
            ? chart1Points_30D
            : chart1Points_60D,
        color: "#6264A7",
      },
      {
        legend: "Line 2",
        data:
          r === "7D"
            ? chart2Points_7D
            : r === "30D"
            ? chart2Points_30D
            : chart2Points_60D,
        color: "#D9DBDB",
      },
    ];
    const chartData = {
      chartTitle: "Area chart multiple example",
      lineChartData: chartPoints,
    };
    return chartData;
  }
}
