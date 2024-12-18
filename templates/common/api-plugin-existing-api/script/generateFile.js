const fs = require("fs");
// read all files in the folder
const files = fs.readdirSync(`src/adaptiveCards`);
console.log(files);
// filter out *.data.json files
const dataFiles = files.filter((file) => file.endsWith(".data.json"));
const data = dataFiles.map((file) => {
  const content = fs.readFileSync(`src/adaptiveCards/${file}`, "utf8");
  return JSON.parse(content);
});
// // write data to file
fs.writeFileSync("src/data.json", JSON.stringify(data, null, 2));

const mockUrl = getMockUrl();
console.log(mockUrl);
// read mock-template.json
const mockTemplate = fs.readFileSync("script/mock-template.json", "utf8");
const mockTemplateJson = JSON.parse(mockTemplate);
mockTemplateJson.mocks = [];
//loop through data and replace {{data}} with the data
const mockData = data.map((item) => {
  const mock = {
    request: {
      url: mockUrl + item.uri,
      method: item.method.toUpperCase(),
    },
    response: {
      body: item.body,
    },
  };
  mockTemplateJson.mocks.push(mock);
});

// write mock-template.json
fs.writeFileSync("output.json", JSON.stringify(mockTemplateJson, null, 2));

function getMockUrl() {
  // read env/.env.local
  const env = fs.readFileSync("env/.env.dev", "utf8");
  // split env into lines
  const envLines = env.split("\n");
  // filter out lines that start with DEV_PROXY_MOCK_URL
  const urlLine = envLines.find((line) => line.startsWith("DEV_PROXY_MOCK_URL"));
  if (!urlLine) {
    return "http://dev-proxy-mock";
  } else {
    // split envLinesFiltered into key and value
    const parts = urlLine.trim().split("=");
    return parts[1];
  }
}
