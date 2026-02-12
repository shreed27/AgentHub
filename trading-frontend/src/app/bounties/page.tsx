"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Plus, Trophy, Clock, DollarSign, X } from "lucide-react";
import { BountyList } from "@/features/bounties/components/BountyList";
import { useBounty } from "@/features/bounties/hooks/useBounties";
import { cn } from "@/lib/utils";
import { getRankInfo, formatReputationStats, HunterReputation } from "@/lib/reputation";

function BountyDetailModal({
  bountyId,
  onClose,
}: {
  bountyId: string;
  onClose: () => void;
}) {
  const { bounty, claim, submission, isLoading, error } = useBounty(bountyId);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full" />
      </div>
    );
  }

  if (!bounty) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="bg-zinc-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-start justify-between">
          <div className="flex-1 pr-4">
            <h2 className="text-xl font-bold text-white mb-2">{bounty.question}</h2>
            <div className="flex items-center gap-3">
              <span className={cn(
                "px-2 py-1 rounded text-xs font-bold uppercase",
                bounty.status === "open" ? "bg-green-500/10 text-green-400" :
                bounty.status === "claimed" ? "bg-yellow-500/10 text-yellow-400" :
                bounty.status === "completed" ? "bg-purple-500/10 text-purple-400" :
                "bg-white/5 text-muted-foreground"
              )}>
                {bounty.status}
              </span>
              <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-white/5 text-muted-foreground">
                {bounty.difficulty}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Reward */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-green-500/5 border border-green-500/10">
            <DollarSign className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-sm text-muted-foreground">Reward</p>
              <p className="text-2xl font-bold text-green-400">
                {bounty.reward.amount} {bounty.reward.token}
              </p>
            </div>
          </div>

          {/* Description */}
          {bounty.description && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
              <p className="text-white">{bounty.description}</p>
            </div>
          )}

          {/* Tags */}
          {bounty.tags && bounty.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {bounty.tags.map((tag, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-white/5 text-sm text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Deadline */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            Deadline: {new Date(bounty.deadline).toLocaleString()}
          </div>

          {/* Claim Info */}
          {claim && (
            <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
              <h3 className="text-sm font-medium text-yellow-400 mb-2">Currently Claimed</h3>
              <p className="text-sm text-muted-foreground">
                Hunter: {claim.hunter_wallet.slice(0, 8)}...
              </p>
              <p className="text-sm text-muted-foreground">
                Expires: {new Date(claim.expires_at).toLocaleString()}
              </p>
            </div>
          )}

          {/* Submission Info */}
          {submission && (
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <h3 className="text-sm font-medium text-blue-400 mb-2">
                Solution Submitted ({submission.status})
              </h3>
              <p className="text-sm text-white mt-2">{submission.solution}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Confidence: {submission.confidence}%
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-white/10">
          {bounty.status === "open" && (
            <button className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-500 text-white font-medium transition-colors">
              Claim Bounty
            </button>
          )}
          {bounty.status === "claimed" && !submission && (
            <button className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors">
              Submit Solution
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function BountiesPage() {
  const [selectedBountyId, setSelectedBountyId] = useState<string | null>(null);

  // Mock reputation for demo - in real app this would come from API
  const mockReputation: HunterReputation = {
    wallet: "Demo...",
    totalBounties: 12,
    successfulBounties: 10,
    failedBounties: 2,
    totalEarnings: 25.5,
    successRate: 0.83,
    rank: "expert",
    badges: ["first_blood", "speed_demon", "streak_5"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const rankInfo = getRankInfo(mockReputation.rank);
  const stats = formatReputationStats(mockReputation);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Target className="w-8 h-8 text-green-400" /> Bounty Board
          </h1>
          <p className="text-muted-foreground">
            Earn rewards by solving OSINT and research challenges.
          </p>
        </div>
        <button className="h-10 px-6 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium flex items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95">
          <Plus className="w-4 h-4" />
          Post Bounty
        </button>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Rank Card */}
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${rankInfo.color}20` }}
            >
              {rankInfo.emoji}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Your Rank</p>
              <p className="font-bold text-lg" style={{ color: rankInfo.color }}>
                {rankInfo.name}
              </p>
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="font-bold text-lg text-white">{mockReputation.successfulBounties}</p>
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="font-bold text-lg text-white">{stats.winRate}</p>
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Earned</p>
              <p className="font-bold text-lg text-green-400">{stats.earnings}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bounty List */}
      <BountyList onBountyClick={setSelectedBountyId} />

      {/* Bounty Detail Modal */}
      <AnimatePresence>
        {selectedBountyId && (
          <BountyDetailModal
            bountyId={selectedBountyId}
            onClose={() => setSelectedBountyId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
