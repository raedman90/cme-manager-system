import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { router } from "./routes/index";
import { errorHandler } from "./middlewares/errorHandler";

dotenv.config();
const app = express();

const corsOptions: cors.CorsOptions = {
  origin: ["http://localhost:5173"],        // sua UI
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],   // <- importante
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions)); //

app.use(express.json());
app.use(router);
app.use(errorHandler);

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
