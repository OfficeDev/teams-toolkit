// deno-lint-ignore-file no-explicit-any
import { Database, MongoClient } from 'mongodb';
import { aggregateOptions, Fields } from '~/utils/schema.ts';
import { getEnv } from '~/utils/tools.ts';

class Mongo {
  public readonly client: MongoClient;
  public databaseName: string;
  public db: Database | undefined;
  private readonly MONGODB_CONN: string;
  constructor(database: string = 'teamsfx') {
    this.client = new MongoClient();
    this.databaseName = database;
    this.MONGODB_CONN = getEnv('CUSTOMCONNSTR_MONGODB_CONN');
  }

  public async connect() {
    try {
      console.log('Connecting to MongoDB...');
      await this.client.connect(this.MONGODB_CONN);
      this.db = this.client.database(this.databaseName);
      console.log(`current database is: '${this.db.name}'.`);
    } catch (error) {
      console.log(error);
    }
  }

  public setDatabase(databaseName: string) {
    this.db = this.client.database(databaseName);
    console.log(`current database is: '${this.db.name}'.`);
  }

  public close() {
    this.client.close();
    console.log('MongoDB connection closed.');
  }
  public async insertOne(collectionName: string, data: Fields) {
    console.log('inserting data...');
    try {
      const collection = this.db?.collection<Fields>(collectionName);
      if (collection) {
        try {
          const result = await collection.insertOne(data);
          return { state: 'success', _id: result };
        } catch (error) {
          return ({ state: 'fail', error });
        }
      } else {
        return { state: 'fail', error: 'collection not found' };
      }
    } catch (error) {
      return ({ state: 'fail', error });
    }
  }

  public async insertMany(collectionName: string, data: Fields[]) {
    console.log('inserting data...');
    try {
      const collection = this.db?.collection<Fields>(collectionName);
      if (collection) {
        const result = await collection.insertMany(data);
        return { state: 'success', ...result };
      } else {
        return { state: 'fail', error: 'collection not found' };
      }
    } catch (error) {
      return ({ state: 'fail', error });
    }
  }

  public async deleteOne(collectionName: string, filter: Record<string, any>) {
    console.log('deleting data...');
    try {
      const collection = this.db?.collection<Fields>(collectionName);
      if (collection) {
        const result = await collection.deleteOne(filter);
        if (result) {
          return { state: 'success', deleteNumber: result };
        } else {
          return { state: 'fail', error: 'data not found' };
        }
      } else {
        return { state: 'fail', error: 'collection not found' };
      }
    } catch (error) {
      return ({ state: 'fail', error });
    }
  }

  public async deleteMany(collectionName: string, filter: Record<string, any>) {
    console.log('deleting data...');
    try {
      const collection = this.db?.collection<Fields>(collectionName);
      if (collection) {
        const result = await collection.deleteMany(filter);
        if (result) {
          return { state: 'success', deleteNumber: result };
        } else {
          return { state: 'fail', error: 'data not found' };
        }
      } else {
        return { state: 'fail', error: 'collection not found' };
      }
    } catch (error) {
      return ({ state: 'fail', error });
    }
  }

  public async findOne(collectionName: string, filter: Record<string, any>) {
    console.log('finding data...');
    try {
      const collection = this.db?.collection<Fields>(collectionName);
      if (collection) {
        const result = await collection.findOne(filter);
        if (result) {
          return { state: 'success', data: result };
        } else {
          return { state: 'fail', error: 'data not found' };
        }
      } else {
        return { state: 'fail', error: 'collection not found' };
      }
    } catch (error) {
      return ({ state: 'fail', error });
    }
  }

  public async findMany(collectionName: string, filter: Record<string, any>) {
    console.log('finding data...');
    try {
      const collection = this.db?.collection<Fields>(collectionName);
      if (collection) {
        const result = await collection.find(filter).toArray();
        if (result.length) {
          return { state: 'success', data: result, count: result.length };
        } else {
          return { state: 'fail', error: 'data not found' };
        }
      } else {
        return { state: 'fail', error: 'collection not found' };
      }
    } catch (error) {
      return ({ state: 'fail', error });
    }
  }

  public async updateOne(
    collectionName: string,
    filter: Record<string, any>,
    data: Record<string, any>,
  ) {
    console.log('updating data...');
    try {
      const collection = this.db?.collection<Fields>(collectionName);
      if (collection) {
        const result = await collection.updateOne(filter, { $set: data });
        if (result.matchedCount) {
          return { state: 'success', ...result };
        } else {
          return { state: 'fail', error: 'data not found' };
        }
      } else {
        return { state: 'fail', error: 'collection not found' };
      }
    } catch (error) {
      return ({ state: 'fail', error });
    }
  }

  public async updateMany(
    collectionName: string,
    filter: Record<string, any>,
    data: Record<string, any>,
  ) {
    console.log('updating data...');
    try {
      const collection = this.db?.collection<Fields>(collectionName);
      if (collection) {
        const result = await collection.updateMany(filter, { $set: data });
        if (result.matchedCount) {
          return { state: 'success', ...result };
        } else {
          return { state: 'fail', error: 'data not found' };
        }
      } else {
        return { state: 'fail', error: 'collection not found' };
      }
    } catch (error) {
      return ({ state: 'fail', error });
    }
  }

  public async aggregate(collectionName: string, pipeline: aggregateOptions[]) {
    console.log('aggregating data...');
    try {
      const collection = this.db?.collection<Fields>(collectionName);
      if (collection) {
        const result = await collection.aggregate(pipeline).toArray();
        if (result.length) {
          return { state: 'success', result, count: result.length };
        } else {
          return { state: 'fail', error: 'data not found' };
        }
      } else {
        return { state: 'fail', error: 'collection not found' };
      }
    } catch (error) {
      return ({ state: 'fail', error });
    }
  }

  public async count(collectionName: string, filter: Record<string, any>) {
    console.log('counting data...');
    try {
      const collection = this.db?.collection<Fields>(collectionName);
      if (collection) {
        const result = await collection.countDocuments(filter);
        if (result) {
          return { state: 'success', result };
        } else {
          return { state: 'fail', error: 'data not found' };
        }
      } else {
        return { state: 'fail', error: 'collection not found' };
      }
    } catch (error) {
      return ({ state: 'fail', error });
    }
  }

  public async distinct(
    collectionName: string,
    field: string,
    filter: Record<string, any>,
  ) {
    console.log('distincting data...');
    try {
      const collection = this.db?.collection<Fields>(collectionName);
      if (collection) {
        const result = await collection.distinct(field, filter);
        if (result.length) {
          return { state: 'success', result, count: result.length };
        } else {
          return { state: 'fail', error: 'data not found' };
        }
      } else {
        return { state: 'fail', error: 'collection not found' };
      }
    } catch (error) {
      return ({ state: 'fail', error });
    }
  }
}

export default Mongo;
