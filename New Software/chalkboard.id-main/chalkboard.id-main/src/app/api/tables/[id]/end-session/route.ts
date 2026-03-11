import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tables, tableSessions } from '@/schema/tables';
import { pricingPackages } from '@/schema/pricing-packages';
import { fnbOrders } from '@/schema/fnb';
import { payments } from '@/schema/payments';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getTaxSettings } from '@/lib/tax-server';
import { calculateTax } from '@/lib/tax';
import { calculateBilling, GameType, BillingMode, Player } from '@/lib/game-engine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const tableId = parseInt(id);

    // Find active session for this table
    const activeSession = await db.select().from(tableSessions)
      .where(and(eq(tableSessions.tableId, tableId), eq(tableSessions.status, 'active')))
      .limit(1);

    if (activeSession.length === 0) {
      return NextResponse.json({ error: 'No active session found' }, { status: 404 });
    }

    const currentSession = activeSession[0];
    const endTime = new Date();
    const startTime = new Date(currentSession.startTime);
    const calculatedDuration = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // in minutes (round up as per rule)

    // Use actual duration if manually set, otherwise use calculated duration
    const actualDuration = currentSession.actualDuration || calculatedDuration;
    const originalDuration = currentSession.originalDuration || calculatedDuration;

    // Get pricing package for cost calculation
    let pricingPackage;
    if (currentSession.pricingPackageId) {
      const packageResult = await db.select().from(pricingPackages)
        .where(eq(pricingPackages.id, currentSession.pricingPackageId))
        .limit(1);
      pricingPackage = packageResult[0];
    }

    // Fallback to table rates if no package found (backwards compatibility)
    const table = await db.select().from(tables).where(eq(tables.id, tableId)).limit(1);
    const tableData = table[0];

    // Use centralized billing engine
    const players: Player[] = currentSession.players ? JSON.parse(currentSession.players) : [];

    const billing = calculateBilling({
      gameType: (currentSession.gameType as GameType) || 'single',
      players,
      durationMinutes: actualDuration,
      billingMode: (currentSession.durationType as BillingMode) || 'hourly',
    });

    const tableCost = billing.amountDue;

    const billingDetails = {
      type: billing.billingMode,
      rate: billing.rateApplied,
      actualMinutes: actualDuration,
      breakdown: billing.breakdown,
      packageName: pricingPackage?.name
    };

    // Get F&B orders for this table during the session
    const fnbOrdersForTable = await db.select().from(fnbOrders)
      .where(and(
        eq(fnbOrders.tableId, tableId),
        eq(fnbOrders.status, 'pending')
      ));

    // Calculate total F&B cost
    const fnbTotalCost = fnbOrdersForTable.reduce((total, order) => {
      return total + parseFloat(order.total);
    }, 0);

    // Get tax settings and calculate tax
    const taxSettings = await getTaxSettings();

    // Calculate tax separately for table and F&B amounts
    const tableTax = calculateTax(tableCost, taxSettings, true); // isTable = true
    const fnbTax = calculateTax(fnbTotalCost, taxSettings, false); // isTable = false
    const totalTaxAmount = tableTax + fnbTax;

    // Total cost before tax
    const subtotal = tableCost + fnbTotalCost;
    // Total cost including tax
    const totalCost = subtotal + totalTaxAmount;

    // End the session
    const endedSession = await db.update(tableSessions)
      .set({
        endTime,
        actualDuration,
        originalDuration,
        totalCost: totalCost.toFixed(2),
        status: 'completed',
      })
      .where(eq(tableSessions.id, currentSession.id))
      .returning();

    // Create payment record for the total amount
    const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const newPayment = await db.insert(payments).values({
      transactionNumber: transactionId,
      customerName: currentSession.customerName,
      customerPhone: currentSession.customerPhone,
      totalAmount: totalCost.toFixed(2),
      paymentMethods: JSON.stringify([{ type: 'cash', amount: totalCost.toFixed(2) }]),
      staffId: currentSession.staffId,
      status: 'pending',
      tableAmount: tableCost.toFixed(2),
      fnbAmount: fnbTotalCost.toFixed(2),
      discountAmount: '0',
      taxAmount: totalTaxAmount.toFixed(2),
      // Legacy fields for compatibility
      transactionId,
      midtransOrderId: `ORDER-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      amount: totalCost.toFixed(2),
      currency: 'IDR',
      paymentMethod: 'cash',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    const paymentId = newPayment[0].id;

    // Link the table session to the payment
    await db.update(tableSessions)
      .set({ paymentId })
      .where(eq(tableSessions.id, currentSession.id));

    // Link all F&B orders for this table to the payment
    if (fnbOrdersForTable.length > 0) {
      await db.update(fnbOrders)
        .set({
          paymentId,
          status: 'billed' // Update status to indicate it's now part of a bill
        })
        .where(and(
          eq(fnbOrders.tableId, tableId),
          eq(fnbOrders.status, 'pending')
        ));
    }

    // Update table status to available
    await db.update(tables)
      .set({ status: 'available', updatedAt: new Date() })
      .where(eq(tables.id, tableId));

    return NextResponse.json({
      session: endedSession[0],
      payment: newPayment[0],
      billing: {
        actualDuration,
        originalDuration,
        calculatedDuration,
        billingDetails,
        tableCost,
        fnbTotalCost,
        subtotal,
        tableTax,
        fnbTax,
        totalTaxAmount,
        totalCost,
        fnbOrders: fnbOrdersForTable,
        taxSettings
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 });
  }
} 