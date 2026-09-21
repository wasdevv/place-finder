import mongoose from 'mongoose';

let connection;

export function connect() {
  if (!process.env.MONGODB_URI) {
    const error = new Error('MONGODB_URI is not set');
    error.status = 503;
    return Promise.reject(error);
  }
  connection ??= mongoose
    .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    .catch((error) => {
      connection = undefined;
      error.status = 503;
      throw error;
    });
  return connection;
}
