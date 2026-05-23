/**
 * Pure domain function: validates order status transitions based on user role.
 * No external dependencies (no Mongoose, no Express).
 */

const validTransitions: Record<string, Record<string, string[]>> = {
  Mesero: {
    Pendiente: ['Recepcion'],
    Recepcion: ['Preparacion', 'Surtida', 'Entregada'],
    Preparacion: ['Surtida', 'Recepcion'],
    Surtida: ['Entregada', 'Pagada', 'Recepcion'],
    Entregada: ['Pagada', 'Recepcion'],
  },
  Despachador: {
    Recepcion: ['Preparacion', 'Surtida', 'Entregada'],
    Preparacion: ['Surtida'],
    Surtida: ['Entregada'],
  },
  Encargado: {
    Pendiente: ['Recepcion'],
    Recepcion: ['Preparacion', 'Surtida', 'Entregada'],
    Preparacion: ['Surtida', 'Recepcion'],
    Surtida: ['Entregada', 'Pagada', 'Recepcion'],
    Entregada: ['Pagada', 'Recepcion'],
  },
  Empleado: {
    Pendiente: ['Recepcion'],
    Recepcion: ['Preparacion', 'Surtida', 'Entregada'],
    Preparacion: ['Surtida', 'Recepcion'],
    Surtida: ['Entregada', 'Pagada', 'Recepcion'],
    Entregada: ['Pagada', 'Recepcion'],
  },
  Cocinero: {
    Recepcion: ['Preparacion', 'Surtida', 'Entregada'],
    Preparacion: ['Surtida'],
  },
  Admin: {
    Pendiente: ['Recepcion'],
    Recepcion: ['Preparacion', 'Surtida', 'Entregada'],
    Preparacion: ['Surtida', 'Recepcion'],
    Surtida: ['Entregada', 'Pagada', 'Recepcion'],
    Entregada: ['Pagada', 'Recepcion'],
  },
};

export function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
  userRole: string
): boolean {
  // Admin can change any status
  if (userRole === 'Admin') {
    return true;
  }

  const roleTransitions = validTransitions[userRole];
  if (!roleTransitions) {
    return false;
  }

  const allowedStatuses = roleTransitions[currentStatus];
  return allowedStatuses ? allowedStatuses.includes(newStatus) : false;
}
