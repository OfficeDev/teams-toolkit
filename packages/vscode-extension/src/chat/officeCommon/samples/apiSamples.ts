// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export const apiSampleData = {
  samples: [
    {
      namespace: "Excel",
      class: "Workbook",
      name: "worksheets",
      docLink:
        "https://learn.microsoft.com/en-us/javascript/api/excel/excel.workbook?view=excel-js-preview#excel-excel-workbook-worksheets-member",
      sample:
        "await Excel.run(async (context) => {\n    let sheets = context.workbook.worksheets;\n    sheets.load('name');\n    await context.sync();\n    console.log(sheets.items);\n});",
      scenario: "Get all worksheets's name in the workbook",
      definition: '"readonly worksheets: Excel.WorksheetCollection;". ',
      usage: "",
    },
    {
      namespace: "Excel",
      class: "WorksheetCollection",
      name: "add",
      docLink:
        "https://learn.microsoft.com/en-us/javascript/api/excel/excel.worksheetcollection?view=excel-js-preview#excel-excel-worksheetcollection-add-member(1)",
      sample:
        "await Excel.run(async (context) => {\n    let sheets = context.workbook.worksheets;\n    let sheet = sheets.add('Sheet2');\n    sheet.activate();\n    await context.sync();\n});",
      scenario: "Add a new worksheet named 'Sheet2' to the workbook",
      definition: '"add(name?: string): Excel.Worksheet;". ',
      usage: "",
    },
    {
      namespace: "Excel",
      class: "WorksheetCollection",
      name: "getItem",
      docLink:
        "https://learn.microsoft.com/en-us/javascript/api/excel/excel.worksheetcollection?view=excel-js-preview#excel-excel-worksheetcollection-getitem-member(1)",
      sample:
        "await Excel.run(async (context) => {\n    let sheets = context.workbook.worksheets;\n    let sheet = sheets.getItem('Sheet1');\n    sheet.activate();\n    await context.sync();\n});",
      scenario: "Get the worksheet named 'Sheet1' and activate it",
      definition: '"getItem(key: string): Excel.Worksheet;". ',
      usage: "",
    },
    {
      namespace: "Excel",
      class: "WorksheetCollection",
      name: "getItemOrNullObject",
      docLink:
        "https://learn.microsoft.com/en-us/javascript/api/excel/excel.worksheetcollection?view=excel-js-preview#excel-excel-worksheetcollection-getitemornullobject-member(1)",
      sample:
        "await Excel.run(async (context) => {\n    let sheets = context.workbook.worksheets;\n    let sheet = sheets.getItemOrNullObject('Sheet1');\n    sheet.load('name');\n    await context.sync();\n    console.log(sheet.name);\n});",
      scenario: "Get the worksheet named 'Sheet1' and print its name if the Sheet1 exists",
      definition: '"getItemOrNullObject(key: string): Excel.Worksheet;". ',
      usage: "",
    },
    {
      namespace: "Excel",
      class: "Worksheet",
      name: "getRange",
      docLink:
        "https://learn.microsoft.com/en-us/javascript/api/excel/excel.worksheet?view=excel-js-preview#excel-excel-worksheet-getrange-member(1)",
      sample:
        "await Excel.run(async (context) => {\n    let sheet = context.workbook.worksheets.getItem('Sheet1');\n    let range = sheet.getRange('A1:B2');\n    let twoDimissionArray = range.values;\n    await context.sync();\n});",
      scenario:
        "Set the values of the range A1:B2 and assign to a two dimission array (The result of twoDimissionArray is [[1, 2], [3, 4]])",
      definition: ' "getRange(address?: string): Excel.Range;".',
      usage:
        "address is a string in A1 notation style. The A1 notation string refer to a cell or range of cells. Example for A1 notion string: 'A1' means cell A1, present as a single cell, value of cell A1 present in code as [['value']]; 'A1:B3' means cells A1 through B3, present as multiple cells, value of cells present in code as [['A1's value', 'B1's value'], ['A2's value', 'B2's value'], ['A3's value', 'B3's value']]; 'A1:B1' means cells A1 through B1, present multiple cells, value of cells present in code as [['A1's value', 'B1's value']]. A valid single cell A1 notation string combines two parts, column letter and row number, for example, 'A1', 'B2', 'C3', etc. A valid range of cells A1 notation string combines two valid single cell A1 notation strings with a colon, for example, 'A1:B2', 'C3:D4', etc. The Column letter and row number must be specified in the A1 notation string, for example, 'A1', 'B2', 'C3', etc.",
    },
    {
      namespace: "Excel",
      class: "Range",
      name: "values",
      docLink:
        "https://learn.microsoft.com/en-us/javascript/api/excel/excel.range?view=excel-js-preview#excel-excel-range-values-member",
      sample:
        "await Excel.run(async (context) => {\n    let sheet = context.workbook.worksheets.getItem('Sheet1');\n    let range = sheet.getRange('A1:B2');\n    range.values = [[1, 2], [3, 4]];\n    await context.sync();\n});",
      scenario: "Set the values of the range A1:B2 to [[1, 2], [3, 4]] (A1=1, B1=2, A2=3, B2=4)",
      definition: '"values: any[][];".',
      usage:
        "Represents the raw values of the specified range. The .values is always a two dimission array. Items in the embedded array could be a string, number, or boolean, for example: [['Date', 'Price'], ['2024/3/1', 400.31]]. When set the values of the range, the dimension size of the given array must match the dimension size of the range. For example, if the range is A1:B2, the given array must be a 2x2 array; if the range is A1:C5, the given array must be a 5x3 array.",
    },
    {
      namespace: "Excel",
      class: "Worksheet",
      name: "activate",
      docLink:
        "https://learn.microsoft.com/en-us/javascript/api/excel/excel.worksheet?view=excel-js-preview#excel-excel-worksheet-activate-member(1)",
      sample:
        "await Excel.run(async (context) => {\n    let sheet = context.workbook.worksheets.getItem('Sheet1');\n    sheet.activate();\n    await context.sync();\n});",
      scenario: "Activate the worksheet named 'Sheet1' to make it as current working worksheet",
      definition: ' "activate(): void;".',
      usage: "",
    },
    {
      namespace: "Excel",
      class: "Worksheet",
      name: "name",
      docLink:
        "https://learn.microsoft.com/en-us/javascript/api/excel/excel.worksheet?view=excel-js-preview#excel-excel-worksheet-name-member",
      sample:
        "await Excel.run(async (context) => {\n    let sheet = context.workbook.worksheets.getItem('Sheet1');\n    sheet.load('name');\n    await context.sync();\n    console.log(sheet.name);\n});",
      scenario: "Get the name of the worksheet named 'Sheet1'",
      definition: '"name: string;"',
      usage: "",
    },
    {
      namespace: "Excel",
      class: "WorksheetCollection",
      name: "getActiveWorksheet",
      docLink:
        "https://learn.microsoft.com/en-us/javascript/api/excel/excel.worksheetcollection?view=excel-js-preview#excel-excel-worksheetcollection-getactiveworksheet-member(1)",
      sample:
        "await Excel.run(async (context) => {\n    let sheet = context.workbook.worksheets.getActiveWorksheet();\n    sheet.activate();\n    await context.sync();\n});",
      scenario: "Gets the currently active worksheet in the workbook.",
      definition: ' "getActiveWorksheet(): Excel.Worksheet;".',
      usage: "",
    },
    {
      namespace: "Excel",
      class: "ChartCollection",
      name: "add",
      docLink:
        "https://learn.microsoft.com/en-us/javascript/api/excel/excel.chartcollection?view=excel-js-preview#excel-excel-chartcollection-add-member(1)",
      sample:
        "await Excel.run(async (context) => {\n    let sheet = context.workbook.worksheets.getActiveWorksheet();\n    let range = sheet.getRange('A1:B2');\n    let chart = sheet.charts.add(Excel.ChartType.line, range);\n    chart.title.text = 'Trend Line Chart';\n    chart.axes.categoryAxis.title.text = 'Days';\n    chart.axes.valueAxis.title.text = 'Price';\n    await context.sync();\n});",
      scenario:
        "Create and add a line chart in the worksheet and set the title and axis labels of the chart",
      definition:
        ' "add(type: Excel.ChartType, sourceData: Range, seriesBy?: Excel.ChartSeriesBy): Excel.Chart;". ',
      usage: "",
    },
    {
      namespace: "Excel",
      class: "ChartSeriesCollection",
      name: "getItemAt",
      docLink:
        "https://learn.microsoft.com/en-us/javascript/api/excel/excel.chartseriescollection?view=excel-js-preview#excel-excel-chartseriescollection-getitemat-member(1)",
      sample:
        "await Excel.run(async (context) => {\n    let sheet = context.workbook.worksheets.getActiveWorksheet();\n    let chart = sheet.charts.getItem('Chart1');\n    let series = chart.series.getItemAt(0);\n    series.trendlines.add(Excel.ChartTrendlineType.linear);\n    await context.sync();\n});",
      scenario: "Get the first series of the chart and add a trendline to it",
      definition: ' "getItemAt(index: number): Excel.ChartSeries;".',
      usage: "index: The zero-based index of the series to be retrieved.",
    },
    {
      namespace: "Excel",
      class: "ChartTrendlineCollection",
      name: "add",
      docLink:
        "https://learn.microsoft.com/en-us/javascript/api/excel/excel.charttrendlinecollection?view=excel-js-preview#excel-excel-charttrendlinecollection-add-member(1)",
      sample:
        "await Excel.run(async (context) => {\n    let sheet = context.workbook.worksheets.getActiveWorksheet();\n    let chart = sheet.charts.getItem('Chart1');\n    let series = chart.series.getItemAt(0);\n    let trendline = series.trendlines.add(Excel.ChartTrendlineType.linear);\n    trendline.displayEquation = true;\n    trendline.displayRSquared = true;\n    await context.sync();\n});",
      scenario:
        "Add a linear trendline to the first series of the chart and display the equation and R-squared value of the trendline",
      definition: ' "add(type: Excel.ChartTrendlineType): Excel.ChartTrendline;". ',
      usage: "",
    },
    {
      namespace: "Excel",
      class: "Worksheet",
      name: "getCell",
      docLink:
        "https://learn.microsoft.com/en-us/javascript/api/excel/excel.worksheet?view=excel-js-preview#excel-excel-worksheet-getcell-member(1)",
      sample:
        "await Excel.run(async (context) => { const sheetName = \"Sheet1\"; const worksheet = context.workbook.worksheets.getItem(sheetName); const cell = worksheet.getCell(0,0); cell.load('address'); await context.sync(); });",
      scenario:
        "Get the cell at the first row and first column of the worksheet named 'Sheet1' and print its address",
      definition: ' "getCell(row: number, column: number): Excel.Range;".',
      usage:
        "row: The zero-based row index of the cell. column: The zero-based column index of the cell.",
    },
    {
      namespace: "Excel",
      class: "Worksheet",
      name: "getRangeByIndexes",
      docLink:
        "https://learn.microsoft.com/en-us/javascript/api/excel/excel.worksheet?view=excel-js-preview#excel-excel-worksheet-getcell-member(1)",
      sample:
        "await Excel.run(async (context) => { const sheetName = \"Sheet1\"; const worksheet = context.workbook.worksheets.getItem(sheetName); const range = worksheet.getRangeByIndexes(0,0,1,1); range.load('address'); await context.sync(); });",
      scenario:
        "Get the range beginning at the first row and first column of the worksheet named 'Sheet1' and spanning one row and one column and print its address",
      definition:
        ' "getRangeByIndexes(startRow: number, startColumn: number, rowCount: number, columnCount: number): Excel.Range;".',
      usage:
        "startRow: The zero-based row index of the range. startColumn: The zero-based column index of the range. rowCount: The number of rows in the range. columnCount: The number of columns in the range.",
    },
    {
      namespace: "Excel",
      class: "Worksheet",
      name: "charts",
      docLink:
        "https://learn.microsoft.com/en-us/javascript/api/excel/excel.worksheet?view=excel-js-preview#excel-excel-worksheet-charts-member",
      sample:
        "await Excel.run(async (context) => { const sheetName = \"Sheet1\"; const worksheet = context.workbook.worksheets.getItem(sheetName); const charts = worksheet.charts; charts.load('items'); await context.sync(); });",
      scenario: "Get all charts in the worksheet named 'Sheet1'",
      definition: ' "charts: Excel.ChartCollection;".',
      usage: "",
    },
    {
      namespace: "Excel",
      class: "Worksheet",
      name: "legend",
      docLink:
        "https://learn.microsoft.com/en-us/javascript/api/excel/excel.chart?view=excel-js-preview#excel-excel-chart-legend-member",
      sample:
        "await Excel.run(async (context) => { const sheetName = \"Sheet1\"; const worksheet = context.workbook.worksheets.getItem(sheetName); const chart = worksheet.charts.getItem('Chart1'); chart.legend.position = 'right'; await context.sync(); });",
      scenario: "Set the position of the legend of the chart named 'Chart1' to 'right'",
      definition: ' "legend: Excel.ChartLegend;".',
      usage: "",
    },
    {
      namespace: "Excel",
      class: "Chart",
      name: "setData",
      docLink:
        "https://learn.microsoft.com/en-us/javascript/api/excel/excel.chart?view=excel-js-preview#excel-excel-chart-setdata-member(1)",
      sample:
        "await Excel.run(async (context) => { const sheetName = \"Sheet1\"; const worksheet = context.workbook.worksheets.getItem(sheetName); const chart = worksheet.charts.getItem('Chart1'); const range = worksheet.getRange('A1:B2'); chart.setData(range); await context.sync(); });",
      scenario: "Set the data of the chart named 'Chart1' to the range \"A1:B2\"",
      definition: ' "setData(sourceData: Range, seriesBy?: Excel.ChartSeriesBy): void;".',
      usage: "",
    },
    {
      namespace: "Excel",
      class: "Worksheet",
      name: "getUsedRange",
      docLink:
        "https://learn.microsoft.com/en-us/javascript/api/excel/excel.worksheet?view=excel-js-preview#excel-excel-worksheet-getusedrange-member(1)",
      sample:
        "await Excel.run(async (context) => { const sheetName = \"Sheet1\"; const worksheet = context.workbook.worksheets.getItem(sheetName); const range = worksheet.getUsedRange(); range.load('address'); await context.sync(); });",
      scenario: "Get the used range of the worksheet named 'Sheet1' and print its address",
      definition: ' "getUsedRange(): Excel.Range;".',
      usage: "",
    },
  ],
};
