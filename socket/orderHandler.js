import { calculateTotalPrice, createOrder, generateOrderId, isValidStatusTransition, validationOrder } from "../utils/helper"
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

    // admin events
    socket.on('adminLogin', async (data, callback) => {
        try {
            if (data.password === process.env.ADMIN_PASSWORD) {
                socket.isAdmin = true;
                socket.join('admins');
                console.log('admin logged in:', socket.id)
                callback({ success: true, message: "Admin logged in successfully" });
            } else {
                callback({ success: false, message: "Invalid admin credentials" });
            }
        } catch (error) {
            console.error("Error during admin login:", error);
            callback({ success: false, message: error.message || "Error during admin login" });
        }
    })

    socket.on('getAllOrders', async (data, callback) => {
        try {
            if (!socket.isAdmin) {
                return callback({success:false, message:"Unauthorized"})
            }

            const ordersCollection = getCollection("orders");
            const filter = data.status && data.status !== "all" ? { status: data.status } : {};
            const orders=await ordersCollection.find(filter).sort({createdAt:-1}).limit(10).toArray()
            callback({ success: true, orders });

        } catch (error) {
            console.error("Error fetching all orders:", error);
            callback({ success: false, message: error.message || "Error fetching all orders" });
        }
    })

    socket.on('updateOrderStatus', async (data, callback) => {
        try {
            const ordersCollection = getCollection("orders");
            const order = await ordersCollection.findOne({ orderId: data.orderId })
            
            if (!order) {
                return callback({ success:false, message:"order not found"})
            }

            if (isValidStatusTransition(order.status, data.newStatus)) {
                return callback ({success:false, message:"Invalid status transition"})
            }

            const result = await ordersCollection.findOneAndUpdate(
                {
                    orderId: data.orderId
                },
                {
                    $set: { status: data.newStatus, updatedAt: new Date() },
                    $push: {
                        statusHistory: {
                            status: data.newStatus,
                            timestamp: new Date(),
                            by: socket.id
                        }
                    }
                }
            );
            callback({ success: true, message: "Order status updated successfully" });
        } catch (error) {
            console.error("Error updating order status:", error);
            callback({ success: false, message: error.message || "Error updating order status" });
        }
    })
}
