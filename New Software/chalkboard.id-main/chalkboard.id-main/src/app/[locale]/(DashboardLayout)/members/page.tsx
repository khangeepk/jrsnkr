"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, differenceInDays } from "date-fns";
import { getMembershipStatus, PRICING } from "@/lib/game-engine";
import { Alert } from "flowbite-react";
import {
    IconUserPlus, IconSearch, IconRefresh, IconPencil, IconTrash,
    IconUsers, IconCalendar, IconPhone, IconX
} from "@tabler/icons-react";

interface Member {
    id: number;
    name: string;
    phone: string;
    email?: string;
    membershipType: "annual" | "tournament";
    membershipFee: string;
    startDate: string;
    endDate: string;
    tournamentStartDate?: string;
    tournamentEndDate?: string;
    notes?: string;
    isActive: boolean;
}

const defaultForm = {
    name: "", phone: "", email: "",
    membershipType: "annual" as "annual" | "tournament",
    membershipFee: String(PRICING.ANNUAL_MEMBERSHIP_FEE),
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    tournamentStartDate: "", tournamentEndDate: "", notes: "",
};

function StatusBadge({ endDate }: { endDate: string }) {
    const status = getMembershipStatus(new Date(endDate));
    const cfg = {
        active: "bg-success text-white",
        expiringSoon: "bg-warning text-white",
        expired: "bg-error text-white",
    }[status];
    const label = { active: "Active", expiringSoon: "Expiring Soon", expired: "Expired" }[status];
    return <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg}`}>{label}</span>;
}

export default function MembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [openDialog, setOpenDialog] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/members?search=${search}&type=${filterType}`);
            const data = await res.json();
            setMembers(data.members || []);
        } catch { setError("Failed to load members"); }
        finally { setLoading(false); }
    }, [search, filterType]);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    useEffect(() => {
        setForm(f => ({
            ...f,
            membershipFee: f.membershipType === "annual"
                ? String(PRICING.ANNUAL_MEMBERSHIP_FEE)
                : String(PRICING.TOURNAMENT_MEMBERSHIP_FEE),
        }));
    }, [form.membershipType]);

    const openAdd = () => { setEditingMember(null); setForm(defaultForm); setOpenDialog(true); setError(""); };
    const openEdit = (m: Member) => {
        setEditingMember(m);
        setForm({
            name: m.name, phone: m.phone, email: m.email || "",
            membershipType: m.membershipType, membershipFee: m.membershipFee,
            startDate: format(new Date(m.startDate), "yyyy-MM-dd"),
            endDate: format(new Date(m.endDate), "yyyy-MM-dd"),
            tournamentStartDate: m.tournamentStartDate ? format(new Date(m.tournamentStartDate), "yyyy-MM-dd") : "",
            tournamentEndDate: m.tournamentEndDate ? format(new Date(m.tournamentEndDate), "yyyy-MM-dd") : "",
            notes: m.notes || "",
        });
        setOpenDialog(true); setError("");
    };

    const handleSave = async () => {
        if (!form.name || !form.phone) { setError("Name and Phone are required"); return; }
        setSaving(true); setError("");
        try {
            const url = editingMember ? `/api/members/${editingMember.id}` : "/api/members";
            const res = await fetch(url, { method: editingMember ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            if (!res.ok) throw new Error();
            setOpenDialog(false);
            setSuccessMsg(editingMember ? "Member updated" : "Member added");
            fetchMembers(); setTimeout(() => setSuccessMsg(""), 3000);
        } catch { setError("Failed to save member"); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        await fetch(`/api/members/${deleteTarget.id}`, { method: "DELETE" });
        setDeleteTarget(null); setSuccessMsg("Member deleted"); fetchMembers();
        setTimeout(() => setSuccessMsg(""), 3000);
    };

    const stats = {
        total: members.length,
        active: members.filter(m => getMembershipStatus(new Date(m.endDate)) === "active").length,
        expiringSoon: members.filter(m => getMembershipStatus(new Date(m.endDate)) === "expiringSoon").length,
        expired: members.filter(m => getMembershipStatus(new Date(m.endDate)) === "expired").length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-dark dark:text-white">Member Management</h1>
                    <p className="text-bodytext mt-1">Manage JR Snooker Lounge memberships</p>
                </div>
                <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">
                    <IconUserPlus className="w-5 h-5" /> Add Member
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total", value: stats.total, color: "bg-lightprimary text-primary" },
                    { label: "Active", value: stats.active, color: "bg-lightsuccess text-success" },
                    { label: "Expiring Soon", value: stats.expiringSoon, color: "bg-lightwarning text-warning" },
                    { label: "Expired", value: stats.expired, color: "bg-lighterror text-error" },
                ].map(s => (
                    <div key={s.label} className="bg-white dark:bg-darkgray rounded-xl p-4 shadow-sm border border-border">
                        <p className="text-2xl font-bold text-dark dark:text-white">{s.value}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Alerts */}
            {successMsg && <Alert color="success" onDismiss={() => setSuccessMsg("")}>{successMsg}</Alert>}
            {error && <Alert color="failure" onDismiss={() => setError("")}>{error}</Alert>}

            {/* Info note */}
            <div className="flex items-start gap-2 p-3 bg-lightinfo rounded-lg text-sm text-info">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                <p><strong>Note:</strong> Tournament members (₨ 1,500) do <strong>not</strong> receive the ₨ 250 per-game discount. Annual members (₨ 3,000) receive full member rates.</p>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[220px]">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bodytext" />
                    <input
                        placeholder="Search by name or phone..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-white dark:bg-darkgray text-dark dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg bg-white dark:bg-darkgray text-dark dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="all">All Members</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="annual">Annual</option>
                    <option value="tournament">Tournament</option>
                </select>
                <button onClick={fetchMembers} className="flex items-center gap-1 px-3 py-2 border border-border rounded-lg text-sm hover:bg-hover transition-colors text-dark dark:text-white">
                    <IconRefresh className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-darkgray rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-lightgray dark:bg-darkgray border-b border-border">
                            <tr>
                                {["Name", "Phone", "Type", "Fee", "Start Date", "End Date", "Status", "Actions"].map(h => (
                                    <th key={h} className="px-4 py-3 text-left font-semibold text-dark dark:text-white whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr><td colSpan={8} className="px-4 py-8 text-center text-bodytext">Loading...</td></tr>
                            ) : members.length === 0 ? (
                                <tr><td colSpan={8} className="px-4 py-8 text-center text-bodytext">No members found</td></tr>
                            ) : members.map(m => (
                                <tr key={m.id} className="hover:bg-hover transition-colors">
                                    <td className="px-4 py-3 font-semibold text-dark dark:text-white">{m.name}</td>
                                    <td className="px-4 py-3 text-bodytext">{m.phone}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-1 rounded-full border font-medium ${m.membershipType === 'annual' ? 'border-primary text-primary' : 'border-secondary text-secondary'}`}>
                                            {m.membershipType === 'annual' ? 'Annual' : 'Tournament'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-dark dark:text-white">₨ {Number(m.membershipFee).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-bodytext">{format(new Date(m.startDate), "dd MMM yyyy")}</td>
                                    <td className="px-4 py-3">
                                        <div>
                                            <span className="text-bodytext">{format(new Date(m.endDate), "dd MMM yyyy")}</span>
                                            {getMembershipStatus(new Date(m.endDate)) === "expiringSoon" && (
                                                <p className="text-xs text-warning">{differenceInDays(new Date(m.endDate), new Date())}d left</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3"><StatusBadge endDate={m.endDate} /></td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => openEdit(m)} className="p-1.5 text-primary hover:bg-lightprimary rounded-lg transition-colors" title="Edit">
                                                <IconPencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setDeleteTarget(m)} className="p-1.5 text-error hover:bg-lighterror rounded-lg transition-colors" title="Delete">
                                                <IconTrash className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Dialog */}
            {openDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-darkgray rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-border">
                            <h2 className="text-lg font-bold text-dark dark:text-white">{editingMember ? "Edit Member" : "Add New Member"}</h2>
                            <button onClick={() => setOpenDialog(false)} className="p-1 rounded-lg hover:bg-hover transition-colors">
                                <IconX className="w-5 h-5 text-bodytext" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {error && <Alert color="failure">{error}</Alert>}
                            {[
                                { label: "Full Name *", key: "name", type: "text", placeholder: "Enter full name" },
                                { label: "Phone Number *", key: "phone", type: "tel", placeholder: "e.g. 03001234567" },
                                { label: "Email (Optional)", key: "email", type: "email", placeholder: "Optional" },
                            ].map(field => (
                                <div key={field.key}>
                                    <label className="block text-sm font-medium text-dark dark:text-white mb-1">{field.label}</label>
                                    <input type={field.type} placeholder={field.placeholder} value={(form as any)[field.key]}
                                        onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-darkgray text-dark dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                            ))}
                            <div>
                                <label className="block text-sm font-medium text-dark dark:text-white mb-1">Membership Type *</label>
                                <select value={form.membershipType} onChange={e => setForm(f => ({ ...f, membershipType: e.target.value as any }))}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-darkgray text-dark dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                                    <option value="annual">Annual — ₨ 3,000 (full member discount)</option>
                                    <option value="tournament">Tournament — ₨ 1,500 (no per-game discount)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark dark:text-white mb-1">Membership Fee (₨)</label>
                                <input type="number" value={form.membershipFee} onChange={e => setForm(f => ({ ...f, membershipFee: e.target.value }))}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-darkgray text-dark dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-dark dark:text-white mb-1">Start Date *</label>
                                    <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-darkgray text-dark dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-dark dark:text-white mb-1">End Date *</label>
                                    <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-darkgray text-dark dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                            </div>
                            {form.membershipType === "tournament" && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-dark dark:text-white mb-1">Tournament Start</label>
                                        <input type="date" value={form.tournamentStartDate} onChange={e => setForm(f => ({ ...f, tournamentStartDate: e.target.value }))}
                                            className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-darkgray text-dark dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-dark dark:text-white mb-1">Tournament End</label>
                                        <input type="date" value={form.tournamentEndDate} onChange={e => setForm(f => ({ ...f, tournamentEndDate: e.target.value }))}
                                            className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-darkgray text-dark dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-dark dark:text-white mb-1">Notes</label>
                                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-darkgray text-dark dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 px-5 pb-5">
                            <button onClick={() => setOpenDialog(false)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-dark dark:text-white hover:bg-hover transition-colors">Cancel</button>
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                                {saving ? "Saving..." : editingMember ? "Update Member" : "Add Member"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-darkgray rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
                        <h2 className="text-lg font-bold text-dark dark:text-white mb-2">Delete Member</h2>
                        <p className="text-bodytext mb-5">Are you sure you want to delete <strong className="text-dark dark:text-white">{deleteTarget.name}</strong>? This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-dark dark:text-white hover:bg-hover transition-colors">Cancel</button>
                            <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-error text-white rounded-lg text-sm font-medium hover:bg-error/90 transition-colors">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
