// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { TeamsActivityHandler, tokenExchangeOperationName, ActionTypes, CardFactory} = require("botbuilder");

class TeamsBot extends TeamsActivityHandler {
    /**
     *
     * @param {ConversationState} conversationState
     * @param {UserState} userState
     * @param {Dialog} dialog
     */
    constructor(conversationState, userState, dialog) {
        super();
        if (!conversationState) {
            throw new Error('[TeamsBot]: Missing parameter. conversationState is required');
        }
        if (!userState) {
            throw new Error('[TeamsBot]: Missing parameter. userState is required');
        }
        if (!dialog) {
            throw new Error('[TeamsBot]: Missing parameter. dialog is required');
        }
        this.conversationState = conversationState;
        this.userState = userState;
        this.dialog = dialog;
        this.dialogState = this.conversationState.createProperty('DialogState');

        this.onMessage(async (context, next) => {
            console.log('Running dialog with Message Activity.');

            // Run the Dialog with the new message Activity.
            await this.dialog.run(context, this.dialogState);

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                if (membersAdded[cnt].id) {
                    const cardButtons = [{ type: ActionTypes.ImBack, title: 'Show introduction card', value: 'intro' }];
                    const card = CardFactory.heroCard(
                        'Welcome',
                        null,
                        cardButtons,
                        {
                            text: `Congratulations! Your hello world Bot 
                            template is running. This bot has default commands to help you modify it.
                            You can reply <strong>intro</strong> to see the introduction card. This bot is built with <a href=\"https://dev.botframework.com/\">Microsoft Bot Framework</a>`
                        });
                    await context.sendActivity({ attachments: [card] });
                    break;
                }
            }
            await next();
        });
    }

    async run(context) {
        await super.run(context);

        // Save any state changes. The load happened during the execution of the Dialog.
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }

    async handleTeamsSigninVerifyState(context, query) {
        console.log('Running dialog with signin/verifystate from an Invoke Activity.');
        await this.dialog.run(context, this.dialogState);
    }

    async handleTeamsSigninTokenExchange(context, query) {
        await this.dialog.run(context, this.dialogState);
    }

    async onTokenResponseEvent(context) {
        console.log('Running dialog with Token Response Event Activity.');

        // Run the Dialog with the new Token Response Event Activity.
        await this.dialog.run(context, this.dialogState);
    }

    async onSignInInvoke(context) {
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
}

module.exports.TeamsBot = TeamsBot;