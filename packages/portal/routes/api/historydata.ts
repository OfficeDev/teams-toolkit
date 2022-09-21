export const GET = async () => {
  const data = await Deno.readTextFile('test-web-server/fakeHistoryData.json');
  return new Response(data, {
    headers: {
      'content-type': 'application/json',
    },
  });
};
