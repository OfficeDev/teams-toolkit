// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { default as axios } from "axios";
import * as querystring from "querystring";

import {
    TeamsActivityHandler,
    SigninStateVerificationQuery,
    ActionTypes,
    CardFactory,
    BotState,
    TurnContext,
    tokenExchangeOperationName,
} from "botbuilder";
import { MainDialog } from "./dialogs/mainDialog";

export class TeamsBot extends TeamsActivityHandler {
    conversationState: BotState;
    userState: BotState;
    dialog: MainDialog;
    dialogState: any;

    /**
     *
     * @param {ConversationState} conversationState
     * @param {UserState} userState
     * @param {Dialog} dialog
     */
    constructor(
        conversationState: BotState,
        userState: BotState,
        dialog: MainDialog
    ) {
        super();
        if (!conversationState) {
            throw new Error(
                "[TeamsBot]: Missing parameter. conversationState is required"
            );
        }
        if (!userState) {
            throw new Error(
                "[TeamsBot]: Missing parameter. userState is required"
            );
        }
        if (!dialog) {
            throw new Error(
                "[TeamsBot]: Missing parameter. dialog is required"
            );
        }
        this.conversationState = conversationState;
        this.userState = userState;
        this.dialog = dialog;
        this.dialogState = this.conversationState.createProperty("DialogState");

        this.onMessage(async (context, next) => {
            console.log("Running dialog with Message Activity.");

            // Run the Dialog with the new message Activity.
            await this.dialog.run(context, this.dialogState);

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                if (membersAdded[cnt].id) {
                    const cardButtons = [
                        {
                            type: ActionTypes.ImBack,
                            title: "Show introduction card",
                            value: "intro",
                        },
                    ];
                    const card = CardFactory.heroCard(
                        "Welcome",
                        null,
                        cardButtons,
                        {
                            text: `Congratulations! Your hello world Bot template is running. This bot has default commands to help you modify it. <br>You can reply <strong>intro</strong> to see the introduction card. This bot is built with <a href=\"https://dev.botframework.com/\">Microsoft Bot Framework</a>`,
                        }
                    );
                    await context.sendActivity({ attachments: [card] });
                    break;
                }
            }
            await next();
        });
    }

    async run(context: TurnContext) {
        await super.run(context);

        // Save any state changes. The load happened during the execution of the Dialog.
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }

    async handleTeamsSigninVerifyState(
        context: TurnContext,
        query: SigninStateVerificationQuery
    ) {
        console.log(
            "Running dialog with signin/verifystate from an Invoke Activity."
        );
        await this.dialog.run(context, this.dialogState);
    }

    async handleTeamsSigninTokenExchange(
        context: TurnContext,
        query: SigninStateVerificationQuery
    ) {
        await this.dialog.run(context, this.dialogState);
    }

    async onSignInInvoke(context: TurnContext) {
        if (
            context.activity &&
            context.activity.name === tokenExchangeOperationName
        ) {
            if (await this.dialog.shouldDedup(context)) {
                return;
            }
        }
        await this.dialog.run(context, this.dialogState);
    }

    // Message Extension Code
    // Action.
    public async handleTeamsMessagingExtensionSubmitAction(
        context: TurnContext,
        action: any
    ): Promise<any> {
        switch (action.commandId) {
            case "createCard":
                return createCardCommand(context, action);
            case "shareMessage":
                return shareMessageCommand(context, action);
            default:
                throw new Error("NotImplemented");
        }
    }

    // Search.
    public async handleTeamsMessagingExtensionQuery(
        context: TurnContext,
        query: any
    ): Promise<any> {
        const searchQuery = query.parameters[0].value;
        const response = await axios.get(
            `http://registry.npmjs.com/-/v1/search?${querystring.stringify({
                text: searchQuery,
                size: 8,
            })}`
        );

        const attachments = [];
        response.data.objects.forEach((obj) => {
            const heroCard = CardFactory.heroCard(obj.package.name);
            const preview = CardFactory.heroCard(obj.package.name);
            preview.content.tap = {
                type: "invoke",
                value: { description: obj.package.description },
            };
            const attachment = { ...heroCard, preview };
            attachments.push(attachment);
        });

        return {
            composeExtension: {
                type: "result",
                attachmentLayout: "list",
                attachments: attachments,
            },
        };
    }

    public async handleTeamsMessagingExtensionSelectItem(
        context: TurnContext,
        obj: any
    ): Promise<any> {
        return {
            composeExtension: {
                type: "result",
                attachmentLayout: "list",
                attachments: [CardFactory.thumbnailCard(obj.description)],
            },
        };
    }

    // Link Unfurling.
    public async handleTeamsAppBasedLinkQuery(
        context: TurnContext,
        query: any
    ): Promise<any> {
        const attachment = CardFactory.thumbnailCard(
            "Image Preview Card",
            query.url,
            [query.url]
        );

        const result = {
            attachmentLayout: "list",
            type: "result",
            attachments: [attachment],
        };

        const response = {
            composeExtension: result,
        };
        return response;
    }
}

async function createCardCommand(
    context: TurnContext,
    action: any
): Promise<any> {
    // The user has chosen to create a card by choosing the 'Create Card' context menu command.
    const data = action.data;
    const heroCard = CardFactory.heroCard(data.title, data.text);
    heroCard.content.subtitle = data.subTitle;
    const attachment = {
        contentType: heroCard.contentType,
        content: heroCard.content,
        preview: heroCard,
    };

    return {
        composeExtension: {
            type: "result",
            attachmentLayout: "list",
            attachments: [attachment],
        },
    };
}

async function shareMessageCommand(
    context: TurnContext,
    action: any
): Promise<any> {
    // The user has chosen to share a message by choosing the 'Share Message' context menu command.
    let userName = "unknown";
    if (
        action.messagePayload &&
        action.messagePayload.from &&
        action.messagePayload.from.user &&
        action.messagePayload.from.user.displayName
    ) {
        userName = action.messagePayload.from.user.displayName;
    }

    // This Messaging Extension example allows the user to check a box to include an image with the
    // shared message.  This demonstrates sending custom parameters along with the message payload.
    let images = [];
    const includeImage = action.data.includeImage;
    if (includeImage === "true") {
        images = [
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQtB3AwMUeNoq4gUBGe6Ocj8kyh3bXa9ZbV7u1fVKQoyKFHdkqU",
        ];
    }
    const heroCard = CardFactory.heroCard(
        `${userName} originally sent this message:`,
        action.messagePayload.body.content,
        images
    );

    if (
        action.messagePayload &&
        action.messagePayload.attachment &&
        action.messagePayload.attachments.length > 0
    ) {
        // This sample does not add the MessagePayload Attachments.  This is left as an
        // exercise for the user.
        heroCard.content.subtitle = `(${action.messagePayload.attachments.length} Attachments not included)`;
    }

    const attachment = {
        contentType: heroCard.contentType,
        content: heroCard.content,
        preview: heroCard,
    };

    return {
        composeExtension: {
            type: "result",
            attachmentLayout: "list",
            attachments: [attachment],
        },
    };
}
