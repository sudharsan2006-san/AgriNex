import React, { useEffect, useState, useRef } from "react";
import {
  collection, query, where, onSnapshot, orderBy, writeBatch, doc, limit,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { Bell, BellRing, Check, CheckCheck, CloudRain, ShoppingCart, TrendingUp, FileText, Package, X } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
  emailStatus?: string;
  emailProviderId?: string;
  emailError?: string;
  payload?: Record<string, any>;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  booking_confirmed: {
    icon: <Package size={16} />,
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
  },
  booking_status: {
    icon: <ShoppingCart size={16} />,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  rain_alert: {
    icon: <CloudRain size={16} />,
    color: "text-sky-700",
    bg: "bg-sky-50 border-sky-200",
  },
  price_alert: {
    icon: <TrendingUp size={16} />,
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
  pdf_report: {
    icon: <FileText size={16} />,
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
  },
};

function EmailStatusPill({ status }: { status?: string }) {
  if (!status) return null;
  const map: Record<string, { label: string; cls: string }> = {
    sent: { label: "✉️ Email Sent", cls: "bg-green-100 text-green-800" },
    processing: { label: "⏳ Sending...", cls: "bg-blue-100 text-blue-800" },
    pending: { label: "⏳ Queued", cls: "bg-gray-100 text-gray-600" },
    failed: { label: "⚠️ Email Failed", cls: "bg-red-100 text-red-700" },
  };
  const cfg = map[status];
  if (!cfg) return null;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function timeAgo(ts: any): string {
  if (!ts) return "";
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const drawerRef = useRef<HTMLDivElement>(null);
  const user = auth.currentUser;

  // Subscribe to current user's notifications in real-time
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      );
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // Close drawer when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mark all as read when drawer opens
  const handleOpen = async () => {
    setOpen((prev) => !prev);
    if (!open && unreadCount > 0 && user) {
      const batch = writeBatch(db);
      notifications.filter((n) => !n.read).forEach((n) => {
        batch.update(doc(db, "notifications", n.id), { read: true });
      });
      try { await batch.commit(); } catch {}
    }
  };

  const handleClearAll = async () => {
    if (!user || notifications.length === 0) return;
    const batch = writeBatch(db);
    // Only mark as read, don't delete
    notifications.forEach((n) => {
      batch.update(doc(db, "notifications", n.id), { read: true });
    });
    try { await batch.commit(); } catch {}
  };

  return (
    <div className="relative" ref={drawerRef}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={handleOpen}
        className="relative p-2 rounded-full text-[#2D6A4F] hover:bg-green-50 transition-all"
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        {unreadCount > 0 ? (
          <BellRing size={22} className="text-[#2D6A4F] animate-[wiggle_0.8s_ease-in-out]" />
        ) : (
          <Bell size={22} className="text-[#2D6A4F]" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-sm leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Drawer */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] max-h-[480px] bg-white rounded-3xl shadow-2xl border border-gray-100 z-[999] flex flex-col overflow-hidden animate-in slide-in-from-top-2 fade-in duration-150">
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-[#F0F7F4]">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-[#2D6A4F]" />
              <span className="font-black text-[#1B4332] text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black rounded-full px-2 py-0.5">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[11px] font-bold text-[#2D6A4F] hover:text-[#1B4332] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-green-50 transition"
                  title="Mark all as read"
                >
                  <CheckCheck size={13} />
                  All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
            {loading ? (
              <div className="p-6 text-center text-xs text-gray-400">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={32} className="text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400 font-semibold">No notifications yet</p>
                <p className="text-[11px] text-gray-300 mt-1">Booking updates, rain alerts, and price changes will appear here.</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const cfg = TYPE_CONFIG[notif.type] || {
                  icon: <Bell size={16} />,
                  color: "text-gray-600",
                  bg: "bg-gray-50 border-gray-200",
                };
                return (
                  <div
                    key={notif.id}
                    className={`px-4 py-3 transition-all ${notif.read ? "opacity-70" : "bg-white"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1.5 rounded-xl border ${cfg.bg} ${cfg.color} shrink-0`}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className={`text-xs font-black text-[#1B4332] leading-tight ${!notif.read ? "" : "font-semibold"}`}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-gray-400 shrink-0 ml-1">
                            {timeAgo(notif.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 mt-0.5 leading-snug line-clamp-2">
                          {notif.message}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <EmailStatusPill status={notif.emailStatus} />
                          {!notif.read && (
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block" title="Unread" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 text-center bg-gray-50/80">
              <span className="text-[10px] text-gray-400">
                Showing last {notifications.length} notification{notifications.length !== 1 ? "s" : ""} · Email delivery tracked per event
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
