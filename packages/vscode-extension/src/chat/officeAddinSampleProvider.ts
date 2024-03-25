// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import axios from "axios";
import { DocumentMetadata } from "./rag/rag";

type WXPAppName = "Word" | "Excel" | "PowerPoint";

export class OfficeAddinSampleProvider {
  private samples: { [x: string]: DocumentMetadata[] } = {};
  private url =
    "https://api.github.com/repos/OfficeDev/Office-agentsamples/contents/scenario-samples/";

  public async getSamples(name: WXPAppName): Promise<DocumentMetadata[]> {
    if (this.samples[name]) {
      return this.samples[name];
    }
    const returnData: DocumentMetadata[] = [];
    const fullUrl = this.url + name;
    const directoryResponse = await axios.get(fullUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (directoryResponse && directoryResponse.data && directoryResponse.data.length > 0) {
      const dataMap: {
        [x: string]: { Templates: [{ Description: string; SampleCodes: string }] } | null;
      } = {};
      for (const fileInfo of directoryResponse.data) {
        if (fileInfo.download_url) {
          dataMap[fileInfo.download_url] = null;
        }
      }
      const p = [];
      for (const fileInfo of directoryResponse.data) {
        if (fileInfo.download_url) {
          p.push(
            axios
              .get(fileInfo.download_url)
              .then((response) => {
                if (response.data) {
                  dataMap[fileInfo.download_url] = response.data;
                }
              })
              .catch((error) => {
                console.log(error);
              })
          );
        }
      }
      await Promise.all(p);
      for (const value of Object.values(dataMap)) {
        try {
          if (value && value.Templates && value.Templates.length > 0) {
            for (const template of value.Templates) {
              if (template.Description && template.SampleCodes) {
                const metadata: DocumentMetadata = {
                  description: template.Description,
                  codeSample: template.SampleCodes,
                };
                returnData.push(metadata);
              }
            }
          }
        } catch (error) {
          console.log(error);
        }
      }
      if (returnData.length > 0) {
        this.samples[name] = returnData;
      }
    }
    return returnData;
  }
}

export const officeAddinSampleProvider = new OfficeAddinSampleProvider();
