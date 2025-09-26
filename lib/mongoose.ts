import mongoose from "mongoose";

declare global {
  var _mongooseConn: Promise<typeof mongoose> | undefined;
}

export async function connectToDB() {
  const uri = process.env.MONGO_URL;
  if (!uri) throw new Error("MONGO_URL ist nicht gesetzt");

  if (!global._mongooseConn) {
    mongoose.set("strictQuery", true);
    global._mongooseConn = mongoose.connect(uri).catch((err) => {
      global._mongooseConn = undefined;
      throw err;
    });
  }
  return global._mongooseConn;
}
