import express from "express";
import {
  subscribe,
  unsubscribe,
  sendTestNotification,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Reuse the existing JWT middleware — all endpoints are scoped by req.user.id.
router.use(protect);

router.post("/subscribe", subscribe);
router.delete("/unsubscribe", unsubscribe);
router.post("/test", sendTestNotification);

export default router;
