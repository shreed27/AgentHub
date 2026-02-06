/**
 * Wallet Permission Type Definitions
 */
export interface WalletPermission {
    id: string;
    userId: string;
    agentId: string;
    walletAddress: string;
    allowedActions: Action[];
    limits: PermissionLimits;
    isActive: boolean;
    createdAt: number;
    expiresAt: number;
    revokedAt?: number;
}
export declare enum Action {
    SWAP = "swap",
    PLACE_ORDER = "place_order",
    CANCEL_ORDER = "cancel_order",
    CLOSE_POSITION = "close_position",
    TRANSFER = "transfer"
}
export interface PermissionLimits {
    maxTransactionValue: number;
    dailyLimit: number;
    weeklyLimit: number;
    requiresApproval: boolean;
    approvalThreshold?: number;
}
export interface PermissionCheck {
    permitted: boolean;
    reason?: string;
    remainingDailyLimit?: number;
    remainingWeeklyLimit?: number;
}
//# sourceMappingURL=permissions.d.ts.map