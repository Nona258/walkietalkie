-- Migration: Add is_approved column to users table for admin approval workflow
-- Run this in your Supabase SQL editor or psql against the DB

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;

-- Notes:
--  - `is_approved` is a boolean column that defaults to false
--  - New users will be unapproved by default and need admin approval
--  - Admins can approve users through the User Management modal
--  - Unapproved users cannot sign in
