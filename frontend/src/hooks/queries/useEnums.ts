/**
 * TanStack Query hooks for system enums.
 * Enums are cached globally with infinite stale time since they rarely change.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { systemApi } from '@/api';
import type { SystemEnumsResponse, EnumDefinition } from '@/types';

// =============================================================================
// Query Keys
// =============================================================================

export const enumKeys = {
  all: ['enums'] as const,
  system: () => [...enumKeys.all, 'system'] as const,
};

// =============================================================================
// Query Options
// =============================================================================

const ENUM_STALE_TIME = Infinity; // Enums never go stale during a session
const ENUM_GC_TIME = 1000 * 60 * 60; // Keep in cache for 1 hour

// =============================================================================
// Main Hook
// =============================================================================

/**
 * Fetch all system enums. Data is cached for the entire session.
 */
export function useEnums() {
  return useQuery({
    queryKey: enumKeys.system(),
    queryFn: () => systemApi.getEnums(),
    staleTime: ENUM_STALE_TIME,
    gcTime: ENUM_GC_TIME,
  });
}

// =============================================================================
// Helper Types
// =============================================================================

/** Option format for Ant Design Select component. */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Convert an EnumDefinition to an array of SelectOption.
 */
function toSelectOptions(enumDef: EnumDefinition | undefined): SelectOption[] {
  if (!enumDef) return [];

  return enumDef.values.map((value) => ({
    value,
    label: enumDef.labels[value] || value,
  }));
}

// =============================================================================
// Enum Options Hook Return Type
// =============================================================================

interface EnumOptionsResult {
  options: SelectOption[];
  isLoading: boolean;
  getLabel: (value: string) => string;
}

// =============================================================================
// Factory Hook for Enum Options
// =============================================================================

/**
 * Generic hook factory for creating enum option hooks.
 * Reduces code duplication across individual enum hooks.
 */
function useEnumOptions(
  selector: (data: SystemEnumsResponse | undefined) => EnumDefinition | undefined
): EnumOptionsResult {
  const { data, isLoading } = useEnums();

  const enumDef = selector(data);

  const options = useMemo(() => toSelectOptions(enumDef), [enumDef]);

  const getLabel = useMemo(() => {
    return (value: string) => enumDef?.labels[value] || value;
  }, [enumDef]);

  return { options, isLoading, getLabel };
}

// =============================================================================
// Individual Enum Hooks
// =============================================================================

/** Get order item status options for Select components. */
export function useOrderItemStatusOptions(): EnumOptionsResult {
  return useEnumOptions((data) => data?.orderItemStatus);
}

/** Get customer pay status options for Select components. */
export function useCustomerPayStatusOptions(): EnumOptionsResult {
  return useEnumOptions((data) => data?.customerPayStatus);
}

/** Get payment method options for Select components. */
export function usePaymentMethodOptions(): EnumOptionsResult {
  return useEnumOptions((data) => data?.paymentMethod);
}

/** Get quote status options for Select components. */
export function useQuoteStatusOptions(): EnumOptionsResult {
  return useEnumOptions((data) => data?.quoteStatus);
}

/** Get supplier status options for Select components. */
export function useSupplierStatusOptions(): EnumOptionsResult {
  return useEnumOptions((data) => data?.supplierStatus);
}

/** Get settle type options for Select components. */
export function useSettleTypeOptions(): EnumOptionsResult {
  return useEnumOptions((data) => data?.settleType);
}

/**
 * Get all enum data directly. Useful when you need multiple enums at once.
 */
export function useAllEnums(): {
  data: SystemEnumsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const { data, isLoading, isError } = useEnums();
  return { data, isLoading, isError };
}
