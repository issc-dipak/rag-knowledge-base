const { QdrantClient } = require('@qdrant/js-client-rest');

const qdrant = new QdrantClient({
  url: 'https://31f3ca7b-ad72-4c5f-a78b-aa2ede8d5d9e.eu-west-1-0.aws.cloud.qdrant.io',
  apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6NGI3ZjVjZDItMDZlZi00N2FhLWFiYjItMjUxNmY1NWU3MGJmIn0.J0dUiu2gBW2LUsP5vn77lHdl0i_ZQFOENPmPQ5YDUys',
});

async function run() {
  const collections = ['rag_documents', 'rag_documents_v2'];
  for (const collectionName of collections) {
    try {
      console.log(`Creating payload index for metadata.workspaceId in ${collectionName}...`);
      await qdrant.createPayloadIndex(collectionName, {
        field_name: 'metadata.workspaceId',
        field_schema: 'keyword',
      });
      console.log(`Successfully created index for metadata.workspaceId in ${collectionName}`);
    } catch (err) {
      console.error(`Error creating index for metadata.workspaceId in ${collectionName}:`, err.message || err);
    }

    try {
      console.log(`Creating payload index for documentId in ${collectionName}...`);
      await qdrant.createPayloadIndex(collectionName, {
        field_name: 'documentId',
        field_schema: 'keyword',
      });
      console.log(`Successfully created index for documentId in ${collectionName}`);
    } catch (err) {
      console.error(`Error creating index for documentId in ${collectionName}:`, err.message || err);
    }

    try {
      console.log(`Creating payload index for metadata.fileType in ${collectionName}...`);
      await qdrant.createPayloadIndex(collectionName, {
        field_name: 'metadata.fileType',
        field_schema: 'keyword',
      });
      console.log(`Successfully created index for metadata.fileType in ${collectionName}`);
    } catch (err) {
      console.error(`Error creating index for metadata.fileType in ${collectionName}:`, err.message || err);
    }
  }
}

run();
