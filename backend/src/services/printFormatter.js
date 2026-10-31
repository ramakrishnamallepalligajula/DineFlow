
const TIME_ZONE = "Asia/Kolkata";

const formatCurrency = (value) =>
  `₹${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

const cleanText = (value) =>
  String(value ?? "").trim();

const formatItems = (items = []) =>
  items.map((item) => {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.price || 0);

    return {
      name: cleanText(item.name),
      quantity,
      unitPrice: price,
      amount: Number(
        item.amount ??
        item.lineTotal ??
        (price * quantity)
      ),
      notes: cleanText(item.notes),
    };
  });

/**
 * Kitchen Order Ticket
 *
 * No restaurant logo, prices, or GST.
 * Each submitted order batch produces its own KOT.
 */
export const buildKotPrintPayload = ({
  order,
  restaurant,
}) => {
  if (!order) {
    throw new Error("Order is required to create a KOT");
  }

  const items = formatItems(order.items);

  if (!items.length) {
    throw new Error("KOT must contain at least one item");
  }

  return {
    formatVersion: 1,
    documentType: "KOT",
    paperWidth: 80,

    restaurant: {
      name: cleanText(restaurant?.name),
    },

    order: {
      orderId: order.orderId,
      orderSequence: Number(order.orderSequence || 1),
      tableNumber: cleanText(order.tableNumber),
      orderType: cleanText(order.type),
      createdAt: formatDateTime(order.createdAt),
    },

    items: items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      notes: item.notes,
    })),

    footer: "PLEASE PREPARE",
  };
};

/**
 * Customer Bill
 *
 * Uses saved bill values and saved restaurant details.
 * The Flutter app handles logo image conversion and printing.
 */
export const buildBillPrintPayload = ({
  bill,
  restaurantSnapshot,
}) => {
  if (!bill) {
    throw new Error("Bill is required to create a print payload");
  }

  if (!restaurantSnapshot) {
    throw new Error(
      "Saved restaurant details are required for bill printing"
    );
  }

  const items = formatItems(bill.items);

  if (!items.length) {
    throw new Error("Bill must contain at least one item");
  }

  const gstEnabled = Boolean(bill.gstEnabled);

  return {
    formatVersion: 1,
    documentType: "BILL",
    paperWidth: 80,

    restaurant: {
      name: cleanText(restaurantSnapshot.name),
      address: cleanText(restaurantSnapshot.address),
      phone: cleanText(restaurantSnapshot.phone),
      gstin: cleanText(restaurantSnapshot.gstin),
      logoUrl: cleanText(restaurantSnapshot.logoUrl),
    },

    invoice: {
      billNumber: cleanText(bill.billNumber),
      orderId: bill.orderId,
      tableNumber: cleanText(bill.tableNumber),
      orderCount: Number(bill.orderCount || 1),
      createdAt: formatDateTime(bill.createdAt),
    },

    items,

    totals: {
      subtotal: Number(bill.subtotal || 0),
      gstEnabled,
      gstRate: gstEnabled ? Number(bill.taxRate || 0) : 0,
      taxType: gstEnabled ? cleanText(bill.taxType) : "NONE",
      cgst: gstEnabled ? Number(bill.cgst || 0) : 0,
      sgst: gstEnabled ? Number(bill.sgst || 0) : 0,
      igst: gstEnabled ? Number(bill.igst || 0) : 0,
      tax: gstEnabled ? Number(bill.tax || 0) : 0,
      total: Number(bill.total || 0),
    },

    payment: {
      method: cleanText(bill.paymentMethod),
      status: cleanText(bill.paymentStatus),
    },

    footer: "THANK YOU! PLEASE VISIT AGAIN",
  };
};

export { formatCurrency, formatDateTime };
