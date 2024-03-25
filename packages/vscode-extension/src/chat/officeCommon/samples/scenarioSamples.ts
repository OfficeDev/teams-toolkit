// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
const ImportDataToExcel = `
// Define types
type StockPriceData = {
  date: string;
  price: number;
};

// Function to retrieve stock price data from www.alphavantage API for the last two weeks
async function getStockPriceData(): Promise<StockPriceData[]> {
  const apiUrl : string = "https://external-stock-service/get-data";

  try {
    const response : Response = await fetch(apiUrl);
    const data : any = await response.json();

    // Parse and extract the required information
    const stockData: StockPriceData[] = [];

    for (const date in data["Time Series (Daily)"]) {
      if (Object.prototype.hasOwnProperty.call(data["Time Series (Daily)"], date)) {
        const price : number = parseFloat(data["Time Series (Daily)"][date]["4. close"]);
        stockData.push({ date, price });
      }
    }

    // Sort the data in ascending order based on date
    stockData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Return the stock price data
    return stockData;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to retrieve stock price data");
  }
}

// Function to calculate the end cell based on the start cell, number of rows, and number of columns
// It's assumed that the calculation is based on the A1 notation, and the maximum number of columns is 26, i.e., A-Z and the maximum number of rows is 999
function calculateEndCell(startCell: string, rows : number, columns : number) : string {
  const startColumn : number = startCell.toUpperCase().charCodeAt(0) - 65; // Convert start column to zero-indexed number
  const startRow : number = parseInt(startCell.slice(1), 10); // Extract start row number

  const endColumn : number = startColumn + columns - 1; // Calculate end column index
  const endRow : number = startRow + rows - 1; // Calculate end row number

  const endCell : string = String.fromCharCode(65 + endColumn) + endRow; // Convert back to A1 notation

  return endCell;
}

// Function to insert the extracted data into an Excel worksheet
async function insertDataIntoWorksheet(data: StockPriceData[]): Promise<void> {
  await Excel.run(async (context: Excel.RequestContext) => {
    const sheet : Excel.Worksheet = context.workbook.worksheets.getActiveWorksheet();
    const countOfData : number = data.length; // The number of data will be inserted
    const countOfFields : number = 2; // According to the data structure, there are 2 fields: date and price
    const endCell : string = calculateEndCell("A1", countOfData, countOfFields); // Calculate the end cell based on the start cell and the number of data and fields
    const range : Excel.Range = sheet.getRange("A1:" + endCell); // Assume data will be inserted from cell A1

    // Clear existing data
    range.clear();

    // Insert new data
    const values: any[][] = [["Date", "Price"]]; // Header row

    data.forEach((item) => {
      values.push([item.date, item.price]);
    });

    range.values = values;

    // Sync changes
    await context.sync();
  });
}
`;

const CreateTrendLineChartFromRange = `
Excel.run(async (context: Excel.RequestContext) => {
  // Retrieve the stock information from the cells
  const sheet : Excel.Worksheet = context.workbook.worksheets.getActiveWorksheet();
  const range : Excel.Range = sheet.getRange("A1:B6");
  range.load("values");
  await context.sync();

  const values : any[][] = range.values; // Array of stock information, 2 dimension array

  // Create a new chart in the Excel worksheet
  const chart : Excel.Chart = sheet.charts.add(Excel.ChartType.columnClustered, range, Excel.ChartSeriesBy.columns);
  chart.setPosition("A8");
  chart.title.visible = true;
  chart.title.text = "Stock Information";

  // Populate the chart with the stock information data
  chart.setData(range);

  // Apply formatting to the chart
  chart.format.fill.setSolidColor("#FFFFFF"); // Set background color of chart to white
  chart.format.colorScheme = Excel.ChartColorScheme.colorfulPalette3;

  const title : Excel.ChartTitle = chart.title;
  title.format.font.bold = true; // Make chart title bold

  const xAxis : Excel.ChartAxis = chart.axes.getItem(Excel.ChartAxisType.category); // Get the x-axis
  const yAxis: Excel.ChartAxis = chart.axes.getItem(Excel.ChartAxisType.value); // Get the y-axis

  xAxis.title.text = "Date"; // Set x-axis title
  yAxis.title.text = "Price"; // Set y-axis title

  // Add a trendline to the chart to show the trend of the stock information
  const series : Excel.ChartSeries = chart.series.getItemAt(0);
  series.trendlines.add(Excel.ChartTrendlineType.linear); // Add a linear trendline

  await context.sync();
}).catch((error) => {
  console.error(error);
});
`;

export const scenarioSampleData = {
  samples: [
    {
      namespace: "Excel",
      name: "ImportDataToExcel", // Make sure this name is equal to the variable name of the sample code
      scenario: "Import external data into Excel worksheet using Office Add-ins API.",
      sample: ImportDataToExcel,
      definition: "",
      usage: "",
    },
    {
      namespace: "Excel",
      name: "CreateTrendLineChartFromRange", // Make sure this name is equal to the variable name of the sample code
      scenario: "Create a trend line chart from Excel range using Office Add-ins API.",
      sample: CreateTrendLineChartFromRange,
      definition: "",
      usage: "",
    },
  ],
};
