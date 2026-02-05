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
// Individual Enum Hooks
// =============================================================================

/**
 * Get order item status options for Select components.
 */
export function useOrderItemStatusOptions(): {
  options: SelectOption[];
  isLoading: boolean;
  getLabel: (value: string) => string;
} {
  const { data, isLoading } = useEnums();

  const options = useMemo(
    () => toSelectOptions(data?.orderItemStatus),
    [data?.orderItemStatus]
  );

  const getLabel = useMemo(() => {
    return (value: string) => data?.orderItemStatus?.labels[value] || value;
  }, [data?.orderItemStatus]);

  return { options, isLoading, getLabel };
}

/**
 * Get customer pay status options for Select components.
 */
export function useCustomerPayStatusOptions(): {
  options: SelectOption[];
  isLoading: boolean;
  getLabel: (value: string) => string;
} {
  const { data, isLoading } = useEnums();

  const options = useMemo(
    () => toSelectOptions(data?.customerPayStatus),
    [data?.customerPayStatus]
  );

  const getLabel = useMemo(() => {
    return (value: string) => data?.customerPayStatus?.labels[value] || value;
  }, [data?.customerPayStatus]);

  return { options, isLoading, getLabel };
}

/**
 * Get payment method options for Select components.
 */
export function usePaymentMethodOptions(): {
  options: SelectOption[];
  isLoading: boolean;
  getLabel: (value: string) => string;
} {
  const { data, isLoading } = useEnums();

  const options = useMemo(
    () => toSelectOptions(data?.paymentMethod),
    [data?.paymentMethod]
  );

  const getLabel = useMemo(() => {
    return (value: string) => data?.paymentMethod?.labels[value] || value;
  }, [data?.paymentMethod]);

  return { options, isLoading, getLabel };
}

/**
 * Get quote status options for Select components.
 */
export function useQuoteStatusOptions(): {
  options: SelectOption[];
  isLoading: boolean;
  getLabel: (value: string) => string;
} {
  const { data, isLoading } = useEnums();

  const options = useMemo(
    () => toSelectOptions(data?.quoteStatus),
    [data?.quoteStatus]
  );

  const getLabel = useMemo(() => {
    return (value: string) => data?.quoteStatus?.labels[value] || value;
  }, [data?.quoteStatus]);

  return { options, isLoading, getLabel };
}

/**
 * Get supplier status options for Select components.
 */
export function useSupplierStatusOptions(): {
  options: SelectOption[];
  isLoading: boolean;
  getLabel: (value: string) => string;
} {
  const { data, isLoading } = useEnums();

  const options = useMemo(
    () => toSelectOptions(data?.supplierStatus),
    [data?.supplierStatus]
  );

  const getLabel = useMemo(() => {
    return (value: string) => data?.supplierStatus?.labels[value] || value;
  }, [data?.supplierStatus]);

  return { options, isLoading, getLabel };
}

/**
 * Get settle type options for Select components.
 */
export function useSettleTypeOptions(): {
  options: SelectOption[];
  isLoading: boolean;
  getLabel: (value: string) => string;
} {
  const { data, isLoading } = useEnums();

  const options = useMemo(
    () => toSelectOptions(data?.settleType),
    [data?.settleType]
  );

  const getLabel = useMemo(() => {
    return (value: string) => data?.settleType?.labels[value] || value;
  }, [data?.settleType]);

  return { options, isLoading, getLabel };
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
