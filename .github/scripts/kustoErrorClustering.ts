import { Client, KustoConnectionStringBuilder } from "azure-kusto-data";
import { IngestClient, IngestionProperties, IngestionPropertiesEnums } from "azure-kusto-ingest";
import KustoIngestClient from "azure-kusto-ingest/source/ingestClient";
import KustoIngestStatusQueues from "azure-kusto-ingest/source/status";
import * as fs from "fs-extra";
import { clustering, clusteringIncr, ClusterView, ILog } from "logmining";
import * as os from "os";
import * as path from "path";


const clusterName = "teamsfxaggregation.eastus";
const appId = "fde970ca-50b2-459b-b0ed-34cf646e0fdd";
const appKey = "1v~-zHq.2M0x6tW~JF.le~H6FcR3qLzo18";
const authorityId = "microsoft.com";


async function queryErrorData(startTime = "2021-09-08T03:07:52") : Promise<any[]>{
  const stringBuilder = KustoConnectionStringBuilder.withAadApplicationKeyAuthentication(`https://${clusterName}.kusto.windows.net`, appId, appKey, authorityId);
  const client = new Client(stringBuilder);
  const condition = `| where ExtensionName == "ms-teams-vscode-extension"
                        | where ServerTimestamp > datetime('${startTime}')
                        | extend EventName = trim_start("ms-teams-vscode-extension/", EventName)
                        | extend Component = tostring(Properties["component"])
                        | extend AppId = tostring(Properties["appid"])
                        | extend CorrelationId = tostring(Properties["correlation-id"])
                        | extend ProjectId = tostring(Properties["project-id"])
                        | extend ErrorType = tostring(Properties["error-type"])
                        | extend ErrorCode = tostring(Properties["error-code"])
                        | extend ErrorMsg = tostring(Properties["error-message"])
                        | project ServerTimestamp, ClientTimestamp, ExtensionVersion, EventName, Platform, PlatformVersion, Component, ErrorType, ErrorCode, ErrorMsg, VSCodeMachineId, VSCodeSessionId, CorrelationId, ProjectId, Properties
                        | where Properties["success"] == "no"
                        | where ExtensionVersion matches regex "^[0-9]+.[0-9]+.[0-9]+$"`;
  const query = `teamsfx_all ${condition}`;
  console.log(query);
  const results = await client.execute("vscode-ext-aggregate", query);
  const table = results.primaryResults[0];
  const data = table.toJson();
  console.log(`found ${data.data.length} new error data!`);
  return data.data as any[];
}

async function queryPatternData() : Promise<any[]>{
  const stringBuilder = KustoConnectionStringBuilder.withAadApplicationKeyAuthentication(`https://${clusterName}.kusto.windows.net`, appId, appKey, authorityId);
  const client = new Client(stringBuilder);
  const query = `teamsfx_error_pattern`;
  console.log(query);
  const results = await client.execute("vscode-ext-aggregate", query);
  const table = results.primaryResults[0];
  const data = table.toJson();
  console.log(data.data.length);
  return data.data as any[];
}

async function getMaxServerTimeOfErrorTable() {
  const stringBuilder = KustoConnectionStringBuilder.withAadApplicationKeyAuthentication(`https://${clusterName}.kusto.windows.net`, appId, appKey, authorityId);
  const client = new Client(stringBuilder);
  const query = `teamsfx_error | summarize MaxServerTime = max(ServerTimestamp)`;
  console.log(query);
  const results = await client.execute("vscode-ext-aggregate", query);
  const table = results.primaryResults[0];
  const data = table.toJson();
  const MaxServerTime = data.data[0].MaxServerTime as moment.Moment;
  const formatted = MaxServerTime.toISOString();
  return formatted;
}

async function clearTable(tableName: string) {
  const stringBuilder = KustoConnectionStringBuilder.withAadApplicationKeyAuthentication(`https://${clusterName}.kusto.windows.net`, appId, appKey, authorityId);
  const client = new Client(stringBuilder);
  const query = `.clear table ${tableName} data `;
  console.log(query);
  const results = await client.executeMgmt("vscode-ext-aggregate", query);
  console.log(JSON.stringify(results));
}

const ErrorProps = new IngestionProperties({
  database: "vscode-ext-aggregate",
  table: "teamsfx_error",
  format: IngestionPropertiesEnums.DataFormat.JSON,
  ingestionMapping: [
      new IngestionPropertiesEnums.JsonColumnMapping("ClientTimestamp", "$.ClientTimestamp"),
      new IngestionPropertiesEnums.JsonColumnMapping("ServerTimestamp", "$.ServerTimestamp"),
      new IngestionPropertiesEnums.JsonColumnMapping("ExtensionVersion", "$.ExtensionVersion"),
      new IngestionPropertiesEnums.JsonColumnMapping("EventName", "$.EventName"),
      new IngestionPropertiesEnums.JsonColumnMapping("Component", "$.Component"),
      new IngestionPropertiesEnums.JsonColumnMapping("ErrorType", "$.ErrorType"),
      new IngestionPropertiesEnums.JsonColumnMapping("ErrorCode", "$.ErrorCode"),
      new IngestionPropertiesEnums.JsonColumnMapping("ErrorMsg", "$.ErrorMsg"),
      new IngestionPropertiesEnums.JsonColumnMapping("Platform", "$.Platform"),
      new IngestionPropertiesEnums.JsonColumnMapping("PlatformVersion", "$.PlatformVersion"),
      new IngestionPropertiesEnums.JsonColumnMapping("VSCodeMachineId", "$.VSCodeMachineId"),
      new IngestionPropertiesEnums.JsonColumnMapping("VSCodeSessionId", "$.VSCodeSessionId"),
      new IngestionPropertiesEnums.JsonColumnMapping("CorrelationId", "$.CorrelationId"),
      new IngestionPropertiesEnums.JsonColumnMapping("ProjectId", "$.ProjectId"),
      new IngestionPropertiesEnums.JsonColumnMapping("Properties", "$.Properties"),
      new IngestionPropertiesEnums.JsonColumnMapping("ErrorMsgPatternText", "$.ErrorMsgPatternText"),
      new IngestionPropertiesEnums.JsonColumnMapping("ErrorMsgPatternId", "$.ErrorMsgPatternId"),
  ],
  ingestionMappingType: IngestionPropertiesEnums.IngestionMappingType.JSON,
  reportLevel: IngestionPropertiesEnums.ReportLevel.FailuresAndSuccesses,
  reportMethod: IngestionPropertiesEnums.ReportMethod.Queue
});

const PatternProps = new IngestionProperties({
  database: "vscode-ext-aggregate",
  table: "teamsfx_error_pattern",
  format: IngestionPropertiesEnums.DataFormat.JSON,
  ingestionMapping: [
      new IngestionPropertiesEnums.JsonColumnMapping("Id", "$.Id"),
      new IngestionPropertiesEnums.JsonColumnMapping("Pattern", "$.Pattern"),
      new IngestionPropertiesEnums.JsonColumnMapping("Text", "$.Text"),
      new IngestionPropertiesEnums.JsonColumnMapping("Count", "$.Count"),
  ],
  ingestionMappingType: IngestionPropertiesEnums.IngestionMappingType.JSON,
  reportLevel: IngestionPropertiesEnums.ReportLevel.FailuresAndSuccesses,
  reportMethod: IngestionPropertiesEnums.ReportMethod.Queue
});

const ingestErrorClient = new IngestClient(
  KustoConnectionStringBuilder.withAadApplicationKeyAuthentication(
      `https://ingest-${clusterName}.kusto.windows.net`, appId, appKey, authorityId
  ),
  ErrorProps
);

const ingestPatternClient = new IngestClient(
  KustoConnectionStringBuilder.withAadApplicationKeyAuthentication(
      `https://ingest-${clusterName}.kusto.windows.net`, appId, appKey, authorityId
  ),
  PatternProps
);

 
async function ingestDataFromFile(client: KustoIngestClient, file: string) {
  const statusQueue = new KustoIngestStatusQueues(client);
  console.log(`Ingest from file: ${file}`);
  try {
      await client.ingestFromFile(file);
      console.log("Ingestion done?");
      await waitForStatus(statusQueue);
  }
  catch (err) {
      console.log(err);
      throw err;
  }
}
 

async function waitForStatus(statusQueue: KustoIngestStatusQueues) {
  while (await statusQueue.failure.isEmpty() && await statusQueue.success.isEmpty()) {
      console.log("Waiting for status...");
      await sleep(1000);
  }
  const failures = await statusQueue.failure.pop(1);
  for (let failure of failures) {
      console.log(`Failed: ${JSON.stringify(failure)}`);
  }
  const successes = await statusQueue.success.pop(1);
  for (let success of successes) {
      console.log(`Succeeded: ${JSON.stringify(success)}`);
  }
}



function sleep(ms: number) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

 
async function writeErrorDataToFile(logs: any[], file: string) {
  const stream = fs.createWriteStream(file);
  for(const log of logs) {
    stream.write(JSON.stringify(log) + "\n");
  }
  stream.end();
}

async function writePatternDataToFile(clusters: ClusterView[], file: string){
  const stream = fs.createWriteStream(file);
  for(const cluster of clusters) {
    const obj:any = {
      Id: cluster.patternId,
      Text: cluster.patternString,
      Pattern: cluster.pattern,
      Count: cluster.count,
    };
    stream.write(JSON.stringify(obj) + "\n");
  }
  stream.end();
}

function convertToILogs(rawData: any[]) {
  const logs: ILog[] = rawData.map((l: any)=>{
    let content = l.ErrorMsg;
    let i = l.ErrorMsg.indexOf("\nstack:\n");
    if(i >= 0) {
      content = content.substr(0, i);
    }
    i = l.ErrorMsg.indexOf("Detailed error:");
    if(i >= 0) {
      content = content.substr(0, i);
    }
    content = content.replace("<REDACTED: user-file-path>", "PATH");
    const log:ILog = {
      content: content,
      raw: l,
    };
    return log;
  });
  return logs;
}

/**
 * 初始化运行
 * @param startTime 
 */
async function runInit(startTime: string) {
  console.log("######step 1 - query data from kusto. ");
  const rawData = await queryErrorData(startTime);

  console.log(`######step 2 - pre-process data, size:${rawData.length}`);
  const logs: ILog[] = convertToILogs(rawData);

  console.log(`######step 3 - clustering`);
  const clusters = clustering(logs, 0.8);
  for(const cluster of clusters) {
    for(const index of cluster.memberIndexes){
      const log = logs[index];
      log.raw.ErrorMsgPatternText = cluster.patternString;
      log.raw.ErrorMsgPatternId = cluster.patternId;
    }
  }

  const errorDataFile =  path.join(os.tmpdir(), `kusto_error_${new Date().getTime()}.json`);
  console.log(`######step 4 - write errors to file:${errorDataFile} , number of clusters:${clusters.length}`);
  await writeErrorDataToFile(logs.map(l=>l.raw), errorDataFile);

  const patternDataFile = path.join(os.tmpdir(), `kusto_pattern_${new Date().getTime()}.json`);
  console.log(`######step 5 - write patterns to file:${errorDataFile} , number of clusters:${clusters.length}`);
  await writePatternDataToFile(clusters, patternDataFile);

  console.log(`######step 6 - clear kusto table: teamsfx_error_pattern`);
  await clearTable("teamsfx_error_pattern");

  console.log(`######step 7 - insert data into teamsfx_error_pattern`);
  await ingestDataFromFile(ingestPatternClient, patternDataFile);

  console.log(`######step 8 - clear kusto table: teamsfx_error`);
  await clearTable("teamsfx_error");

  console.log(`######step 9 - insert data into teamsfx_error`);
  await ingestDataFromFile(ingestErrorClient, errorDataFile);
}

/**
 * 增量运行
 */
async function runIncr() {

  console.log("######step 1 - lookup max server time");
  const maxServerTime = await getMaxServerTimeOfErrorTable();

  console.log("######step 2 - query error data incrementally");
  const rawData = await queryErrorData(maxServerTime);
  const logs: ILog[] = convertToILogs(rawData);

  console.log("######step 3 - query pattern data");
  const rawPatterns = await queryPatternData();

  console.log("######step 4 - clustering error data based on existing clusters");
  const existingClusters: ClusterView[] = rawPatterns.map(p=>{
    const cluster: ClusterView = {
      memberIndexes:[],
      pattern: p.Pattern,
      patternId: p.Id,
      patternString: p.Text,
      data: p.Count,
      count: 0
    };
    return cluster;
  });
  const patternNumber = existingClusters.length;
  const newClusters = clusteringIncr(logs, existingClusters, 0.8);
  for(const cluster of newClusters) {
    for(const index of cluster.memberIndexes){
      const log = logs[index];
      log.raw.ErrorMsgPatternText = cluster.patternString;
      log.raw.ErrorMsgPatternId = cluster.patternId;
    }
    const count = Number(cluster.data) + cluster.memberIndexes.length;
    cluster.count = count;
  }

  console.log(`found ${newClusters.length - patternNumber} new patterns!`);

  const errorDataFile =  path.join(os.tmpdir(), `kusto_error_${new Date().getTime()}.json`);
  console.log(`######step 5 - write errors to file:${errorDataFile} , number of clusters:${newClusters.length}`);
  await writeErrorDataToFile(logs.map(l=>l.raw), errorDataFile);

  const patternDataFile = path.join(os.tmpdir(), `kusto_pattern_${new Date().getTime()}.json`);
  console.log(`######step 6 - write patterns to file:${errorDataFile} , number of clusters:${newClusters.length}`);
  await writePatternDataToFile(newClusters, patternDataFile);

  console.log(`######step 7 - clear kusto table: teamsfx_error_pattern`);
  await clearTable("teamsfx_error_pattern");

  console.log(`######step 8 - insert data into teamsfx_error_pattern`);
  await ingestDataFromFile(ingestPatternClient, patternDataFile);

  console.log(`######step 9 - insert data into teamsfx_error`);
  await ingestDataFromFile(ingestErrorClient, errorDataFile);

}

const type = process.argv[2];

if(type === "-i") {
  console.log("run pipeline from zero!");
  runInit("2021-08-23T06:59:19");
}
else {
  console.log("run pipeline incrementally!");
  runIncr();
}