const { QdrantClient } = require('@qdrant/js-client-rest');

const qdrant = new QdrantClient({
  url: 'https://31f3ca7b-ad72-4c5f-a78b-aa2ede8d5d9e.eu-west-1-0.aws.cloud.qdrant.io',
  apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6NGI3ZjVjZDItMDZlZi00N2FhLWFiYjItMjUxNmY1NWU3MGJmIn0.J0dUiu2gBW2LUsP5vn77lHdl0i_ZQFOENPmPQ5YDUys',
});

async function run() {
  try {
    const dummyVector = new Array(384).fill(0.1);
    const filter = {
      must: [{ key: 'metadata.workspaceId', match: { value: '24e9d54a-3e68-48bb-b116-79743b3f0675' } }],
    };

    console.log('Sending search request...');
    const results = await qdrant.search('rag_documents_v2', {
      vector: dummyVector,
      limit: 5,
      score_threshold: 0.25,
      filter,
      with_payload: true,
    });
    console.log('Search results:', results);
  } catch (err) {
    console.error('Error during search:', err);
    if (err.response) {
      try {
        const text = await err.response.text();
        console.error('Response text:', text);
      } catch (e) {}
    }
  }
}

run();
