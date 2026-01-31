import express from "express";
import { jwtCheck, jwtParse } from "../middleware/auth";
import OrderController from "../controllers/OrderController";

const router = express.Router();

/**
 ✅ Get logged-in user orders
 */
router.get("/", jwtCheck, jwtParse, OrderController.getMyOrders);

/**
 ✅ Create Razorpay Order
 (User must be logged in)
 */
router.post(
  "/payment/create-order",
  jwtCheck,
  jwtParse,
  OrderController.createRazorpayOrder
);

/**
 ✅ Verify Payment Signature
 MUST be protected — otherwise anyone could mark orders paid
 */
router.post(
  "/payment/verify",
  jwtCheck,
  jwtParse,
  OrderController.verifyPayment
);

export default router;
