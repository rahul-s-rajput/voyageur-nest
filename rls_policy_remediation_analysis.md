# RLS Policy Remediation Analysis

## Security Issues Identified

After analyzing all current RLS policies, **multiple critical security vulnerabilities** were found where conflicting policies create security bypasses. Many tables have both restrictive admin-only policies AND permissive public/anon policies, with the permissive policies taking precedence.

## Access Model Classification

### Tier 1: Public Access Tables
Tables that customers/public should read, limited admin control.

### Tier 2: Mixed Access Tables  
Public can create/read own data, admin has full control.

### Tier 3: Admin-Only Tables
Complete protection, authenticated admin users only.

---

## CRITICAL SECURITY ISSUES (Fix Immediately)

### 🚨 **email_messages** - CRITICAL
**Current Status:** Vulnerable - conflicting policies
**Current Policies:**
- ✅ `Admin only access to email messages` (authenticated)
- ✅ `Deny anon access to email messages` (anon) 
- ❌ `email_messages_delete_all` (public) - **SECURITY BYPASS**
- ❌ `email_messages_insert_all` (public) - **SECURITY BYPASS** 
- ❌ `email_messages_select_all` (public) - **SECURITY BYPASS**
- ❌ `email_messages_update_all` (public) - **SECURITY BYPASS**

**Action:** REMOVE all public policies, keep only admin policies

### 🚨 **email_booking_imports** - CRITICAL  
**Current Status:** Vulnerable - conflicting policies
**Current Policies:**
- ✅ `Admin only access to email booking imports` (authenticated)
- ❌ `email_booking_imports_delete_all` (public) - **SECURITY BYPASS**
- ❌ `email_booking_imports_insert_all` (public) - **SECURITY BYPASS**
- ❌ `email_booking_imports_select_all` (public) - **SECURITY BYPASS** 
- ❌ `email_booking_imports_update_all` (public) - **SECURITY BYPASS**

**Action:** REMOVE all public policies, keep only admin policies

### 🚨 **gmail_tokens** - CRITICAL
**Current Status:** Vulnerable - conflicting policies  
**Current Policies:**
- ✅ `Admin only access to gmail tokens` (authenticated)
- ❌ `gmail_tokens_delete_all` (public) - **SECURITY BYPASS**
- ❌ `gmail_tokens_insert_all` (public) - **SECURITY BYPASS**
- ❌ `gmail_tokens_select_all` (public) - **SECURITY BYPASS**
- ❌ `gmail_tokens_update_all` (public) - **SECURITY BYPASS**

**Action:** REMOVE all public policies, keep only admin policies

### 🚨 **gmail_settings** - CRITICAL
**Current Status:** Vulnerable - conflicting policies
**Current Policies:**
- ✅ `Admin only access to gmail settings` (authenticated) 
- ❌ `gmail_settings_delete_all` (public) - **SECURITY BYPASS**
- ❌ `gmail_settings_insert_all` (public) - **SECURITY BYPASS**
- ❌ `gmail_settings_select_all` (public) - **SECURITY BYPASS**
- ❌ `gmail_settings_update_all` (public) - **SECURITY BYPASS**

**Action:** REMOVE all public policies, keep only admin policies

---

## HIGH PRIORITY SECURITY ISSUES

### 🔶 **expense_*** tables** - HIGH RISK
All expense tables have the same vulnerability pattern:

#### **expenses**
- ✅ `Admin only access to expenses` (authenticated)
- ❌ `expenses_delete_anon` (anon) - **SECURITY BYPASS**
- ❌ `expenses_insert_anon` (anon) - **SECURITY BYPASS**
- ❌ `expenses_select_anon` (anon) - **SECURITY BYPASS**
- ❌ `expenses_update_anon` (anon) - **SECURITY BYPASS**

#### **expense_categories**
- ✅ `Admin only access to expense categories` (authenticated)
- ❌ `expense_categories_delete_anon` (anon) - **SECURITY BYPASS**
- ❌ `expense_categories_insert_anon` (anon) - **SECURITY BYPASS**
- ❌ `expense_categories_select_anon` (anon) - **SECURITY BYPASS**
- ❌ `expense_categories_update_anon` (anon) - **SECURITY BYPASS**

#### **expense_budgets**
- ✅ `Admin only access to expense budgets` (authenticated)
- ❌ `expense_budgets_delete_anon` (anon) - **SECURITY BYPASS**
- ❌ `expense_budgets_insert_anon` (anon) - **SECURITY BYPASS**
- ❌ `expense_budgets_select_anon` (anon) - **SECURITY BYPASS**
- ❌ `expense_budgets_update_anon` (anon) - **SECURITY BYPASS**

#### **expense_line_items**
- ✅ `Admin only access to expense line items` (authenticated)
- ❌ `expense_line_items_delete_anon` (anon) - **SECURITY BYPASS**
- ❌ `expense_line_items_insert_anon` (anon) - **SECURITY BYPASS**
- ❌ `expense_line_items_select_anon` (anon) - **SECURITY BYPASS**
- ❌ `expense_line_items_update_anon` (anon) - **SECURITY BYPASS**

#### **expense_shares**
- ✅ `Admin only access to expense shares` (authenticated)
- ❌ `expense_shares_delete_anon` (anon) - **SECURITY BYPASS**
- ❌ `expense_shares_insert_anon` (anon) - **SECURITY BYPASS**
- ❌ `expense_shares_select_anon` (anon) - **SECURITY BYPASS**
- ❌ `expense_shares_update_anon` (anon) - **SECURITY BYPASS**

**Action for ALL expense tables:** REMOVE all anon policies, keep only admin policies

---

## MEDIUM PRIORITY ISSUES

### 🔸 **calendar_conflicts** - Inconsistent Access
**Current Status:** Mixed - should be admin-only but has public policies
**Current Policies:**
- ✅ `Admin only access to calendar conflicts` (authenticated)
- ❌ `Allow delete access to calendar_conflicts` (public) - **INCONSISTENT**
- ❌ `Allow insert access to calendar_conflicts` (public) - **INCONSISTENT**  
- ❌ `Allow read access to calendar_conflicts` (public) - **INCONSISTENT**
- ❌ `Allow update access to calendar_conflicts` (public) - **INCONSISTENT**

**Action:** REMOVE public policies OR clarify if calendar conflicts need public access

### 🔸 **pricing_rules** - Overly Permissive
**Current Status:** Too open
**Current Policies:**
- ❌ `Allow all users to manage pricing rules` (anon, authenticated) - **TOO PERMISSIVE**

**Action:** CHANGE to admin-only access

---

## TABLES WITH CORRECT POLICIES ✅

### **admin_profiles**
- ✅ Correctly restricted to authenticated users for own profile management

### **bookings** 
- ✅ Proper mixed access (admin full, public create/update/view for check-in)

### **checkin_data**
- ✅ Proper mixed access (admin full, public create/update/view, anon create/update/view)

### **checkin_audit_log**
- ✅ Properly restricted (admin full, staff read)

### **guest_profiles**  
- ✅ Proper mixed access (admin full, public create/update/view, anon create/update/view)

### **menu_items** & **menu_categories**
- ✅ Proper public read access with admin management

### **properties** & **rooms**
- ✅ Proper public read access with admin management

### **user_roles**
- ✅ Properly restricted to admin only with auth admin read

---

## QUESTIONABLE BUT NOT CRITICAL

### **device_tokens**, **email_ai_extractions**, **email_parse_queue**, **email_preview_cache**, **gmail_seen_messages**
- Current: Full public access to all operations
- **Question:** Do these really need full public access for all CRUD operations?
- **Recommendation:** Review if these can be more restrictive

### **notification_*****, **ota_*****, **property_settings**, **invoice_counter**, **manual_update_checklists**, **translations**, **translation_jobs**
- Current: Full public access
- **Recommendation:** Review business requirements to determine if access should be more restrictive

---

## REMEDIATION PRIORITY

### 🚨 **IMMEDIATE (Fix Today)**
1. **email_messages** - Remove public policies
2. **email_booking_imports** - Remove public policies  
3. **gmail_tokens** - Remove public policies
4. **gmail_settings** - Remove public policies

### 🔶 **HIGH (Fix This Week)**  
5. **expense_*** (all 5 tables)** - Remove anon policies
6. **pricing_rules** - Change to admin-only
7. **calendar_conflicts** - Review and fix access model

### 🔸 **MEDIUM (Review & Fix)**
8. Review overly permissive public access tables
9. Audit notification/OTA/utility table access requirements

---

## RECOMMENDED SQL REMEDIATION SCRIPT

```sql
-- CRITICAL: Remove security bypasses for email tables
DROP POLICY IF EXISTS "email_messages_delete_all" ON public.email_messages;
DROP POLICY IF EXISTS "email_messages_insert_all" ON public.email_messages;  
DROP POLICY IF EXISTS "email_messages_select_all" ON public.email_messages;
DROP POLICY IF EXISTS "email_messages_update_all" ON public.email_messages;

DROP POLICY IF EXISTS "email_booking_imports_delete_all" ON public.email_booking_imports;
DROP POLICY IF EXISTS "email_booking_imports_insert_all" ON public.email_booking_imports;
DROP POLICY IF EXISTS "email_booking_imports_select_all" ON public.email_booking_imports;
DROP POLICY IF EXISTS "email_booking_imports_update_all" ON public.email_booking_imports;

DROP POLICY IF EXISTS "gmail_tokens_delete_all" ON public.gmail_tokens;
DROP POLICY IF EXISTS "gmail_tokens_insert_all" ON public.gmail_tokens;
DROP POLICY IF EXISTS "gmail_tokens_select_all" ON public.gmail_tokens;
DROP POLICY IF EXISTS "gmail_tokens_update_all" ON public.gmail_tokens;

DROP POLICY IF EXISTS "gmail_settings_delete_all" ON public.gmail_settings;
DROP POLICY IF EXISTS "gmail_settings_insert_all" ON public.gmail_settings;
DROP POLICY IF EXISTS "gmail_settings_select_all" ON public.gmail_settings; 
DROP POLICY IF EXISTS "gmail_settings_update_all" ON public.gmail_settings;

-- HIGH: Remove security bypasses for expense tables
DROP POLICY IF EXISTS "expenses_delete_anon" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_anon" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_anon" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_anon" ON public.expenses;

DROP POLICY IF EXISTS "expense_categories_delete_anon" ON public.expense_categories;
DROP POLICY IF EXISTS "expense_categories_insert_anon" ON public.expense_categories;
DROP POLICY IF EXISTS "expense_categories_select_anon" ON public.expense_categories;
DROP POLICY IF EXISTS "expense_categories_update_anon" ON public.expense_categories;

DROP POLICY IF EXISTS "expense_budgets_delete_anon" ON public.expense_budgets;
DROP POLICY IF EXISTS "expense_budgets_insert_anon" ON public.expense_budgets;
DROP POLICY IF EXISTS "expense_budgets_select_anon" ON public.expense_budgets;
DROP POLICY IF EXISTS "expense_budgets_update_anon" ON public.expense_budgets;

DROP POLICY IF EXISTS "expense_line_items_delete_anon" ON public.expense_line_items;
DROP POLICY IF EXISTS "expense_line_items_insert_anon" ON public.expense_line_items;
DROP POLICY IF EXISTS "expense_line_items_select_anon" ON public.expense_line_items;
DROP POLICY IF EXISTS "expense_line_items_update_anon" ON public.expense_line_items;

DROP POLICY IF EXISTS "expense_shares_delete_anon" ON public.expense_shares;
DROP POLICY IF EXISTS "expense_shares_insert_anon" ON public.expense_shares;
DROP POLICY IF EXISTS "expense_shares_select_anon" ON public.expense_shares;
DROP POLICY IF EXISTS "expense_shares_update_anon" ON public.expense_shares;

-- MEDIUM: Fix pricing rules
DROP POLICY IF EXISTS "Allow all users to manage pricing rules" ON public.pricing_rules;
CREATE POLICY "Admin only access to pricing rules" ON public.pricing_rules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
```

## SUMMARY

**Total Tables Analyzed:** 43  
**Critical Security Issues:** 4 tables  
**High Priority Issues:** 6 tables  
**Medium Priority Issues:** 2 tables  
**Correctly Configured:** 8+ tables  

**Key Finding:** Multiple tables have conflicting RLS policies where permissive policies override restrictive ones, creating significant security vulnerabilities.
