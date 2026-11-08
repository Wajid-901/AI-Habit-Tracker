import { useState } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import Modal from "./Modal.jsx";
import api from "../api/axios.js";

// Shared settings modal used by Sidebar (desktop) and MobileNav (mobile).
export default function SettingsModal({ open, onClose }) {
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [morning, setMorning] = useState(user?.morningMotivation || false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put("/auth/profile", { name, morningMotivation: morning });
      updateUser(res.data.user);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    onClose();
    logout();
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="space-y-4">
        <div>
          <label className="label">Display name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <label className="flex items-start gap-3 p-3 rounded-xl glass cursor-pointer hover:bg-[var(--surface-hover)]">
          <input
            type="checkbox"
            checked={morning}
            onChange={(e) => setMorning(e.target.checked)}
            className="mt-1 accent-brand-600"
          />
          <div>
            <div className="text-sm font-medium">Morning motivation</div>
            <div className="text-xs text-faint">
              Show a short AI message every morning on the dashboard.
            </div>
          </div>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        {/* Logout — only visible on mobile where header has no separate logout */}
        <div className="md:hidden pt-1 border-t divider">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-rose-500 hover:bg-rose-500/10 transition"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </div>
    </Modal>
  );
}
