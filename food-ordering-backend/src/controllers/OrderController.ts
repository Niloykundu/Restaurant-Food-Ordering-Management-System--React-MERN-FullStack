import { Request, Response } from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import Razorpay from "razorpay";

import Restaurant, { MenuItemType } from "../models/restaurant";
import Order from "../models/order";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

const FRONTEND_URL = process.env.FRONTEND_URL as string;

/**
 ✅ Get Logged-in User Orders
 (UNCHANGED)
 */
const getMyOrders = async (req: Request, res: Response) => {
  try {
    const activeStatuses = [
      "paid",
      "inProgress",
      "outForDelivery",
      "delivered",
    ];

    const orders = await Order.find({
      user: req.userId,
      status: { $in: activeStatuses },
    })
      .populate("restaurant")
      .populate("user");

    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "something went wrong" });
  }
};

/**
 TYPE (same as before — reused)
 */
type CheckoutSessionRequest = {
  cartItems: {
    menuItemId: string;
    name: string;
    quantity: string;
  }[];
  deliveryDetails: {
    email: string;
    name: string;
    addressLine1: string;
    city: string;
  };
  restaurantId: string;
};

/**
 ✅ CREATE RAZORPAY ORDER
 Replaces Stripe Checkout Session
 */
const createRazorpayOrder = async (req: Request, res: Response) => {
  try {
    const checkoutRequest: CheckoutSessionRequest = req.body;

    const restaurant = await Restaurant.findById(
      checkoutRequest.restaurantId
    );

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    /**
     ✅ Calculate total amount
     */
    const menuTotal = checkoutRequest.cartItems.reduce(
      (total: number, cartItem) => {
        const menuItem = restaurant.menuItems.find(
          (item: MenuItemType) =>
            item._id.toString() === cartItem.menuItemId.toString()
        );

        if (!menuItem) {
          throw new Error(`Menu item not found: ${cartItem.menuItemId}`);
        }

        return total + menuItem.price * parseInt(cartItem.quantity);
      },
      0
    );

    const totalAmount = menuTotal + restaurant.deliveryPrice;

    /**
     ✅ Create DB Order FIRST (pending)
     */
    const newOrder = new Order({
      restaurant: restaurant,
      user: req.userId,
      status: "pending", // IMPORTANT
      deliveryDetails: checkoutRequest.deliveryDetails,
      cartItems: checkoutRequest.cartItems,
      totalAmount,
      createdAt: new Date(),
    });

    await newOrder.save();

    /**
     ✅ Create Razorpay Order
     */
    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100, // convert to paise
      currency: "INR",
      receipt: newOrder._id.toString(),
    });

    res.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
      dbOrderId: newOrder._id,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: error.message || "Error creating Razorpay order",
    });
  }
};

/**
 ✅ VERIFY PAYMENT
 Replaces Stripe Webhook
 VERY IMPORTANT — DO NOT SKIP
 */
const verifyPayment = async (req: Request, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      dbOrderId,
    } = req.body;

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    /**
     ✅ Mark order as PAID
     */
    const order = await Order.findById(dbOrderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = "paid";

    // optional but recommended
    order.set({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    await order.save();

    /**
     Redirect is optional — depends on frontend flow
     */
    res.json({
      success: true,
      message: "Payment successful",
      redirectUrl: `${FRONTEND_URL}/order-status?success=true`,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error verifying payment",
    });
  }
};

export default {
  getMyOrders,
  createRazorpayOrder,
  verifyPayment,
};
