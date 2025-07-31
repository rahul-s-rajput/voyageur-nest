export interface InvoiceData {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  invoiceNumber: string;
  guestName: string;
  billTo: string;
  address: string;
  companyNameBillTo: string;
  billToRegNo: string;
  date: string;
  noOfPax: number;
  adultChild: string;
  grCardNo: string;
  roomNo: string;
  numberOfRooms: number;
  dateOfArrival: string;
  dateOfDeparture: string;
  timeOfArrival: string;
  timeOfDeparture: string;
  noOfDays: number;
  grandTotal: number;
  paymentAmount: number;
  paymentMethod: string;
}

export interface CancellationInvoiceData {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  invoiceNumber: string;
  guestName: string;
  billTo: string;
  address: string;
  companyNameBillTo: string;
  billToRegNo: string;
  date: string;
  noOfPax: number;
  adultChild: string;
  grCardNo: string;
  roomNo: string;
  numberOfRooms: number;
  dateOfArrival: string;
  dateOfDeparture: string;
  timeOfArrival: string;
  timeOfDeparture: string;
  noOfDays: number;
  originalBookingAmount: number;
  totalPaid: number;
  cancellationCharges: number;
  paymentMethod: string;
  bookingDate: string;
  cancellationDate: string;
  cancellationReason: string;
}