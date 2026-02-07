"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

export interface Bounty {
  id: string;
  question: string;
  description?: string;
  reward: { amount: number; token: string };
  poster_wallet: string;
  status: string;
  difficulty: string;
  tags: string[];
  deadline: string;
  created_at: string;
}

export interface BountyFilters {
  status?: string;
  difficulty?: string;
  tags?: string;
  page?: number;
  per_page?: number;
}

interface UseBountiesResult {
  bounties: Bounty[];
  total: number;
  page: number;
  perPage: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setFilters: (filters: BountyFilters) => void;
}

export function useBounties(initialFilters?: BountyFilters): UseBountiesResult {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [filters, setFilters] = useState<BountyFilters>(initialFilters || {});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBounties = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.getBounties({
        ...filters,
        page: filters.page || page,
        per_page: filters.per_page || perPage,
      });

      if (response.success && response.data) {
        setBounties(response.data.bounties);
        setTotal(response.data.total);
        setPage(response.data.page);
        setPerPage(response.data.per_page);
      } else {
        setError(response.error || "Failed to fetch bounties");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch bounties");
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, perPage]);

  useEffect(() => {
    fetchBounties();
  }, [fetchBounties]);

  return {
    bounties,
    total,
    page,
    perPage,
    isLoading,
    error,
    refetch: fetchBounties,
    setFilters,
  };
}

interface UseBountyResult {
  bounty: Bounty | null;
  claim: {
    id: string;
    hunter_wallet: string;
    claimed_at: string;
    expires_at: string;
  } | null;
  submission: {
    id: string;
    hunter_wallet: string;
    solution: string;
    confidence: number;
    status: string;
  } | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  claimBounty: (hunterWallet: string) => Promise<boolean>;
  submitSolution: (solution: string, confidence: number, hunterWallet: string) => Promise<boolean>;
}

export function useBounty(bountyId: string): UseBountyResult {
  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [claim, setClaim] = useState<UseBountyResult["claim"]>(null);
  const [submission, setSubmission] = useState<UseBountyResult["submission"]>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBounty = useCallback(async () => {
    if (!bountyId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.getBountyById(bountyId);

      if (response.success && response.data) {
        setBounty(response.data.bounty);
        setClaim(response.data.claim);
        setSubmission(response.data.submission);
      } else {
        setError(response.error || "Failed to fetch bounty");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch bounty");
    } finally {
      setIsLoading(false);
    }
  }, [bountyId]);

  useEffect(() => {
    fetchBounty();
  }, [fetchBounty]);

  const claimBounty = async (hunterWallet: string): Promise<boolean> => {
    try {
      const response = await api.claimBounty(bountyId, hunterWallet);
      if (response.success) {
        await fetchBounty();
        return true;
      }
      setError(response.error || "Failed to claim bounty");
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim bounty");
      return false;
    }
  };

  const submitSolution = async (
    solution: string,
    confidence: number,
    hunterWallet: string
  ): Promise<boolean> => {
    try {
      const response = await api.submitSolution(bountyId, {
        solution,
        confidence,
        hunter_wallet: hunterWallet,
      });
      if (response.success) {
        await fetchBounty();
        return true;
      }
      setError(response.error || "Failed to submit solution");
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit solution");
      return false;
    }
  };

  return {
    bounty,
    claim,
    submission,
    isLoading,
    error,
    refetch: fetchBounty,
    claimBounty,
    submitSolution,
  };
}
