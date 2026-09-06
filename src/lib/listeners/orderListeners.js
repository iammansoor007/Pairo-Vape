import uvapeEvents from '../events';
import QueueService from '../queue';
import { sendOrderConfirmation, sendAdminOrderNotification } from '../email';

/**
 * Initialize Order Listeners
 */
export function initOrderListeners() {
  // 1. ORDER_CREATED
  uvapeEvents.on('ORDER_CREATED', async (order) => {
    try {
        console.log(`[Event Received] ORDER_CREATED: ${order.orderNumber}`);
        // Email Customer
        await sendOrderConfirmation(order).catch(e => console.error("Email Cust Error:", e.message));
        if (order?.guestAccount?.temporaryPassword) {
          delete order.guestAccount.temporaryPassword;
        }
        // Email Admin
        await sendAdminOrderNotification(order).catch(e => console.error("Email Admin Error:", e.message));
    } catch (err) {
        console.error("Order created listener error:", err);
    }
  });

  // 2. ORDER_CANCELLED
  uvapeEvents.on('ORDER_CANCELLED', (order) => {
     QueueService.push('SEND_CANCELLATION_EMAIL', async () => {
        // We'll need to add sendCancellationEmail to email.js
        console.log(`Sending cancellation email for order ${order.orderNumber}`);
     }, { retries: 3, referenceId: order._id });
  });

  // 3. ORDER_STATUS_UPDATED
  uvapeEvents.on('ORDER_STATUS_UPDATED', ({ order, oldStatus, newStatus }) => {
    console.log(`Order ${order.orderNumber} status changed from ${oldStatus} to ${newStatus}`);
    // Future: Trigger status-specific emails (Shipped, Delivered)
  });

  console.log("✔ Order Listeners Initialized");
}
