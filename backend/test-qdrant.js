const { QdrantClient } = require('@qdrant/js-client-rest');

const qdrant = new QdrantClient({
  url: 'https://31f3ca7b-ad72-4c5f-a78b-aa2ede8d5d9e.eu-west-1-0.aws.cloud.qdrant.io',
  apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6NGI3ZjVjZDItMDZlZi00N2FhLWFiYjItMjUxNmY1NWU3MGJmIn0.J0dUiu2gBW2LUsP5vn77lHdl0i_ZQFOENPmPQ5YDUys',
});

async function run() {
  try {
    const collections = await qdrant.getCollections();
    console.log('Collections:', collections);
    for (const c of collections.collections) {
      const info = await qdrant.getCollection(c.name);
      console.log(`Collection ${c.name} info:`, JSON.stringify(info, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
