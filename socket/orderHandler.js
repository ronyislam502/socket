import { calculateTotalPrice, createOrder, generateOrderId, validationOrder } from "../utils/helper"
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
            callback({ success: false, message: error.message || "Error processing order" });
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
            callback({ success: false, message: error.message || "Error tracking order" });
        }
    });
   
    socket.on("cancelOrder", async (data, callback) => {
        try {
            const ordersCollection = getCollection("orders");
            const order = await ordersCollection.findOne({ orderId: data.orderId });

             if (!order) {
                return callback({ success: false, message: "Order not found" });
            }

            if (!["pending", "preparing"].includes(order.status)) {
                return callback({ success:false, message:"Order can not be cancelled at this stage"})
            }

            await ordersCollection.updateOne(
                { orderId: data.orderId },
                {
                    $set: { status: "cancelled", updatedAt: new Date() },
                    $push: {
                        statusHistory: {
                            status: "cancelled", timestamp: new Date(),
                            by: socket.id,
                            note: data.reason || "Order cancelled by customer"
                         },
                        
                    }
                },
                
            );
            io.to(`order-${data.orderId}`).emit("orderCancelled", { orderId: data.orderId, reason: data.reason || "cancelled by customer" });
            io.to('admins').emit('orderCancelled', { orderId: data.orderId, customerName: order.customerName, reason: data.reason || "cancelled by customer" });
            callback({ success: true, message: "Order cancelled successfully" });

        } catch (error) {
            console.error("Error cancelling order:", error);
            callback({ success: false, message: error.message || "Error cancelling order" });
        }

    })

    socket.on('getMyOrders', async (data, callback) => {
        try {
            const ordersCollection = getCollection("orders");
            const orders=await ordersCollection.find({customerPhone:data.customerPhone}).sort({createdAt: -1}).limit(10).toArray()
            callback({ success: true, orders });
        } catch (error) {
            console.error("Error fetching my orders:", error);
            callback({ success: false, message: error.message || "Error fetching my orders" });

        }
    })
}
