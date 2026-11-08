import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import Modal from "./Modal.jsx";
import api from "../api/axios.js";

/**
 * SettingsModal — shared between Sidebar (desktop) and MobileNav (mobile).
 * Props:
 *   open     {boolean}  — controls visibility
 *   onClose  {function} — called when the modal should close
 */
export default function SettingsModal({ open, onClose }) {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [morning, setMorning] = useState(user?.morningMotivation || false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put("/auth/profile", {
        name,
        morningMotivation: morning,
      });
      updateUser(res.data.user);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="space-y-4">
        <div>
          <label className="label">Display name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
              Show a short personalised AI message every morning on the
              dashboard.
            </div>
          </div>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
