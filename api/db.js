import { MongoClient } from 'mongodb';

const uri = process.env.NOVASTORAGE_MONGODB_URI || process.env.MONGODB_URI;

if (!uri) {
  console.warn('⚠️  No MongoDB URI found. Set NOVASTORAGE_MONGODB_URI or MONGODB_URI.');
}

let client;
let clientPromise;

// Reuse connection across serverless invocations (Vercel keeps warm containers)
if (uri) {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
}

export async function getDb() {
  if (!clientPromise) throw new Error('MongoDB not configured');
  const client = await clientPromise;
  return client.db('nova');
}

export { clientPromise };
