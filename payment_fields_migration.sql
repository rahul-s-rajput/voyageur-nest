-- Migration to add payment fields to bookings table
-- Run this in your Supabase SQL editor

-- Add payment_amount column
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2) DEFAULT 0;

-- Add payment_mode column  
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_mode TEXT;

-- Update existing records to set payment_amount based on payment_status
-- For 'paid' records, set payment_amount to total_amount
UPDATE public.bookings 
SET payment_amount = total_amount 
WHERE payment_status = 'paid' AND payment_amount IS NULL;

-- For 'partial' records, set payment_amount to half of total_amount (you can adjust this logic)
UPDATE public.bookings 
SET payment_amount = total_amount * 0.5 
WHERE payment_status = 'partial' AND payment_amount IS NULL;

-- For 'unpaid' records, ensure payment_amount is 0
UPDATE public.bookings 
SET payment_amount = 0 
WHERE payment_status = 'unpaid' AND payment_amount IS NULL; 