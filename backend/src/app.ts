import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { passport } from "./config/passport.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { routes } from "./routes/index.js";

export const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan("combined"));
app.use(passport.initialize());
app.use(routes);
app.use(errorHandler);
