import express, { Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import mongoose from "mongoose";

import myUserRoute from "./routes/MyUserRoute";
import myRestaurantRoute from "./routes/MyRestaurantRoute";
import restaurantRoute from "./routes/RestaurantRoute";
import orderRoute from "./routes/OrderRoute";
import analyticsRoute from "./routes/AnalyticsRoute";

import { v2 as cloudinary } from "cloudinary";

/**
 ✅ DATABASE CONNECTION
 */
mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => console.log("✅ Connected to database!"))
  .catch((err) => {
    console.log("❌ Database connection error:", err);
  });

/**
 ✅ CLOUDINARY CONFIG
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();

/**
 ⭐ PRODUCTION TIP
 Helps when deployed behind proxies like Render / Nginx
 */
app.set("trust proxy", 1);

/**
 Track server uptime
 */
const serverStartTime = Date.now();

/**
 ✅ CORS CONFIG
 */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://mern-food-ordering.netlify.app",
      "https://mern-food-ordering-hnql.onrender.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/**
 🚨 IMPORTANT:
 Stripe raw webhook REMOVED.
 Razorpay does NOT need raw body parsing.
 */

app.use(express.json());

/**
 ✅ ROOT ROUTE
 */
app.get("/", (req: Request, res: Response) => {
  res.send(`
    <h1>🍔 BigHungers Food Ordering Backend is Running!</h1>
    <p>Welcome to the API server.</p>
  `);
});

/**
 ✅ HEALTH CHECK
 */
app.get("/health", async (req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000);

  res.json({
    message: "health OK!",
    uptime,
    timestamp: new Date().toISOString(),
    serverStartTime: new Date(serverStartTime).toISOString(),
  });
});

/**
 ✅ ROUTES
 */
app.use("/api/my/user", myUserRoute);
app.use("/api/my/restaurant", myRestaurantRoute);
app.use("/api/restaurant", restaurantRoute);

/**
 ⭐ ORDER ROUTES (NOW RAZORPAY)
 Endpoints include:

 POST /api/order/payment/create-order
 POST /api/order/payment/verify
*/
app.use("/api/order", orderRoute);

app.use("/api/business-insights", analyticsRoute);

/**
 ✅ SERVER START
 */
const PORT = process.env.PORT || 7001;

app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});
