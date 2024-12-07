/**
 * -------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation.  All Rights Reserved.
 * -------------------------------------------------------------------------------------------
 */

import * as vscode from 'vscode';
import { Protocol } from 'devtools-protocol';
import { ChannelOutput } from './channel-output';
import { CopilotLog } from './copilot-log-formatter';
import commonlibLogger, { VsCodeLogProvider } from "../commonlib/log";

interface BotTextMessage {
    messageType: string | undefined;
    text: string;
    createdAt: string;
}

export class WebSocketEventHandler {
    static handleEvent(response: Protocol.Network.WebSocketFrame) : void {
        if (!this.isWebSocketDataRelevant(response)) {
            return;
        }

        try
        {
            const objects = this.splitObjects(response);
            for (const object of objects)
            {
                const parsedObject = JSON.parse(object) as {item: {messages: BotTextMessage[]}};
                const botTextMessages = this.selectBotTextMessages(parsedObject);
                for (const botTextMessage of botTextMessages)
                {
                    const channelOutputJson = this.convertBotMessageToChannelOutputJson(botTextMessage);
                    channelOutputJson.showCopilotLog();

                    const channelOutput = this.convertBotMessageToChannelOutput(botTextMessage);
                    channelOutput.showCopilotLog();
                }
            }
        }
        catch (error)
        {
            void vscode.window.showErrorMessage(`Error parsing response, ${(error as Error).message}`);
        }
    }

    // only type 2 messages contain developer logs
    static isWebSocketDataRelevant(response: Protocol.Network.WebSocketFrame) {
        return response.payloadData.startsWith('{"type":2');
    }

    static splitObjects(response: Protocol.Network.WebSocketFrame) : string[] {
        const objectSeparator = '\x1e'; // ASCII record separator
        return response.payloadData.split(objectSeparator).filter((object: string) => object.length > 0);
    }

    static selectBotTextMessages(object: {item: {messages: BotTextMessage[]}}) : BotTextMessage[] {
        return object.item.messages.filter((message) => message.messageType === 'DeveloperLogs');
    }

    static convertBotMessageToChannelOutput(botTextMessage: BotTextMessage) : ChannelOutput {
        return new ChannelOutput(
            this.getChannelTitle(new Date(botTextMessage.createdAt)),
            new CopilotLog(botTextMessage.text).format(),
            'msclog');
    }

    static convertBotMessageToChannelOutputJson(botTextMessage: BotTextMessage) : ChannelOutput {
        return new ChannelOutput(
            this.getChannelTitle(new Date(botTextMessage.createdAt)) + ' (JSON)',
            this.prettyPrintJson(botTextMessage.text),
            'json');
    }

    static getChannelTitle(createdAt: Date) : string {
        return `Copilot ${createdAt.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')}`;
    }

    static prettyPrintJson(jsonText: string) : string {
        return JSON.stringify(JSON.parse(jsonText), null, 2);
    }
}