const onboardingSteps = [
  {
    id: "dashboard",
    target: "[data-tour='dashboard']",
    title: "Your Dashboard",
    description:
      "This is your restaurant command center. Monitor today's sales, orders, active dining sessions and business performance from one place.",
    icon: "📊",
  },

  {
    id: "kitchen",
    target: "[data-tour='kitchen']",
    title: "Kitchen",
    description:
      "Your kitchen team can monitor incoming customer orders and manage the order preparation workflow from here.",
    icon: "👨‍🍳",
  },

  {
    id: "printers",
    target: "[data-tour='printers']",
    title: "Printers",
    description:
      "Connect and manage your DineFlow printers. Kitchen orders and final customer bills can be printed automatically.",
    icon: "🖨️",
  },

  {
    id: "tables",
    target: "[data-tour='tables']",
    title: "Tables & QR Ordering",
    description:
      "Create and manage restaurant tables and generate QR codes. Customers scan a table QR code to open your digital menu.",
    icon: "🪑",
  },

  {
    id: "menu",
    target: "[data-tour='menu']",
    title: "Menu Management",
    description:
      "Manage your restaurant menu here. Add food items, change prices, manage categories and control item availability.",
    icon: "🍔",
  },

  {
    id: "staff",
    target: "[data-tour='staff']",
    title: "Staff Management",
    description:
      "Create and manage staff accounts so your team can access the parts of DineFlow they need.",
    icon: "👥",
  },

  {
    id: "reports",
    target: "[data-tour='reports']",
    title: "Reports & Analytics",
    description:
      "Understand your restaurant performance using sales, order and menu analytics available through your dashboard.",
    icon: "📈",
  },

  {
    id: "settings",
    target: "[data-tour='settings']",
    title: "Restaurant Settings",
    description:
      "Manage your restaurant information, GST settings and other restaurant configuration from here.",
    icon: "⚙️",
  },
];

export default onboardingSteps;