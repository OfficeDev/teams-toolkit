const axios = require("axios");
const glob = require("glob");
const fs = require("fs");
const path = require("path");

const repoRoot = __dirname + "/../..";

const githubUserEmailMap = new Map([
  ["@hund030", "zhijie.huang@microsoft.com"],
  ["@eriolchan", "erichen@microsoft.com"],
  ["@huimiu", "huimiao@microsoft.com"],
  ["@JerryYangKai", "yang.kai@microsoft.com"],
  ["@Siglud", "fanhu@microsoft.com"],
  ["@Yukun-dong", "yukundong@microsoft.com"],
  ["@yuqizhou77", "yuqzho@microsoft.com"],
  ["@MSFT-yiz", "yiz@microsoft.com"],
  ["@jayzhang", "huajiezhang@microsoft.com"],
  ["@nliu-ms", "nliu@microsoft.com"],
  ["@Alive-Fish", "zhiyu.you@microsoft.com"],
  ["@HuihuiWu-Microsoft", "huihuiwu@microsoft.com"],
  ["@KennethBWSong", "bowen.song@microsoft.com"],
  ["@adashen", "shenwe@microsoft.com"],
  ["@SLdragon", "rentu@microsoft.com"],
  ["@kimizhu", "jasoz@microsoft.com"],
  ["@dooriya", "dol@microsoft.com"],
  ["@swatDong", "qidon@microsoft.com"],
  ["@kuojianlu", "kuojianlu@microsoft.com"],
]);

async function getTemplatesDependencies() {
  var dependenciesMap = new Map();
  const templatePkgJsonPath = `${repoRoot}/templates/**/package.json.tpl`;
  const packageJsonFiles = await glob.glob(templatePkgJsonPath, {
    ignore: "node_modules/**",
  });
  const codeOwnerFile = await fs
    .readFileSync(path.join(repoRoot, ".github/CODEOWNERS"), "utf8")
    .split("\n")
    .filter((line) => line.startsWith("/templates/**"));
  const codeOwnerMap = new Map();
  codeOwnerFile.forEach((line) => {
    codeOwnerMap.set(
      line.substring(0, line.indexOf(" ")),
      line
        .substring(line.indexOf(" ") + 1)
        .split(" ")
        .map((githubUsername) => {
          return githubUserEmailMap.get(githubUsername);
        })
    );
  });

  packageJsonFiles.forEach((packageJsonFile) => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonFile, "utf8"));
    let packageJsonDir = path.relative(
      `${repoRoot}/templates`,
      path.dirname(packageJsonFile)
    );
    let codeOwners = [];
    for (const [key, value] of codeOwnerMap) {
      if (key.includes(path.basename(packageJsonDir))) {
        codeOwners = value;
      }
    }
    let dependencies = packageJson["dependencies"];
    Object.assign(dependencies, packageJson["devDependencies"]);
    for (dependency in dependencies) {
      if (dependenciesMap.has(dependency)) {
        dependenciesMap.get(dependency).dependencies.push({
          packageJsonDir,
          version: dependencies[dependency],
        });
        dependenciesMap.get(dependency).owners = [
          ...new Set(dependenciesMap.get(dependency).owners.concat(codeOwners)),
        ];
      } else {
        dependenciesMap.set(dependency, {
          dependencies: [{ packageJsonDir, version: dependencies[dependency] }],
          owners: codeOwners,
        });
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
          width: 15,
          items: [
            {
              type: "TextBlock",
              text: "Name",
              wrap: true,
              weight: "Bolder",
            },
          ],
          verticalContentAlignment: "Center",
        },
        {
          type: "Column",
          width: 15,
          items: [
            {
              type: "TextBlock",
              text: "LTS Version",
              wrap: true,
              weight: "Bolder",
            },
          ],
          verticalContentAlignment: "Center",
        },
        {
          type: "Column",
          width: 35,
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
          width: 15,
          items: [
            {
              type: "TextBlock",
              text: "Current Version",
              wrap: true,
              weight: "Bolder",
            },
          ],
          verticalContentAlignment: "Center",
        },
        {
          type: "Column",
          width: 20,
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
      style: "emphasis",
    },
  ];
  for (items of arr) {
    columnSets.push({
      type: "ColumnSet",
      columns: [
        {
          type: "Column",
          width: 15,
          items: [
            {
              type: "TextBlock",
              text: `[${items.name}](https://www.npmjs.com/package/${items.name})`,
              wrap: true,
            },
          ],
        },
        {
          type: "Column",
          width: 15,
          items: [
            {
              type: "TextBlock",
              text: items.version,
              wrap: true,
            },
          ],
        },
        {
          type: "Column",
          width: 50,
          items: items.dependencies.map((dependency) => {
            return {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: 35,
                  items: [
                    {
                      type: "TextBlock",
                      text: dependency.packageJsonDir,
                      wrap: true,
                    },
                  ],
                },
                {
                  type: "Column",
                  width: 15,
                  items: [
                    {
                      type: "TextBlock",
                      text: dependency.version,
                      wrap: true,
                    },
                  ],
                },
              ],
            };
          }),
        },
        {
          type: "Column",
          width: 20,
          items: [
            {
              type: "TextBlock",
              text: items.owners.join("\n\r"),
              wrap: true,
            },
          ],
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
            dependencies: entry[1].dependencies,
            owners: entry[1].owners,
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
