"use client";

import React, { useEffect, useState } from "react";
import { format, differenceInDays } from "date-fns";

interface ExpiredMember {
    id: number;
    name: string;
    phone: string;
    membershipType: string;
    endDate: string;
}

export default function MembershipExpiredPopup() {
    const [expiredMembers, setExpiredMembers] = useState<ExpiredMember[]>([]);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const checkExpired = async () => {
            try {
                const res = await fetch("/api/members");
                const data = await res.json();
                const now = new Date();
                const expired = (data.members || []).filter((m: ExpiredMember) => {
                    const end = new Date(m.endDate);
                    const daysAgo = differenceInDays(now, end);
                    return daysAgo >= 0 && daysAgo <= 30;
                });
                if (expired.length > 0) {
                    setExpiredMembers(expired);
                    setOpen(true);
                }
            } catch {
                // Silent fail
            }
        };
        const timer = setTimeout(checkExpired, 2500);
        return () => clearTimeout(timer);
    }, []);

    if (!open || expiredMembers.length === 0) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-darkgray rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 p-5 bg-error text-white">
                    <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <h2 className="text-lg font-bold">Membership Expired Alert</h2>
                </div>

                {/* Body */}
                <div className="p-5">
                    <p className="text-sm text-bodytext mb-4">
                        The following memberships have recently expired. Please contact these members to renew.
                    </p>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                        {expiredMembers.map(member => {
                            const daysAgo = differenceInDays(new Date(), new Date(member.endDate));
                            return (
                                <div key={member.id} className="flex items-start gap-3 p-3 rounded-lg bg-lighterror border border-error/20">
                                    <div className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg className="w-4 h-4 text-error" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-dark dark:text-white text-sm">{member.name}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${member.membershipType === 'annual'
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'bg-secondary/10 text-secondary'
                                                }`}>
                                                {member.membershipType === 'annual' ? 'Annual' : 'Tournament'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-bodytext mt-0.5">📞 {member.phone}</p>
                                        <p className="text-xs text-error font-medium mt-0.5">
                                            Expired: {format(new Date(member.endDate), 'dd MMM yyyy')}
                                            {daysAgo === 0 ? ' (Today)' : ` (${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago)`}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-5 pb-5">
                    <button
                        onClick={() => setOpen(false)}
                        className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-dark dark:text-white hover:bg-hover transition-colors"
                    >
                        Dismiss
                    </button>
                    <a
                        href="/en/members"
                        className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium text-center hover:bg-primary/90 transition-colors"
                        onClick={() => setOpen(false)}
                    >
                        Go to Members →
                    </a>
                </div>
            </div>
        </div>
    );
}
