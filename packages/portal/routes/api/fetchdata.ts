export const GET = async () => {
  const testReport = await (await fetch('http://localhost:3000/api/report')).json();
  const versionList = await (await fetch('http://localhost:3000/api/release'))
    .json();
  const coverage = await (await fetch(
    'https://codecov.io/gh/officedev/teamsfx/branch/dev/graphs/tree.svg',
  )).text();
  return new Response(
    JSON.stringify({
      errMsg: 'ok',
      data: { testReport, versionList, coverage },
    }),
    {
      headers: {
        'content-type': 'application/json',
      },
    },
  );
};
