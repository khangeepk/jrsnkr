import { db } from './db';
import { pricingPackages } from '../schema';
import { eq } from 'drizzle-orm';

async function seedPricing() {
    console.log('Seeding pricing packages...');

    try {
        // Single Game Package
        const singlePkg = {
            name: 'Single Game (25m)',
            description: 'Base 25 min single game. Member: ₨250, Non-Member: ₨350. Overtime 12/15 per min.',
            category: 'per_minute' as const,
            perMinuteRate: '15', // We set non-member OT here, game engine handles actual logic
            isDefault: true,
            isActive: true,
            sortOrder: '1',
        };

        // Double Game Package
        const doublePkg = {
            name: 'Double Game (35m)',
            description: 'Base 35 min double game. Member: ₨500, Non-Member: ₨700. Overtime 12/15 per min.',
            category: 'per_minute' as const,
            perMinuteRate: '15',
            isDefault: false,
            isActive: true,
            sortOrder: '2',
        };

        // Check if Single Game exists
        const [existingSingle] = await db.select().from(pricingPackages).where(eq(pricingPackages.name, singlePkg.name));
        if (!existingSingle) {
            await db.insert(pricingPackages).values(singlePkg);
            console.log('Inserted Single Game Package');
        } else {
            console.log('Single Game Package already exists');
        }

        // Check if Double Game exists
        const [existingDouble] = await db.select().from(pricingPackages).where(eq(pricingPackages.name, doublePkg.name));
        if (!existingDouble) {
            await db.insert(pricingPackages).values(doublePkg);
            console.log('Inserted Double Game Package');
        } else {
            console.log('Double Game Package already exists');
        }

        console.log('Pricing seed complete!');
        process.exit(0);
    } catch (err) {
        console.error('Failed to seed pricing:', err);
        process.exit(1);
    }
}

seedPricing();
