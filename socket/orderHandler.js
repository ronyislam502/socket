import { calculateTotalPrice, createOrder, generateOrderId } from "../utils/helper"
import { getCollection } from './../config/database';

export const orderHandler = (io, socket) => {
    console.log("order handler connected", socket.id)

    socket.on("placeOrder", async (orderData, callback) => {
        
        try {
            console.log("received new order", orderData)
            const validation = await validationOrder(orderData)
            
            if (!validation.valid) {
                return callback({ success: false, message: validation.message })
            }

            const totals = calculateTotalPrice(orderData.items);
            const orderId = generateOrderId();
            const order = createOrder(orderData, orderId, totals);
            
            const getCollectionOrders = getCollection("orders");
            await getCollectionOrders.insertOne(order);

            socket.join(`order-${orderId}`);
            socket.join("customers");

            io.to('admins').emit('newOrder', { order })

            callback({ success: true, order });

            console.log(`order created: ${orderId}`);

        } catch (error) {
            console.error("Error processing new order:", error)
        }
    });

    socket.on("trackOrder", async (data, callback) => {
        try {
            const orderCollection = getCollection("orders");
        const order = await orderCollection.findOne({ orderId: data.orderId });
        
        if (!order) {
            return callback({ success: false, message: "Order not found" });
        }
        socket.join(`order-${data.orderId}`)
            callback({ success: true, order });
            
        } catch (error) {
            console.error("Error tracking order:", error)
            callback({ success: false, message: "Error tracking order" });
        }
    });

}
