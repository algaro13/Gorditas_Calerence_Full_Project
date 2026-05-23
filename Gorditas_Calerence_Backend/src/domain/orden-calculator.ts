/**
 * Pure domain function: calculates order total from item importes.
 * No external dependencies.
 */

export function calculateOrdenTotal(
  productImportes: number[],
  platilloImportes: number[],
  extraImportes: number[]
): number {
  const productosTotal = productImportes.reduce((sum, val) => sum + val, 0);
  const platillosTotal = platilloImportes.reduce((sum, val) => sum + val, 0);
  const extrasTotal = extraImportes.reduce((sum, val) => sum + val, 0);

  return productosTotal + platillosTotal + extrasTotal;
}
