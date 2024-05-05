import express from "express";
import cors from "cors";
import { dbConfig, dbQuery } from "./express.mjs";

const app = express();
app.use(express.json());
app.use(cors());

// grafana: test datasource connect
app.all("/", dbConfig);

// grafana: qeury
app.all("/query", dbQuery);

//default error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send(err.message ?? "unknown error");
});

// start the server
const port = 4000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
