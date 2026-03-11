export interface ChildItem {
  id?: number | string;
  name?: string;
  icon?: any;
  children?: ChildItem[];
  item?: any;
  url?: any;
  color?: string;
}

export interface MenuItem {
  heading?: string;
  name?: string;
  icon?: any;
  id?: number;
  to?: string;
  items?: MenuItem[];
  children?: ChildItem[];
  url?: any;
}

import { uniqueId } from "lodash";

const SidebarContent: MenuItem[] = [
  {
    heading: "Game Management",
    children: [
      {
        name: "Dashboard",
        icon: "solar:home-line-duotone",
        id: uniqueId(),
        url: "/dashboard",
      },
      {
        name: "Game Tables",
        icon: "solar:widget-line-duotone",
        id: uniqueId(),
        url: "/tables",
      },
      {
        name: "Members",
        icon: "solar:users-group-two-rounded-line-duotone",
        id: uniqueId(),
        url: "/members",
      },
      {
        name: "Ledger",
        icon: "solar:book-bookmark-line-duotone",
        id: uniqueId(),
        url: "/ledger",
      },
      {
        name: "Transactions",
        icon: "solar:card-line-duotone",
        id: uniqueId(),
        url: "/transactions",
      },
    ],
  },
  {
    heading: "Food & Beverage",
    children: [
      {
        name: "F&B Management",
        icon: "solar:cup-hot-line-duotone",
        id: uniqueId(),
        children: [
          {
            name: "Menu Management",
            icon: "solar:book-2-bold",
            id: uniqueId(),
            url: "/fnb",
          },
          {
            name: "POS System",
            icon: "solar:cart-line-duotone",
            id: uniqueId(),
            url: "/pos",
          },
        ]
      },
    ],
  },
  {
    heading: "Reports",
    children: [
      {
        name: "Analytics",
        icon: "solar:chart-line-duotone",
        id: uniqueId(),
        url: "/analytics",
      },
      {
        name: "Stock Report",
        icon: "solar:box-line-duotone",
        id: uniqueId(),
        url: "/stock",
      },
    ],
  },
  {
    heading: "Settings",
    children: [
      {
        name: "Pricing Packages",
        icon: "solar:tag-price-line-duotone",
        id: uniqueId(),
        url: "/pricing-packages",
      },
      {
        name: "Staff Management",
        icon: "solar:shield-user-line-duotone",
        id: uniqueId(),
        url: "/users",
      },
      {
        name: "Admin Settings",
        icon: "solar:settings-line-duotone",
        id: uniqueId(),
        url: "/admin",
      },
    ],
  },
];

export default SidebarContent;
