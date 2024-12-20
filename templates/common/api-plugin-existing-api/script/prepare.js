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
// fs.writeFileSync("src/data.json", JSON.stringify(data, null, 2));

const mockUrl = getMockUrl();
console.log(mockUrl);
generateMockFile();
updateConfigFile();
updateSpecFile();

function updateSpecFile() {
  // read spec
  let spec = fs.readFileSync("appPackage/apiSpecificationFile/openapi.yaml", "utf8");
  spec = spec.replace(/servers:\n  - url: .*\n/g, "servers:\n  - url: ${{BOT_ENDPOINT}}\n");
  console.log(spec);
  fs.writeFileSync("appPackage/apiSpecificationFile/openapi.yaml", spec);
}

function updateConfigFile() {
  // read config.json
  let config = fs.readFileSync("proxy/config.json", "utf8");
  config = JSON.parse(config);
  config.urlsToWatch = [`${mockUrl}/*`];
  console.log(config);
  // write config.json
  fs.writeFileSync("proxy/config.json", JSON.stringify(config, null, 2));
}

function generateMockFile() {
  // read mock-template.json
  const mockTemplate = fs.readFileSync("script/mock-template.json", "utf8");
  const mockTemplateJson = JSON.parse(mockTemplate);
  mockTemplateJson.mocks = [];
  //loop through data and replace {{data}} with the data
  const mockData = data.map((item) => {
    const uri = item.uri.replace(/\{(.*)\}/g, "*");
    const mock = {
      request: {
        url: mockUrl + uri,
        method: item.method.toUpperCase(),
      },
      response: {
        body: item.body,
      },
    };
    mockTemplateJson.mocks.push(mock);
  });

  // write mock-template.json
  fs.writeFileSync("proxy/mockResponse.json", JSON.stringify(mockTemplateJson, null, 2));
}

function getMockUrl() {
  // read env/.env.local
  const env = fs.readFileSync("env/.env.dev", "utf8");
  // split env into lines
  const envLines = env.split("\n");
  // filter out lines that start with DEV_PROXY_MOCK_URL
  const urlLine = envLines.find((line) => line.startsWith("DEV_PROXY_MOCK_URL"));
  if (!urlLine) {
    console.log("could not find DEV_PROXY_MOCK_URL in .env.dev, use default");
    return "http://dev-proxy-mock";
  } else {
    // split envLinesFiltered into key and value
    const parts = urlLine.trim().split("=");
    return parts[1];
  }
}
