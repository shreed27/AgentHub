/**
 * PermissionManager - Handles wallet permission checks and enforcement
 */
import { WalletPermission, PermissionCheck, TradeIntent } from '../types';
export declare class PermissionManager {
    private permissions;
    private dailyUsage;
    private weeklyUsage;
    /**
     * Register a wallet permission
     */
    registerPermission(permission: WalletPermission): void;
    /**
     * Get permission by ID
     */
    getPermission(permissionId: string): WalletPermission | undefined;
    /**
     * Get permission by agent ID
     */
    getPermissionByAgent(agentId: string): WalletPermission | undefined;
    /**
     * Check if a trade intent is permitted
     */
    checkPermission(intent: TradeIntent, permission: WalletPermission): PermissionCheck;
    /**
     * Record transaction usage
     */
    recordUsage(permissionId: string, amount: number): void;
    /**
     * Revoke a permission
     */
    revokePermission(permissionId: string): boolean;
    /**
     * Clean up expired permissions
     */
    cleanupExpired(): number;
    private isActionAllowed;
    private checkDailyLimit;
    private checkWeeklyLimit;
    private getWeekNumber;
}
//# sourceMappingURL=PermissionManager.d.ts.map