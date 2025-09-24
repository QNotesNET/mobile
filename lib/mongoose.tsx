// lib/mongoose.ts
import mongoose from "mongoose";

declare global {
  // Verhindert Mehrfachverbindungen während Hot Reloads in dev
  // eslint-disable-next-line no-var
  var _mongooseConn: Promise<typeof mongoose> | undefined;
}

export async function connectToDB() {
  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL ist nicht gesetzt (env).");
  }

  if (!global._mongooseConn) {
    // Optional: kleine Optimierungen
    mongoose.set("strictQuery", true);

    global._mongooseConn = mongoose
      .connect(process.env.MONGO_URL, {
        // Wähle hier KEINE dbName, wenn sie bereits in der URL steht.
        // dbName: "qnotes", // nur setzen, falls nicht in der URL enthalten
        // bufferCommands: false, // optional
      })
      .then((m) => {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV !== "production") console.log("✅ Mongo verbunden");
        return m;
      })
      .catch((err) => {
        global._mongooseConn = undefined;
        throw err;
      });
  }

  return global._mongooseConn;
}
