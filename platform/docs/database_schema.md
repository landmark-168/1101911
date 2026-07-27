# Database Schema Documentation (POS System)

This document serves as the reference for the finalized Entity-Relationship (ER) design of the Point of Sale (POS) multi-tenant system.

## Core Entities

### 1. USERS
- `id` (uuid, PK)
- `email` (string)
- `full_name` (string)
- `role` (string)
- `created_at` (datetime)

### 2. STORES (Multi-tenant Root)
- `id` (uuid, PK)
- `owner_id` (uuid, FK -> USERS)
- `store_name` (string)
- `phone` (string)
- `address` (string)
- `logo` (string)
- `status` (string)

### 3. EMPLOYEES
- `id` (uuid, PK)
- `store_id` (uuid, FK -> STORES)
- `user_id` (uuid, FK -> USERS)
- `full_name` (string)
- `position` (string)
- `pin_code` (string) - For POS terminal login
- `status` (string)

## Menu & Inventory

### 4. CATEGORIES
- `id` (uuid, PK)
- `store_id` (uuid, FK -> STORES)
- `category_name` (string)

### 5. MENUS
- `id` (uuid, PK)
- `store_id` (uuid, FK -> STORES)
- `category_id` (uuid, FK -> CATEGORIES)
- `menu_name` (string)
- `price` (decimal)
- `image` (string)
- `is_available` (boolean)
- `deleted_at` (datetime) - Soft Delete to preserve historical orders

### 6. INVENTORY
*(Note: If recipe-based inventory is needed, consider splitting into `INGREDIENTS` and `MENU_RECIPES`)*
- `id` (uuid, PK)
- `store_id` (uuid, FK -> STORES)
- `menu_id` (uuid, FK -> MENUS)
- `ingredient_name` (string)
- `quantity` (decimal)
- `unit` (string)

## Sales & Ordering

### 7. CUSTOMERS
- `id` (uuid, PK)
- `store_id` (uuid, FK -> STORES)
- `name` (string)
- `phone` (string)
- `email` (string)
- `points` (int)

### 8. PROMOTIONS
- `id` (uuid, PK)
- `store_id` (uuid, FK -> STORES)
- `promotion_name` (string)
- `discount_type` (string)
- `discount_value` (decimal)
- `start_date` (date)
- `end_date` (date)

### 9. TABLES
- `id` (uuid, PK)
- `store_id` (uuid, FK -> STORES)
- `table_number` (string)
- `status` (string)

### 10. ORDERS
- `id` (uuid, PK)
- `store_id` (uuid, FK -> STORES)
- `customer_id` (uuid, FK -> CUSTOMERS)
- `employee_id` (uuid, FK -> EMPLOYEES)
- `table_id` (uuid, FK -> TABLES)
- `order_number` (string)
- `order_type` (string)
- `subtotal` (decimal)
- `discount` (decimal)
- `service_charge` (decimal)
- `vat` (decimal)
- `grand_total` (decimal)
- `status` (string)
- `created_at` (datetime)
- `updated_at` (datetime)

### 11. ORDER_ITEMS
- `id` (uuid, PK)
- `order_id` (uuid, FK -> ORDERS)
- `menu_id` (uuid, FK -> MENUS)
- `quantity` (int)
- `price` (decimal) - Historical price snapshot
- `discount` (decimal)
- `subtotal` (decimal)
- `note` (string)

### 12. PAYMENTS
- `id` (uuid, PK)
- `order_id` (uuid, FK -> ORDERS)
- `method` (string)
- `amount` (decimal)
- `status` (string)
- `transaction_id` (string)
- `reference_no` (string)
- `paid_at` (datetime)

### 13. KITCHEN_ORDERS
- `id` (uuid, PK)
- `order_id` (uuid, FK -> ORDERS)
- `queue_number` (string)
- `status` (string)
- `updated_at` (datetime)

### 14. DELIVERY_ORDERS
- `id` (uuid, PK)
- `order_id` (uuid, FK -> ORDERS)
- `driver_name` (string)
- `status` (string)
- `delivered_at` (datetime)

## Security & Logs

### 15. AUDIT_LOGS
- `id` (uuid, PK)
- `store_id` (uuid, FK -> STORES)
- `user_id` (uuid, FK -> USERS)
- `action` (string)
- `table_name` (string)
- `created_at` (datetime)
