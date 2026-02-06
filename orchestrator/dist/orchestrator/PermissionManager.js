"use strict";
/**
 * PermissionManager - Handles wallet permission checks and enforcement
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionManager = void 0;
const types_1 = require("../types");
class PermissionManager {
    permissions = new Map();
    dailyUsage = new Map();
    weeklyUsage = new Map();
    /**
     * Register a wallet permission
     */
    registerPermission(permission) {
        this.permissions.set(permission.id, permission);
    }
    /**
     * Get permission by ID
     */
    getPermission(permissionId) {
        return this.permissions.get(permissionId);
    }
    /**
     * Get permission by agent ID
     */
    getPermissionByAgent(agentId) {
        return Array.from(this.permissions.values()).find(p => p.agentId === agentId && p.isActive);
    }
    /**
     * Check if a trade intent is permitted
     */
    checkPermission(intent, permission) {
        // Check if permission is active
        if (!permission.isActive) {
            return {
                permitted: false,
                reason: 'Permission is not active'
            };
        }
        // Check if permission has expired
        if (Date.now() > permission.expiresAt) {
            return {
                permitted: false,
                reason: 'Permission has expired'
            };
        }
        // Check if action is allowed
        const actionAllowed = this.isActionAllowed(intent.action, permission.allowedActions);
        if (!actionAllowed) {
            return {
                permitted: false,
                reason: `Action '${intent.action}' is not permitted`
            };
        }
        // Check transaction value limit
        if (intent.amount > permission.limits.maxTransactionValue) {
            return {
                permitted: false,
                reason: `Transaction amount ${intent.amount} exceeds limit ${permission.limits.maxTransactionValue}`
            };
        }
        // Check daily limit
        const dailyCheck = this.checkDailyLimit(permission.id, intent.amount, permission.limits.dailyLimit);
        if (!dailyCheck.permitted) {
            return dailyCheck;
        }
        // Check weekly limit
        const weeklyCheck = this.checkWeeklyLimit(permission.id, intent.amount, permission.limits.weeklyLimit);
        if (!weeklyCheck.permitted) {
            return weeklyCheck;
        }
        // Check if manual approval is required
        if (permission.limits.requiresApproval) {
            const threshold = permission.limits.approvalThreshold || 0;
            if (intent.amount > threshold) {
                return {
                    permitted: false,
                    reason: 'Manual approval required for this transaction',
                    remainingDailyLimit: dailyCheck.remainingDailyLimit,
                    remainingWeeklyLimit: weeklyCheck.remainingWeeklyLimit
                };
            }
        }
        return {
            permitted: true,
            remainingDailyLimit: dailyCheck.remainingDailyLimit,
            remainingWeeklyLimit: weeklyCheck.remainingWeeklyLimit
        };
    }
    /**
     * Record transaction usage
     */
    recordUsage(permissionId, amount) {
        // Record daily usage
        const today = new Date().toISOString().split('T')[0];
        const dailyKey = `${permissionId}-${today}`;
        const currentDaily = this.dailyUsage.get(dailyKey) || { date: today, amount: 0 };
        this.dailyUsage.set(dailyKey, {
            date: today,
            amount: currentDaily.amount + amount
        });
        // Record weekly usage
        const weekNumber = this.getWeekNumber(new Date());
        const weeklyKey = `${permissionId}-${weekNumber}`;
        const currentWeekly = this.weeklyUsage.get(weeklyKey) || { week: weekNumber, amount: 0 };
        this.weeklyUsage.set(weeklyKey, {
            week: weekNumber,
            amount: currentWeekly.amount + amount
        });
    }
    /**
     * Revoke a permission
     */
    revokePermission(permissionId) {
        const permission = this.permissions.get(permissionId);
        if (!permission) {
            return false;
        }
        permission.isActive = false;
        permission.revokedAt = Date.now();
        return true;
    }
    /**
     * Clean up expired permissions
     */
    cleanupExpired() {
        const now = Date.now();
        let cleaned = 0;
        for (const [id, permission] of this.permissions.entries()) {
            if (permission.expiresAt < now && permission.isActive) {
                permission.isActive = false;
                cleaned++;
            }
        }
        return cleaned;
    }
    // Private helper methods
    isActionAllowed(action, allowedActions) {
        // Map trade intent actions to permission actions
        const actionMap = {
            'buy': types_1.Action.SWAP,
            'sell': types_1.Action.SWAP,
            'place_order': types_1.Action.PLACE_ORDER,
            'cancel_order': types_1.Action.CANCEL_ORDER,
            'close': types_1.Action.CLOSE_POSITION
        };
        const requiredAction = actionMap[action];
        return requiredAction ? allowedActions.includes(requiredAction) : false;
    }
    checkDailyLimit(permissionId, amount, limit) {
        const today = new Date().toISOString().split('T')[0];
        const dailyKey = `${permissionId}-${today}`;
        const usage = this.dailyUsage.get(dailyKey);
        const currentUsage = usage?.amount || 0;
        if (currentUsage + amount > limit) {
            return {
                permitted: false,
                reason: `Daily limit exceeded. Used: ${currentUsage}, Limit: ${limit}`,
                remainingDailyLimit: Math.max(0, limit - currentUsage)
            };
        }
        return {
            permitted: true,
            remainingDailyLimit: limit - currentUsage - amount
        };
    }
    checkWeeklyLimit(permissionId, amount, limit) {
        const weekNumber = this.getWeekNumber(new Date());
        const weeklyKey = `${permissionId}-${weekNumber}`;
        const usage = this.weeklyUsage.get(weeklyKey);
        const currentUsage = usage?.amount || 0;
        if (currentUsage + amount > limit) {
            return {
                permitted: false,
                reason: `Weekly limit exceeded. Used: ${currentUsage}, Limit: ${limit}`,
                remainingWeeklyLimit: Math.max(0, limit - currentUsage)
            };
        }
        return {
            permitted: true,
            remainingWeeklyLimit: limit - currentUsage - amount
        };
    }
    getWeekNumber(date) {
        const year = date.getFullYear();
        const firstDayOfYear = new Date(year, 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        return `${year}-W${weekNumber}`;
    }
}
exports.PermissionManager = PermissionManager;
//# sourceMappingURL=PermissionManager.js.map