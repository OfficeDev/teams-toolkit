export const GET = async (req: Request, ctx: Context) => {
  const { reportId } = await ctx.params;
  const search = new URL(req.url).search;
  const date = new URLSearchParams(search).get('date');
  console.log(date);
  console.log(reportId);
  return new Response(
    JSON.stringify({
      errMsg: 'ok',
    }),
    {
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 200,
    },
  );
};
