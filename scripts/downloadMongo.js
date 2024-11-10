const { MongoMemoryServer } = require("mongodb-memory-server");

async function downloadMongo() {
  console.log("Downloading MongoDB binary...");
  const mongod = await MongoMemoryServer.create();
  await mongod.stop();
  console.log("MongoDB binary downloaded successfully");
}

downloadMongo().catch(console.error);
