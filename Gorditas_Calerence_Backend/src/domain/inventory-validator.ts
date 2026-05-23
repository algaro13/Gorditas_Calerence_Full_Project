/**
 * Pure domain function: validates inventory availability.
 * No external dependencies.
 */

export interface InventoryValidationResult {
  available: boolean;
  reason?: string;
}

export function validateInventoryAvailability(
  currentStock: number,
  requestedQuantity: number
): InventoryValidationResult {
  if (currentStock >= requestedQuantity) {
    return { available: true };
  }

  return {
    available: false,
    reason: 'Stock insuficiente',
  };
}
