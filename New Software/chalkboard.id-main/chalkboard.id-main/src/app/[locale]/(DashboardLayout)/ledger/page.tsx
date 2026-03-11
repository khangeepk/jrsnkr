"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Alert } from "flowbite-react";
import {
    IconCurrencyDollar, IconBook, IconWallet, IconRefresh,
    IconCheck, IconArrowLeft
} from "@tabler/icons-react";

interface IncomeEntry {
    id: number; playerName: string; tableName?: string;
    gameType?: string; durationMinutes?: number;
    amount: string; paymentMethod: string; createdAt: string;
}

interface CreditEntry {
    id: number; playerName: string; creditAmount: string;
    paidAmount: string; outstandingBalance: string; status: string; createdAt: string;
}

const GAME_LABELS: Record<string, string> = {
    single: "Single", double: "Double",
    century_individual: "Century (Individual)",
    century_team: "Century (Team)", century_group: "Century (Group)",
};

export default function LedgerPage() {
    const [activeTab, setActiveTab] = useState<"income" | "credit">("income");
    const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
    const [creditEntries, setCreditEntries] = useState<CreditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [payDialog, setPayDialog] = useState<CreditEntry | null>(null);
    const [payAmount, setPayAmount] = useState("");
    const [payFull, setPayFull] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [error, setError] = useState("");

    const fetchData = useCallback(async (tab: "income" | "credit") => {
        setLoading(true);
        try {
            const res = await fetch(`/api/ledger?tab=${tab}`);
            const data = await res.json();
            if (tab === "income") setIncomeEntries(data.entries || []);
            else setCreditEntries(data.entries || []);
        } catch { setError("Failed to load ledger data"); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(activeTab); }, [activeTab, fetchData]);

    const handleMarkPaid = async () => {
        if (!payDialog) return;
        try {
            await fetch(`/api/ledger/${payDialog.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paidAmount: payFull ? Number(payDialog.outstandingBalance) : Number(payAmount), markFullyPaid: payFull }),
            });
            setPayDialog(null); setPayAmount(""); setPayFull(false);
            setSuccessMsg("Credit updated"); fetchData("credit");
            setTimeout(() => setSuccessMsg(""), 3000);
        } catch { setError("Failed to update credit"); }
    };

    const totalCash = incomeEntries.filter(e => e.paymentMethod === "cash").reduce((s, e) => s + Number(e.amount), 0);
    const totalOnline = incomeEntries.filter(e => e.paymentMethod === "online").reduce((s, e) => s + Number(e.amount), 0);
    const todayTotal = incomeEntries.filter(e => new Date(e.createdAt).toDateString() === new Date().toDateString()).reduce((s, e) => s + Number(e.amount), 0);
    const totalOutstanding = creditEntries.filter(e => e.status !== "paid").reduce((s, e) => s + Number(e.outstandingBalance), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-dark dark:text-white">Financial Ledger</h1>
                <p className="text-bodytext mt-1">Track all income and credit balances in real-time</p>
            </div>

            {successMsg && <Alert color="success" onDismiss={() => setSuccessMsg("")}>{successMsg}</Alert>}
            {error && <Alert color="failure" onDismiss={() => setError("")}>{error}</Alert>}

            {/* Tabs */}
            <div className="flex border-b border-border">
                {[
                    { key: "income" as const, label: "Income Ledger", icon: <IconCurrencyDollar className="w-4 h-4" /> },
                    { key: "credit" as const, label: `Credit Ledger${totalOutstanding > 0 ? ` (₨ ${totalOutstanding.toLocaleString()} outstanding)` : ""}`, icon: <IconBook className="w-4 h-4" /> },
                ].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-bodytext hover:text-dark"}`}>
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "income" && (
                <div className="space-y-4">
                    {/* Income Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { label: "Today's Total", value: todayTotal, color: "bg-lightprimary text-primary" },
                            { label: "Cash Received", value: totalCash, color: "bg-lightsuccess text-success" },
                            { label: "Online Received", value: totalOnline, color: "bg-lightinfo text-info" },
                        ].map(s => (
                            <div key={s.label} className="bg-white dark:bg-darkgray rounded-xl p-4 shadow-sm border border-border">
                                <p className="text-2xl font-bold text-dark dark:text-white">₨ {s.value.toLocaleString()}</p>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                    {/* Income Table */}
                    <div className="bg-white dark:bg-darkgray rounded-xl shadow-sm border border-border overflow-hidden">
                        <div className="flex justify-between items-center px-4 py-3 border-b border-border">
                            <h3 className="font-semibold text-dark dark:text-white">Income Entries</h3>
                            <button onClick={() => fetchData("income")} className="flex items-center gap-1 text-sm text-bodytext hover:text-dark transition-colors">
                                <IconRefresh className="w-4 h-4" /> Refresh
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-lightgray dark:bg-darkgray border-b border-border">
                                    <tr>{["Date & Time", "Player", "Table", "Game Type", "Duration", "Amount", "Method"].map(h => (
                                        <th key={h} className="px-4 py-3 text-left font-semibold text-dark dark:text-white whitespace-nowrap">{h}</th>
                                    ))}</tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-bodytext">Loading...</td></tr>
                                        : incomeEntries.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-bodytext">No income entries yet</td></tr>
                                            : incomeEntries.map(e => (
                                                <tr key={e.id} className="hover:bg-hover transition-colors">
                                                    <td className="px-4 py-3 text-bodytext whitespace-nowrap">{format(new Date(e.createdAt), "dd MMM yyyy HH:mm")}</td>
                                                    <td className="px-4 py-3 font-semibold text-dark dark:text-white">{e.playerName}</td>
                                                    <td className="px-4 py-3 text-bodytext">{e.tableName || "—"}</td>
                                                    <td className="px-4 py-3">
                                                        {e.gameType ? <span className="text-xs px-2 py-1 rounded-full border border-border text-bodytext">{GAME_LABELS[e.gameType] || e.gameType}</span> : "—"}
                                                    </td>
                                                    <td className="px-4 py-3 text-bodytext">{e.durationMinutes ? `${e.durationMinutes} min` : "—"}</td>
                                                    <td className="px-4 py-3 font-bold text-success">₨ {Number(e.amount).toLocaleString()}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${e.paymentMethod === "cash" ? "bg-lightsuccess text-success" : "bg-lightprimary text-primary"}`}>
                                                            {e.paymentMethod === "cash" ? "Cash" : "Online"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "credit" && (
                <div className="space-y-4">
                    {totalOutstanding > 0 && (
                        <Alert color="warning">
                            <strong>Total Outstanding Credit: ₨ {totalOutstanding.toLocaleString()}</strong>
                        </Alert>
                    )}
                    <div className="bg-white dark:bg-darkgray rounded-xl shadow-sm border border-border overflow-hidden">
                        <div className="flex justify-between items-center px-4 py-3 border-b border-border">
                            <h3 className="font-semibold text-dark dark:text-white">Credit Entries</h3>
                            <button onClick={() => fetchData("credit")} className="flex items-center gap-1 text-sm text-bodytext hover:text-dark transition-colors">
                                <IconRefresh className="w-4 h-4" /> Refresh
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-lightgray dark:bg-darkgray border-b border-border">
                                    <tr>{["Date", "Player", "Credit Taken", "Paid Back", "Outstanding", "Status", "Actions"].map(h => (
                                        <th key={h} className="px-4 py-3 text-left font-semibold text-dark dark:text-white whitespace-nowrap">{h}</th>
                                    ))}</tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-bodytext">Loading...</td></tr>
                                        : creditEntries.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-bodytext">No credit entries</td></tr>
                                            : creditEntries.map(e => (
                                                <tr key={e.id} className="hover:bg-hover transition-colors">
                                                    <td className="px-4 py-3 text-bodytext whitespace-nowrap">{format(new Date(e.createdAt), "dd MMM yyyy")}</td>
                                                    <td className="px-4 py-3 font-semibold text-dark dark:text-white">{e.playerName}</td>
                                                    <td className="px-4 py-3 font-semibold text-error">₨ {Number(e.creditAmount).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-success">₨ {Number(e.paidAmount).toLocaleString()}</td>
                                                    <td className={`px-4 py-3 font-bold ${Number(e.outstandingBalance) > 0 ? "text-error" : "text-success"}`}>
                                                        ₨ {Number(e.outstandingBalance).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${e.status === "paid" ? "bg-lightsuccess text-success" : e.status === "partially_paid" ? "bg-lightwarning text-warning" : "bg-lighterror text-error"}`}>
                                                            {e.status === "paid" ? "Paid" : e.status === "partially_paid" ? "Partial" : "Outstanding"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {e.status !== "paid" && (
                                                            <button onClick={() => { setPayDialog(e); setPayAmount(""); setPayFull(false); }}
                                                                className="flex items-center gap-1 text-xs px-2 py-1 bg-success text-white rounded-lg hover:bg-success/90 transition-colors">
                                                                <IconWallet className="w-3 h-3" /> Pay
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Pay Dialog */}
            {payDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-darkgray rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
                        <h2 className="text-lg font-bold text-dark dark:text-white mb-1">Record Payment</h2>
                        <p className="text-bodytext text-sm mb-4">Player: <strong className="text-dark dark:text-white">{payDialog.playerName}</strong></p>
                        <div className="p-3 bg-lightinfo rounded-lg text-info text-sm mb-4">
                            Outstanding balance: <strong>₨ {Number(payDialog.outstandingBalance).toLocaleString()}</strong>
                        </div>
                        <button onClick={() => setPayFull(!payFull)}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors mb-3 text-sm font-medium ${payFull ? "bg-success text-white border-success" : "border-success text-success hover:bg-lightsuccess"}`}>
                            <IconCheck className="w-4 h-4" /> Mark as Fully Paid
                        </button>
                        {!payFull && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-dark dark:text-white mb-1">Partial Amount (₨)</label>
                                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                                    className="w-full px-3 py-2 border border-border rounded-lg text-dark dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-darkgray" />
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => setPayDialog(null)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-dark dark:text-white hover:bg-hover transition-colors">Cancel</button>
                            <button onClick={handleMarkPaid} disabled={!payFull && !payAmount}
                                className="flex-1 px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 transition-colors disabled:opacity-60">
                                Confirm Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
