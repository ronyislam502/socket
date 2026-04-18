const orderHandler = (io, socket) => {
    console.log("order handler connected", socket.id)

    socket.on("newOrder", async (orderData, callback) => {
        
        try {
            console.log("received new order", orderData) 
          const validationOrder = await validationOrder(orderData)  
        } catch (error) {
            console.error("Error processing new order:", error)
        }
    })
}

export const orderHandler;