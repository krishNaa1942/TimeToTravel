/**
 * useBudgetPlanner Hook
 * Manages budget calculation state, validation, and API calls
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { budgetService } from "@/services/budget";
import { destinationsService } from "@/services/destinations";
import { BudgetEstimate, Destination } from "@/types";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type TravelClass = "economy" | "comfort" | "premium";

export interface BudgetFormData {
  destination: string;
  days: string;
  familySize: string;
  travelClass: TravelClass;
}

export interface FieldErrors {
  destination?: string;
  days?: string;
  familySize?: string;
}

interface UseBudgetPlannerProps {
  preselectedDestination?: string;
}

interface UseBudgetPlannerReturn {
  // Form State
  formData: BudgetFormData;
  setFormData: React.Dispatch<React.SetStateAction<BudgetFormData>>;
  updateField: <K extends keyof BudgetFormData>(field: K, value: BudgetFormData[K]) => void;
  
  // Validation
  fieldErrors: FieldErrors;
  validateForm: () => boolean;
  
  // Destinations
  destinations: Destination[];
  isLoadingDestinations: boolean;
  
  // Budget Calculation
  estimate: BudgetEstimate | null;
  isCalculating: boolean;
  calculationError: string | null;
  calculateBudget: () => Promise<void>;
  clearEstimate: () => void;
  
  // Insights
  insights: BudgetInsights | null;
  
  // Reset
  reset: () => void;
}

export interface BudgetInsights {
  mostExpensiveCategory: string;
  mostExpensiveAmount: number;
  cheapestCategory: string;
  cheapestAmount: number;
  dailyAverage: number;
  perPersonCost: number;
  tips: string[];
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

const validateDays = (value: string): string | undefined => {
  const num = parseInt(value, 10);
  if (isNaN(num) || value.trim() === "") return "Enter number of days";
  if (num <= 0) return "Days must be at least 1";
  if (num > 365) return "Maximum 365 days allowed";
  return undefined;
};

const validateFamilySize = (value: string): string | undefined => {
  const num = parseInt(value, 10);
  if (isNaN(num) || value.trim() === "") return "Enter group size";
  if (num <= 0) return "Group size must be at least 1";
  if (num > 50) return "Maximum 50 people allowed";
  return undefined;
};

const validateDestination = (value: string): string | undefined => {
  if (!value || value.trim() === "") return "Select a destination";
  return undefined;
};

// ─────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────

export function useBudgetPlanner({ preselectedDestination }: UseBudgetPlannerProps = {}): UseBudgetPlannerReturn {
  // Form State
  const [formData, setFormData] = useState<BudgetFormData>({
    destination: preselectedDestination || "",
    days: "3",
    familySize: "2",
    travelClass: "economy",
  });

  // Destinations State
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(!preselectedDestination);

  // Calculation State
  const [estimate, setEstimate] = useState<BudgetEstimate | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  // Field Errors
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Load destinations if not preselected
  useEffect(() => {
    if (!preselectedDestination) {
      loadDestinations();
    }
  }, [preselectedDestination]);

  const loadDestinations = async () => {
    try {
      setIsLoadingDestinations(true);
      const data = await destinationsService.getDestinations();
      setDestinations(data);
      if (data.length > 0 && !formData.destination) {
        setFormData(prev => ({ ...prev, destination: data[0].label }));
      }
    } catch (error) {
      console.error("Failed to load destinations:", error);
    } finally {
      setIsLoadingDestinations(false);
    }
  };

  // Update single field
  const updateField = useCallback(<K extends keyof BudgetFormData>(field: K, value: BudgetFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => new Set(prev).add(field));
    
    // Validate field on change
    let error: string | undefined;
    switch (field) {
      case "days":
        error = validateDays(value as string);
        break;
      case "familySize":
        error = validateFamilySize(value as string);
        break;
      case "destination":
        error = validateDestination(value as string);
        break;
    }
    setFieldErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    const errors: FieldErrors = {
      destination: validateDestination(formData.destination),
      days: validateDays(formData.days),
      familySize: validateFamilySize(formData.familySize),
    };

    setFieldErrors(errors);
    
    // Mark all as touched
    setTouched(new Set(["destination", "days", "familySize"]));
    
    return !errors.destination && !errors.days && !errors.familySize;
  }, [formData]);

  // Calculate budget
  const calculateBudget = useCallback(async () => {
    if (!validateForm()) return;

    setIsCalculating(true);
    setCalculationError(null);
    setEstimate(null);

    try {
      const result = await budgetService.getEstimate(
        formData.destination,
        parseInt(formData.days, 10),
        parseInt(formData.familySize, 10),
        formData.travelClass
      );
      setEstimate(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to calculate budget";
      setCalculationError(message);
    } finally {
      setIsCalculating(false);
    }
  }, [formData, validateForm]);

  // Clear estimate
  const clearEstimate = useCallback(() => {
    setEstimate(null);
    setCalculationError(null);
  }, []);

  // Reset form
  const reset = useCallback(() => {
    setFormData({
      destination: preselectedDestination || "",
      days: "3",
      familySize: "2",
      travelClass: "economy",
    });
    setFieldErrors({});
    setTouched(new Set());
    setEstimate(null);
    setCalculationError(null);
  }, [preselectedDestination]);

  // Calculate insights from estimate
  const insights = useMemo((): BudgetInsights | null => {
    if (!estimate) return null;

    const categories = [
      { name: "Accommodation", amount: estimate.accommodation },
      { name: "Food & Dining", amount: estimate.food },
      { name: "Transport", amount: estimate.transport },
      { name: "Activities", amount: estimate.activities },
      { name: "Miscellaneous", amount: estimate.miscellaneous },
    ];

    const sorted = [...categories].sort((a, b) => b.amount - a.amount);
    const mostExpensive = sorted[0];
    const cheapest = sorted[sorted.length - 1];

    const tips: string[] = [];
    
    if (mostExpensive.name === "Accommodation") {
      tips.push("Consider booking in advance for better rates");
      tips.push("Look for homestays or guesthouses to save up to 40%");
    }
    if (mostExpensive.name === "Transport") {
      tips.push("Book flights early and use local transport");
      tips.push("Consider off-season travel for better deals");
    }
    if (mostExpensive.name === "Food & Dining") {
      tips.push("Try local eateries instead of tourist restaurants");
      tips.push("Street food can save you 60% on meals");
    }
    if (estimate.family_size > 2) {
      tips.push("Group discounts available for activities");
    }
    if (estimate.num_days > 7) {
      tips.push("Weekly stay discounts may be available");
    }

    return {
      mostExpensiveCategory: mostExpensive.name,
      mostExpensiveAmount: mostExpensive.amount,
      cheapestCategory: cheapest.name,
      cheapestAmount: cheapest.amount,
      dailyAverage: Math.round(estimate.total / estimate.num_days),
      perPersonCost: Math.round(estimate.total / estimate.family_size),
      tips,
    };
  }, [estimate]);

  return {
    formData,
    setFormData,
    updateField,
    fieldErrors,
    validateForm,
    destinations,
    isLoadingDestinations,
    estimate,
    isCalculating,
    calculationError,
    calculateBudget,
    clearEstimate,
    insights,
    reset,
  };
}

export default useBudgetPlanner;