import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Use imported routes
app.use("/api", routes);

app.get("/", (req, res) => {
  res.json({
    message: "Node.js Express API - Updated!",
    version: "1.1.0",
    status: "running",
    features: ["CORS", "Routes", "TypeScript"]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Enhanced Server running on http://localhost:${PORT}`);
});