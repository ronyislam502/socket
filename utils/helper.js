export  const validationOrder = (data) => {
    if (!data.customerName?.trim()) {
        return {
            valid: false,
            message: "Customer name is required"
        }
    }
    if (!data.customerPhone?.trim()) {
        return {
            valid: false,
            message:"Customer phone number is required"
        }
    }
    if (!data.customerAddress?.trim()) {
        return {
            valid: false,
            message:"Customer address is required"
        }
    }
    if (!Array.isArray(data?.item)) {
        return {
            valid: false,
            message:"order must be one item"
        }
    }
    return {
        valid: true,
        message: ""
    }
}


export const generateOrderId = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth()+1).padStart(2,'0');
    const day = String(now.getDate()).padStart(2,'0');
    const hour = String(now.getHours()).padStart(2,'0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const randomNum=Math.floor(Math.random()* 1000).toString().padStart(3, '0')

    const orderid=`ORD-${year}${month}${day}${hour}${minute}${randomNum}`

    return orderid;
}


export  const calculateTotalPrice = (items) => {
    const subTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const tax = subTotal * 0.10;
    const deliveryFree = 35.00;
    const total = subTotal + tax + deliveryFree;

    return {
        subTotal: Math.round(subTotal * 100) / 100,
        tax:Math.round(tax*100)/100,
        deliveryFree: Math.round(deliveryFree * 100) / 100,
        totalAmount: Math.round(total * 100) / 100
    };
}


export const createOrder = (orderData, orderId, totals) => {
    return {
        orderId,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerAddress: orderData.customerAddress,
        items: orderData.items,
        subTotal: totals.subTotal,
        tax: totals.tax,
        deliveryFree: totals.deliveryFree,
        totalAmount: totals.totalAmount,
        specialNotes: orderData.specialNotes || "",
        paymentMethod: orderData.paymentMethod || "Cash on Delivery",
        paymentStatus: orderData.paymentStatus || "Pending",
        status: "Pending",
        statusHistory: [{
            status: "Pending",
            timestamp: new Date(),
            by: "Customer",
            note:"Order Placed"
        }],
        estimatedTime: null,
        createdAt: new Date(),
        updateAt:new Date(),
    }
}


export const isValidStatusTransition = (currentStatus, newStatus) => {
    const validTransitions = {
        "Pending": ["confirmed", "cancelled"],
        "confirmed": ["preparing", "cancelled"],
        "preparing": ["ready", "cancelled"],
        "ready": ["out for delivery", "cancelled"],
        "out for delivery": ["delivered"],
        "delivered": [],
        "cancelled": [],
    }

    return validTransitions[currentStatus]?.includes(newStatus) || false;
}