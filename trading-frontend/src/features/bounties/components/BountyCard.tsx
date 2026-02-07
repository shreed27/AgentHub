"use client";

import { motion } from "framer-motion";
import { Clock, Tag, DollarSign, User, ChevronRight, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Bounty } from "../hooks/useBounties";

interface BountyCardProps {
  bounty: Bounty;
  onClick?: () => void;
  index?: number;
}

const difficultyColors: Record<string, { bg: string; text: string }> = {
  easy: { bg: "bg-green-500/10", text: "text-green-400" },
  medium: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  hard: { bg: "bg-orange-500/10", text: "text-orange-400" },
  expert: { bg: "bg-red-500/10", text: "text-red-400" },
};

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  open: { icon: CheckCircle, color: "text-green-400", label: "Open" },
  claimed: { icon: AlertCircle, color: "text-yellow-400", label: "Claimed" },
  submitted: { icon: Clock, color: "text-blue-400", label: "In Review" },
  completed: { icon: CheckCircle, color: "text-purple-400", label: "Completed" },
  expired: { icon: XCircle, color: "text-gray-400", label: "Expired" },
  cancelled: { icon: XCircle, color: "text-red-400", label: "Cancelled" },
};

function truncateWallet(wallet: string): string {
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

function formatDeadline(deadline: string): string {
  const date = new Date(deadline);
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff < 0) return "Expired";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  return "< 1h left";
}

export function BountyCard({ bounty, onClick, index = 0 }: BountyCardProps) {
  const difficulty = difficultyColors[bounty.difficulty] || difficultyColors.medium;
  const status = statusConfig[bounty.status] || statusConfig.open;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={cn(
        "group relative p-5 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md",
        "hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300",
        onClick && "cursor-pointer"
      )}
    >
      {/* Status Badge */}
      <div className="absolute top-4 right-4">
        <div className={cn("flex items-center gap-1.5 text-xs font-medium", status.color)}>
          <StatusIcon className="w-3.5 h-3.5" />
          {status.label}
        </div>
      </div>

      {/* Question */}
      <h3 className="font-semibold text-white pr-20 mb-3 line-clamp-2 group-hover:text-blue-300 transition-colors">
        {bounty.question}
      </h3>

      {/* Description Preview */}
      {bounty.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {bounty.description}
        </p>
      )}

      {/* Reward */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
          <DollarSign className="w-4 h-4 text-green-400" />
          <span className="text-sm font-bold text-green-400">
            {bounty.reward.amount} {bounty.reward.token}
          </span>
        </div>
        <div className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase", difficulty.bg, difficulty.text)}>
          {bounty.difficulty}
        </div>
      </div>

      {/* Tags */}
      {bounty.tags && bounty.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {bounty.tags.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-white/5 text-muted-foreground"
            >
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
          {bounty.tags.length > 3 && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-muted-foreground">
              +{bounty.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {truncateWallet(bounty.poster_wallet)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDeadline(bounty.deadline)}
          </span>
        </div>
        {onClick && (
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-white group-hover:translate-x-1 transition-all" />
        )}
      </div>
    </motion.div>
  );
}

export default BountyCard;
