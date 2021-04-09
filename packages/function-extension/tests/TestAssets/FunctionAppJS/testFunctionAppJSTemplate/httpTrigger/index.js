module.exports = async function (context, req, TeamsFxContext) {
    context.log('JavaScript HTTP trigger function processed a request.');

    context.res = {
        status: 200, /* Defaults to 200 */
        body: JSON.stringify(TeamsFxContext)
    };
    context.done();
}