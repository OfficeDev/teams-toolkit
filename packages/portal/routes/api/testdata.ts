export const GET = async () => {
  // const mongo = new Mongo()
  // mongo.connect()
  const data = await Deno.readTextFile('test-web-server/fakeData.json');
  // mongo.close()
  return new Response(data, {
    headers: {
      'content-type': 'application/json',
    },
  });
};
