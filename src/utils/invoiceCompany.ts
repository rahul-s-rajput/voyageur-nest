import type { Property } from '../types/property';

export interface InvoiceCompany {
  name: string;
  address: string;
  phone: string;
  email: string;
}

/**
 * Build the company header for an invoice from the booking's property, so each
 * property's invoices show ITS own name/address/contact — not a hardcoded one.
 * Missing fields fall back to empty rather than another property's details.
 */
export function getInvoiceCompany(property?: Property | null): InvoiceCompany {
  return {
    name: property?.name || 'Voyageur Nest',
    address: property?.address || property?.location || '',
    phone: property?.contactPhone || property?.phone || '',
    email: property?.contactEmail || property?.email || '',
  };
}
