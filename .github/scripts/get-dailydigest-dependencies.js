const axios = require("axios");
const glob = require("glob");
const fs = require("fs");
const path = require("path");

const repoRoot = __dirname + "/../..";

async function getTemplatesDependencies() {
  var dependenciesMap = new Map();
  const templatePkgJsonPath = `${repoRoot}/templates/**/package.json.tpl`;
  const packageJsonFiles = await glob.glob(templatePkgJsonPath, {
    ignore: "node_modules/**",
  });
  const codeOwnerMap = new Map([
    ["copilot-plugin-from-scratch", "huimiao@microsoft.com"],
    ["dashboard-tab", "huimiao@microsoft.com"],
    ["non-sso-tab", "zhijie.huang@microsoft.com"],
    ["sso-tab", "zhijie.huang@microsoft.com"],
    ["default-bot", "yukundong@microsoft.com"],
    ["link-unfurling", "yukundong@microsoft.com"],
    ["message-extension-action", "yukundong@microsoft.com"],
    ["message-extension-search", "yukundong@microsoft.com"],
    ["message-extension-copilot", "yukundong@microsoft.com"],
    ["non-sso-tab-default-bot/tab", "yuqzho@microsoft.com"],
    ["non-sso-tab-default-bot/bot", "yuqzho@microsoft.com"],
    ["default-bot-message-extension", "yuqzho@microsoft.com"],
    ["message-extension", "yuqzho@microsoft.com"],
    ["office-addin", "huajiezhang@microsoft.com"],
    ["copilot-plugin-existing-api", "yuqzho@microsoft.com"],
    ["copilot-plugin-existing-api-api-key", "yuqzho@microsoft.com"],
    ["spfx-tab", "yuqzho@microsoft.com"],
    ["spfx-tab-import", "yuqzho@microsoft.com"],
    ["sso-tab-with-obo-flow", "bowen.song@microsoft.com"],
    ["command-and-response", "qidon@microsoft.com"],
    ["notification-http-timer-trigger", "qidon@microsoft.com"],
    ["notification-http-trigger", "qidon@microsoft.com"],
    ["notification-restify", "qidon@microsoft.com"],
    ["notification-timer-trigger", "qidon@microsoft.com"],
    ["notification-webapi", "qidon@microsoft.com"],
    ["workflow", "qidon@microsoft.com"],
    ["m365-message-extension", "kuojianlu@microsoft.com"],
    ["m365-tab", "kuojianlu@microsoft.com"],
    ["ai-bot", "kuojianlu@microsoft.com"],
    ["ai-assistant-bot", "kuojianlu@microsoft.com"],
  ]);

  packageJsonFiles.forEach((packageJsonFile) => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonFile, "utf8"));
    let packageJsonDir = path.relative(
      `${repoRoot}/templates`,
      path.dirname(packageJsonFile)
    );
    let codeOwners = "";
    for (const [key, value] of codeOwnerMap) {
      if (packageJsonDir.includes("non-sso-tab-default-bot")) {
        codeOwners = "yuqzho@microsoft.com";
        continue;
      }
      if (key === path.basename(packageJsonDir)) {
        codeOwners = value;
      }
    }
    let dependencies = packageJson["dependencies"];
    Object.assign(dependencies, packageJson["devDependencies"]);
    for (dependency in dependencies) {
      if (
        dependenciesMap.has(dependency) &&
        dependenciesMap.get(dependency).has(codeOwners)
      ) {
        dependenciesMap.get(dependency).get(codeOwners).push({
          packageJsonDir,
          version: dependencies[dependency],
        });
      } else if (dependenciesMap.has(dependency)) {
        dependenciesMap
          .get(dependency)
          .set(codeOwners, [
            { packageJsonDir, version: dependencies[dependency] },
          ]);
      } else {
        const codeOwnerTemplateMap = new Map([
          [codeOwners, [{ packageJsonDir, version: dependencies[dependency] }]],
        ]);
        dependenciesMap.set(dependency, codeOwnerTemplateMap);
      }
    }
  });
  return dependenciesMap;
}

function generateAdaptiveCardColumnSets(arr) {
  if (arr.length === 0) {
    return [];
  }
  let columnSets = [
    {
      type: "ColumnSet",
      columns: [
        {
          type: "Column",
          width: 22,
          items: [
            {
              type: "TextBlock",
              text: "Package",
              wrap: true,
              weight: "Bolder",
            },
          ],
          verticalContentAlignment: "Center",
        },
        {
          type: "Column",
          width: 38,
          items: [
            {
              type: "TextBlock",
              text: "Templates",
              wrap: true,
              weight: "Bolder",
            },
          ],
          verticalContentAlignment: "Center",
        },
        {
          type: "Column",
          width: 17,
          items: [
            {
              type: "TextBlock",
              text: "Version",
              wrap: true,
              weight: "Bolder",
            },
          ],
          verticalContentAlignment: "Center",
        },
        {
          type: "Column",
          width: 23,
          items: [
            {
              type: "TextBlock",
              text: "Owners",
              wrap: true,
              weight: "Bolder",
            },
          ],
          verticalContentAlignment: "Center",
        },
      ],
      separator: true,
    },
  ];
  for (package of arr) {
    let ownerColumnSets = [];
    package.ownerMap.forEach(function (templatesInfo, owner) {
      ownerColumnSets.push({
        type: "ColumnSet",
        separator: true,
        columns: [
          {
            type: "Column",
            width: 56,
            items: templatesInfo.map((templateInfo) => {
              return {
                type: "ColumnSet",
                columns: [
                  {
                    type: "Column",
                    width: 40,
                    items: [
                      {
                        type: "TextBlock",
                        text: templateInfo.packageJsonDir,
                        wrap: true,
                        size: "Small",
                      },
                    ],
                  },
                  {
                    type: "Column",
                    width: 16,
                    items: [
                      {
                        type: "TextBlock",
                        text: templateInfo.version,
                        wrap: true,
                        size: "Small",
                      },
                    ],
                  },
                ],
              };
            }),
          },
          {
            type: "Column",
            width: 24,
            items: [
              {
                type: "TextBlock",
                text: owner,
                wrap: true,
                size: "Small",
              },
            ],
          },
        ],
      });
    });

    columnSets.push({
      type: "ColumnSet",
      columns: [
        {
          type: "Column",
          width: 20,
          items: [
            {
              type: "TextBlock",
              text:
                `[${package.name}](https://www.npmjs.com/package/${package.name})` +
                "\n\r" +
                `LTS-${package.version}`,
              wrap: true,
              size: "Small",
            },
          ],
        },
        {
          type: "Column",
          width: 80,
          items: ownerColumnSets,
        },
      ],
      separator: true,
    });
  }

  return columnSets;
}

async function main() {
  const dependenciesMap = await getTemplatesDependencies();
  let arr = [];
  for (const entry of dependenciesMap.entries()) {
    await axios
      .get(`https://registry.npmjs.org/${entry[0]}`)
      .then((response) => {
        const ltsVersion = response.data["dist-tags"].latest;
        const ltsVersionTime = response.data.time[ltsVersion];
        const timeDiff = (new Date() - new Date(ltsVersionTime)) / 1000;
        if (timeDiff <= 86400) {
          arr.push({
            name: entry[0],
            version: ltsVersion,
            ownerMap: entry[1],
          });
        }
      });
  }
  const table = generateAdaptiveCardColumnSets(arr);
  const tableString = JSON.stringify(table);
  return JSON.stringify(tableString);
}

main().then((result) => {
  console.log(result);
});
