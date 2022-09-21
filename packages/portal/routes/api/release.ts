import Mongo from '~/utils/mongodb.ts';
import { verifyToken } from '~/utils/tools.ts';
import { VersionSchema } from '~/utils/schema.ts';
export const POST = async (request: Request) => {
  const isAuth = verifyToken(request.headers);
  if (isAuth) {
    // verify and reconstruct data
    const data: VersionSchema = await request.json();
    const { sprint, mainVersion, minVersion, app } = data;
    if (!sprint || !mainVersion || !app) {
      return new Response(
        JSON.stringify({
          state: 'fail',
          error: 'missing data',
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    const mongo = new Mongo();
    await mongo.connect();
    // check if the data is already in db
    const isExist = await mongo.findOne('version', {
      sprint,
      mainVersion,
      minVersion,
      app,
    });
    if (isExist.state === 'success') {
      mongo.close();
      return new Response(
        JSON.stringify({
          state: 'fail',
          error: 'data already exist',
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }
    // insert data
    const result = await mongo.insertOne('version', data);
    mongo.close();
    if (result.state === 'fail') {
      return new Response(
        JSON.stringify({
          ...result,
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }
    return new Response(
      JSON.stringify({
        ...result,
      }),
      {
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  } else {
    // not authorized
    return new Response(JSON.stringify({ errMsg: 'unauthorization !!!' }), {
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 401,
    });
  }
};

export const GET = async () => {
  const mongo = new Mongo();
  await mongo.connect();
  const result = await mongo.findMany('version', {});
  mongo.close();
  return new Response(
    JSON.stringify({
      errMsg: 'ok',
      data: result.data,
    }),
    {
      headers: {
        'content-type': 'application/json',
      },
    },
  );
};
