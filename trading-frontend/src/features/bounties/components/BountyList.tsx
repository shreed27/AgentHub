"use client";

import { useState } from "react";
import { Search, Filter, Loader2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBounties, BountyFilters } from "../hooks/useBounties";
import { BountyCard } from "./BountyCard";

interface BountyListProps {
  onBountyClick?: (bountyId: string) => void;
}

const statusOptions = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "claimed", label: "Claimed" },
  { value: "submitted", label: "In Review" },
  { value: "completed", label: "Completed" },
];

const difficultyOptions = [
  { value: "", label: "All Difficulties" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "expert", label: "Expert" },
];

export function BountyList({ onBountyClick }: BountyListProps) {
  const [filters, setFiltersState] = useState<BountyFilters>({ status: "open" });
  const [searchQuery, setSearchQuery] = useState("");
  const { bounties, total, page, perPage, isLoading, error, refetch, setFilters } = useBounties(filters);

  const handleFilterChange = (key: keyof BountyFilters, value: string) => {
    const newFilters = { ...filters, [key]: value, page: 1 };
    setFiltersState(newFilters);
    setFilters(newFilters);
  };

  const handlePageChange = (newPage: number) => {
    const newFilters = { ...filters, page: newPage };
    setFiltersState(newFilters);
    setFilters(newFilters);
  };

  const totalPages = Math.ceil(total / perPage);

  // Filter bounties by search query (client-side)
  const filteredBounties = searchQuery
    ? bounties.filter(b =>
        b.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : bounties;

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search bounties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:border-white/20 transition-colors"
          />
        </div>

        {/* Status Filter */}
        <select
          value={filters.status || ""}
          onChange={(e) => handleFilterChange("status", e.target.value)}
          className="h-10 px-4 rounded-lg bg-white/5 border border-white/10 text-sm outline-none cursor-pointer"
        >
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Difficulty Filter */}
        <select
          value={filters.difficulty || ""}
          onChange={(e) => handleFilterChange("difficulty", e.target.value)}
          className="h-10 px-4 rounded-lg bg-white/5 border border-white/10 text-sm outline-none cursor-pointer"
        >
          {difficultyOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Refresh */}
        <button
          onClick={refetch}
          disabled={isLoading}
          className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4 text-muted-foreground", isLoading && "animate-spin")} />
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && bounties.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredBounties.length > 0 ? (
        <>
          {/* Bounty Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBounties.map((bounty, i) => (
              <BountyCard
                key={bounty.id}
                bounty={bounty}
                index={i}
                onClick={onBountyClick ? () => onBountyClick(bounty.id) : undefined}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-muted-foreground px-4">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Filter className="w-12 h-12 mb-4 opacity-50" />
          <p>No bounties found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}

export default BountyList;
