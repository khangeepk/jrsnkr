/**
 * JR Snooker Lounge — Game Engine
 * Core pricing and billing logic (pure functions, no DB dependencies)
 *
 * Pricing Rules:
 * ─────────────────────────────────────────────────────────────
 * SINGLE GAME
 *   Member:     ₨ 250/game  |  Non-Member: ₨ 350/game
 *   Base duration: 20 min + 5 min grace = 25 min total
 *
 * DOUBLE GAME  (cumulative based on each player's status)
 *   M + M = ₨ 500  |  N + N = ₨ 700  |  M + N = ₨ 600
 *   Base duration: 30 min + 5 min grace = 35 min total
 *
 * OVERTIME (when base duration exceeded & user clicks "Resume")
 *   Billing switches to per-minute, charged from MINUTE ONE
 *   Member: ₨ 12/min  |  Non-Member: ₨ 15/min
 *
 * GRACE PERIOD
 *   If game ends within 5 minutes → charge = ₨ 0
 *
 * CENTURY GAMES
 *   Individual: Loser pays all (manual selection by staff)
 *   Team:       Losing team pays all (manual selection by staff)
 *   Group:      Nominated player pays all (ignores member discount)
 * ─────────────────────────────────────────────────────────────
 */

export const PRICING = {
    // Per-game base rates
    SINGLE_MEMBER: 250,
    SINGLE_NON_MEMBER: 350,

    // Double game cumulative rates
    DOUBLE_MEMBER_MEMBER: 500,
    DOUBLE_NON_NON: 700,
    DOUBLE_MIXED: 600,

    // Per-minute overtime rates (applied from minute ONE)
    PER_MINUTE_MEMBER: 12,
    PER_MINUTE_NON_MEMBER: 15,

    // Base durations (minutes)
    SINGLE_BASE_THRESHOLD: 25,
    DOUBLE_BASE_THRESHOLD: 35,
    GRACE_PERIOD: 5,

    // Membership fees
    ANNUAL_MEMBERSHIP_FEE: 3000,
    TOURNAMENT_MEMBERSHIP_FEE: 1500,
};

export type GameType = 'single' | 'double' | 'century_individual' | 'century_team' | 'century_group';
export type BillingMode = 'per_game' | 'per_minute';
export type PaymentMethod = 'cash' | 'online' | 'credit' | 'transfer';

export interface Player {
    name: string;
    memberId?: number | null;
    // Note: tournament members do NOT get the ₨250 member discount
    isMember: boolean;
    isTournamentMember?: boolean;
    teamSide?: 'A' | 'B';
    role?: 'player' | 'nominated_payer';
}

export interface GameSettings {
    gameType: GameType;
    players: Player[];
    billingMode: BillingMode;
    durationMinutes: number;
    nominatedPayerName?: string;
}

export interface BillingResult {
    amountDue: number;
    billingMode: BillingMode;
    rateApplied: number;
    breakdown: string;
    isGrace: boolean;
    perMinuteTotal?: number;
}

/**
 * Get base duration for a game type (without grace period)
 */
export function getBaseDuration(gameType: GameType): number {
    if (gameType === 'double') return PRICING.DOUBLE_BASE_THRESHOLD;
    return PRICING.SINGLE_BASE_THRESHOLD;
}

/**
 * Get the total allowed duration before overtime triggers (base + grace)
 */
export function getAllowedDuration(gameType: GameType): number {
    return getBaseDuration(gameType) + PRICING.GRACE_PERIOD;
}

/**
 * Check if the game has exceeded the allowed duration (triggers overtime popup)
 */
export function isOvertime(gameType: GameType, durationMinutes: number): boolean {
    // Only single and double games have overtime triggers
    if (gameType.startsWith('century')) return false;
    return durationMinutes > getAllowedDuration(gameType);
}

/**
 * Calculate per-game rate for a single player based on membership status
 * Note: Tournament membership does NOT qualify for the ₨250 rate
 */
function getPlayerGameRate(player: Player): number {
    if (player.isMember && !player.isTournamentMember) {
        return PRICING.SINGLE_MEMBER;
    }
    return PRICING.SINGLE_NON_MEMBER;
}

/**
 * Calculate per-minute rate for a player
 */
function getPlayerPerMinuteRate(player: Player): number {
    if (player.isMember && !player.isTournamentMember) {
        return PRICING.PER_MINUTE_MEMBER;
    }
    return PRICING.PER_MINUTE_NON_MEMBER;
}

/**
 * Calculate SINGLE game billing
 */
function calcSingle(settings: GameSettings): BillingResult {
    const { players, durationMinutes, billingMode } = settings;
    const player = players[0];
    const ceilMinutes = Math.ceil(durationMinutes);

    // 1. Absolute Grace Period Rule (High Priority Override)
    if (durationMinutes <= PRICING.GRACE_PERIOD) {
        return {
            amountDue: 0,
            billingMode: 'per_game',
            rateApplied: 0,
            breakdown: 'Grace period applied (duration <= 5.00 minutes)',
            isGrace: true,
        };
    }

    const isMember = player?.isMember && !player?.isTournamentMember;
    const baseFee = isMember ? PRICING.SINGLE_MEMBER : PRICING.SINGLE_NON_MEMBER;
    const overtimeRate = isMember ? PRICING.PER_MINUTE_MEMBER : PRICING.PER_MINUTE_NON_MEMBER;
    const threshold = 25;

    // Overtime Trigger: IF total duration > 25.00 minutes, THEN Total_Bill = Total_Duration_In_Minutes * Rate
    if (ceilMinutes > threshold || billingMode === 'per_minute') {
        const total = ceilMinutes * overtimeRate;
        return {
            amountDue: total,
            billingMode: 'per_minute',
            rateApplied: overtimeRate,
            breakdown: `Overtime triggered (>25m): ₨${overtimeRate}/min × ${ceilMinutes} min = ₨${total}`,
            isGrace: false,
            perMinuteTotal: total,
        };
    }

    // Per-game billing (Base Fee)
    return {
        amountDue: baseFee,
        billingMode: 'per_game',
        rateApplied: baseFee,
        breakdown: `Single game (${isMember ? 'Member' : 'Non-Member'}) Base Fee: ₨${baseFee}`,
        isGrace: false,
    };
}

/**
 * Calculate DOUBLE game billing (2v2 or Team)
 */
function calcDouble(settings: GameSettings): BillingResult {
    const { players, durationMinutes, billingMode } = settings;
    const ceilMinutes = Math.ceil(durationMinutes);

    // 1. Absolute Grace Period Rule
    if (durationMinutes <= PRICING.GRACE_PERIOD) {
        return {
            amountDue: 0,
            billingMode: 'per_game',
            rateApplied: 0,
            breakdown: 'Grace period applied (duration <= 5.00 minutes)',
            isGrace: true,
        };
    }

    // Check if ALL players are members (excluding tournament members)
    const allMembers = players.length > 0 && players.every(p => p.isMember && !p.isTournamentMember);

    const baseFee = allMembers ? PRICING.DOUBLE_MEMBER_MEMBER : PRICING.DOUBLE_NON_NON;
    const overtimeRate = allMembers ? PRICING.PER_MINUTE_MEMBER : PRICING.PER_MINUTE_NON_MEMBER;
    const threshold = 35;

    // Overtime Trigger: IF total duration > 35.00 minutes, THEN Total_Bill = Total_Duration_In_Minutes * Rate
    if (ceilMinutes > threshold || billingMode === 'per_minute') {
        const total = ceilMinutes * overtimeRate;
        return {
            amountDue: total,
            billingMode: 'per_minute',
            rateApplied: overtimeRate,
            breakdown: `Overtime triggered (>35m): ₨${overtimeRate}/min × ${ceilMinutes} min = ₨${total}`,
            isGrace: false,
            perMinuteTotal: total,
        };
    }

    // Per-game billing (Base Fee)
    return {
        amountDue: baseFee,
        billingMode: 'per_game',
        rateApplied: baseFee,
        breakdown: `Double game (${allMembers ? 'All Members' : 'Non-Members'}) Base Fee: ₨${baseFee}`,
        isGrace: false,
    };
}

/**
 * Calculate CENTURY game billing
 * Note: Century games have no time limit — billing is per-game only.
 * The paying player is determined by game result (individual/team/group).
 */
function calcCentury(settings: GameSettings): BillingResult {
    const { gameType, players, durationMinutes } = settings;

    // Grace period still applies
    if (durationMinutes <= PRICING.GRACE_PERIOD) {
        return {
            amountDue: 0,
            billingMode: 'per_game',
            rateApplied: 0,
            breakdown: 'Grace period applied',
            isGrace: true,
        };
    }

    if (gameType === 'century_group') {
        // Nominated player pays — no member discount for this type
        const total = PRICING.SINGLE_NON_MEMBER * players.length;
        return {
            amountDue: total,
            billingMode: 'per_game',
            rateApplied: PRICING.SINGLE_NON_MEMBER,
            breakdown: `Century Group: ₨${PRICING.SINGLE_NON_MEMBER} × ${players.length} players = ₨${total} (paid by nominated player)`,
            isGrace: false,
        };
    }

    // Individual and team: calculate total and let staff assign who pays
    const total = players.reduce((sum, p) => sum + getPlayerGameRate(p), 0);
    const label = gameType === 'century_individual' ? 'Individual (loser pays all)' : 'Team (losing team pays all)';

    return {
        amountDue: total,
        billingMode: 'per_game',
        rateApplied: total / players.length,
        breakdown: `Century ${label}: ₨${total} total`,
        isGrace: false,
    };
}

/**
 * Main billing calculation entry point
 */
export function calculateBilling(settings: GameSettings): BillingResult {
    const { gameType } = settings;

    switch (gameType) {
        case 'single':
            return calcSingle(settings);
        case 'double':
            return calcDouble(settings);
        case 'century_individual':
        case 'century_team':
        case 'century_group':
            return calcCentury(settings);
        default:
            return calcSingle(settings);
    }
}

/**
 * Estimate cost before game ends (for display during active session)
 */
export function estimateCost(settings: GameSettings): number {
    const result = calculateBilling(settings);
    return result.amountDue;
}

/**
 * Format currency amount as PKR
 */
export function formatPKR(amount: number): string {
    return `₨ ${amount.toLocaleString('en-PK')}`;
}

/**
 * Check if a membership is expired
 */
export function isMembershipExpired(endDate: Date): boolean {
    return new Date() > endDate;
}

/**
 * Check if a membership expires within N days
 */
export function isExpiringSoon(endDate: Date, withinDays = 7): boolean {
    const daysUntilExpiry = (endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry >= 0 && daysUntilExpiry <= withinDays;
}

/**
 * Get membership status label
 */
export function getMembershipStatus(endDate: Date): 'active' | 'expiringSoon' | 'expired' {
    if (isMembershipExpired(endDate)) return 'expired';
    if (isExpiringSoon(endDate)) return 'expiringSoon';
    return 'active';
}
