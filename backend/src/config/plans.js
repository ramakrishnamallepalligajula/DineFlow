const plans = {
  BASIC: {
    name: "Basic",
    monthly: {
      amount: 999,
    },
    yearly: {
      amount: 8999,
    },
    billRetentionDays: 30,
  },

  PRO: {
    name: "Pro",
    monthly: {
      amount: 1499,
    },
    yearly: {
      amount: 14999,
    },
    billRetentionDays: 90,
  },

  PREMIUM: {
    name: "Premium",
    monthly: {
      amount: 2499,
    },
    yearly: {
      amount: 24999,
    },
    billRetentionDays: null, // Unlimited retention
  },
};

export default plans;