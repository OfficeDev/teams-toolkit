// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as path from 'path';
import { AxiosResponse } from 'axios';
import { exec } from 'child_process';
import glob from 'glob';

import { Constants } from './constants';
import { Logger } from './utils/logger';
import fs from 'fs-extra';
import klaw from 'klaw';

export class Utils {
    static async delays(millisecond: number): Promise<void> {
        return await new Promise<void>((resolve: () => void): NodeJS.Timer => setTimeout(resolve, millisecond));
    }

    static generateStorageAccountName(appName: string, resourceNameSuffix: string, suffix: string): string {
        const paddingLength: number =
            Constants.AzureStorageAccountNameLenMax - resourceNameSuffix.length - suffix.length;
        const normalizedAppName: string = appName
            .replace(Constants.FrontendAppNamePattern, Constants.EmptyString)
            .toLowerCase();
        return normalizedAppName.substr(0, paddingLength) + suffix + resourceNameSuffix;
    }

    static async requestWithRetry(
        request: () => Promise<AxiosResponse<any>>,
        errorHandler: (error?: Error) => Error,
    ): Promise<AxiosResponse<any> | undefined> {
        let retries = Constants.RequestRetryTimes;
        let error = new Error();
        while (retries > 0) {
            retries--;
            try {
                const result = await request();
                if (result.status === 200 || result.status === 201) {
                    return result;
                }
                error = errorHandler();
            } catch (e) {
                error = errorHandler(e);
                await Utils.delays(Constants.RequestRetryInterval);
            }
        }
        throw error;
    }

    static async execute(command: string, workingDir?: string, ignoreError: boolean = false): Promise<string> {
        return new Promise((resolve, reject) => {
            Logger.info(`Start to run command: "${command}".`);

            exec(command, { cwd: workingDir }, (error, standardOutput) => {
                Logger.debug(standardOutput);
                if (error) {
                    Logger.error(`Failed to run command: "${command}".`);
                    if (!ignoreError) {
                        Logger.error(error.message);
                        reject(error);
                    }
                    Logger.warning(error.message);
                }
                resolve(standardOutput);
            });
        });
    }

    public static async listFilePaths(directoryPath: string, ignorePattern?: string): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            const ignore: string = ignorePattern ? path.join(directoryPath, ignorePattern) : '';
            glob(
                path.join(directoryPath, '**'),
                {
                    dot: true, // Include .dot files
                    nodir: true, // Only match files
                    ignore,
                },
                (error, filePaths) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(filePaths);
                    }
                },
            );
        });
    }

    public static async forEachFileAndDir(
        root: string,
        callback: (itemPath: string, stats: fs.Stats) => boolean | void,
        filter?: (itemPath: string) => boolean,
    ): Promise<void> {
        await new Promise((resolve, reject) => {
            const stream: klaw.Walker = klaw(root, { filter: filter });
            stream
                .on('data', (item) => {
                    if (callback(item.path, item.stats)) {
                        stream.emit('close');
                    }
                })
                .on('end', () => resolve({}))
                .on('error', (err) => reject(err))
                .on('close', () => resolve({}));
        });
    }
}
