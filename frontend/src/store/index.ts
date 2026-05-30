import { create } from "zustand";

interface User {
  username: string;
  role: string;
  token: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  risk: "Low" | "Medium" | "High" | "Critical";
  read: boolean;
}

interface DocuShieldState {
  // Auth Store
  user: User | null;
  isLoggedIn: boolean;
  otpRequired: boolean;
  login: (username: string, role: string, token: string) => void;
  setOtpRequired: (required: boolean) => void;
  logout: () => void;

  // Language & Theme Store
  language: "EN" | "HI" | "KN";
  theme: "dark" | "light";
  setLanguage: (lang: "EN" | "HI" | "KN") => void;
  toggleTheme: () => void;

  // Real-time Underwriting Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id" | "time" | "read">) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export const useStore = create<DocuShieldState>((set) => ({
  // Auth Initial State
  user: null,
  isLoggedIn: false,
  otpRequired: false,
  login: (username, role, token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
      localStorage.setItem("username", username);
      localStorage.setItem("role", role);
    }
    set({
      user: { username, role, token },
      isLoggedIn: true,
      otpRequired: false,
    });
  },
  setOtpRequired: (required) => set({ otpRequired: required }),
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("role");
    }
    set({ user: null, isLoggedIn: false, otpRequired: false });
  },

  // Settings
  language: "EN",
  theme: "dark",
  setLanguage: (lang) => set({ language: lang }),
  toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),

  // Mock initial bank alerts
  notifications: [
    {
      id: "1",
      title: "Tampered Document Uploaded",
      message: "Sunita Kumar SalarySlip contains Photoshop EXIF markers.",
      time: "2 mins ago",
      risk: "Critical",
      read: false,
    },
    {
      id: "2",
      title: "Co-applicant Duplicate Entity Flag",
      message: "Vijay Mallya linked to overlapping loan branch applications.",
      time: "15 mins ago",
      risk: "High",
      read: false,
    },
    {
      id: "3",
      title: "RBI Compliance Assessment Done",
      message: "All model accuracy threshold limits met Section 12.A.",
      time: "1 hour ago",
      risk: "Low",
      read: true,
    },
  ],
  addNotification: (notif) =>
    set((state) => ({
      notifications: [
        {
          ...notif,
          id: Math.random().toString(36).substring(7),
          time: "Just now",
          read: false,
        },
        ...state.notifications,
      ],
    })),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
  clearNotifications: () => set({ notifications: [] }),
}));
