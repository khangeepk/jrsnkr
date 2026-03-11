import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pricingPackages } from "@/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const singlePkg = {
            name: "Single Game (25m)",
            description: "Base 25 min single game. Member: ₨250, Non: ₨350. OT 12/15.",
            category: "per_minute" as const,
            perMinuteRate: "15",
            isDefault: true,
            isActive: true,
            sortOrder: "1",
        };

        const doublePkg = {
            name: "Double Game (35m)",
            description: "Base 35 min double game. Member: ₨500, Non: ₨700. OT 12/15.",
            category: "per_minute" as const,
            perMinuteRate: "15",
            isDefault: false,
            isActive: true,
            sortOrder: "2",
        };

        const logs: string[] = [];

        const [existingSingle] = await db.select().from(pricingPackages).where(eq(pricingPackages.name, singlePkg.name));
        if (!existingSingle) {
            await db.insert(pricingPackages).values(singlePkg);
            logs.push("Inserted Single Game Package");
        } else {
            logs.push("Single Game Package already exists");
        }

        const [existingDouble] = await db.select().from(pricingPackages).where(eq(pricingPackages.name, doublePkg.name));
        if (!existingDouble) {
            await db.insert(pricingPackages).values(doublePkg);
            logs.push("Inserted Double Game Package");
        } else {
            logs.push("Double Game Package already exists");
        }

        return NextResponse.json({ success: true, logs });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
