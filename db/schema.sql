-- MySQL schema for persistent storage used by the Tailadmin app.
-- Uses InnoDB and utf8mb4 for broad character support.

CREATE DATABASE IF NOT EXISTS tailadmin
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE tailadmin;

-- Customers managed in Admin > Customers.
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(64) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Admin-managed labor units of measure.
CREATE TABLE IF NOT EXISTS labor_units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Admin-managed labor sections.
CREATE TABLE IF NOT EXISTS labor_sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Labor budget catalog items used by the calculator and wizard.
CREATE TABLE IF NOT EXISTS labor_items (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  hours_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
  rate_per_hour DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit_of_measure VARCHAR(100) NOT NULL,
  section VARCHAR(100) NOT NULL,
  reference_architecture VARCHAR(100) NOT NULL,
  description TEXT NULL,
  tooltip TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Solution-based labor calculator data.
CREATE TABLE IF NOT EXISTS labor_solutions (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  overhead_percent DECIMAL(6,2) NOT NULL DEFAULT 10,
  contingency_percent DECIMAL(6,2) NOT NULL DEFAULT 5,
  created_date DATE NULL,
  last_modified DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS labor_solution_items (
  id VARCHAR(64) PRIMARY KEY,
  solution_id VARCHAR(64) NOT NULL,
  catalog_item_id VARCHAR(64) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  hours_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
  rate_per_hour DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_labor_solution_items_solution
    FOREIGN KEY (solution_id) REFERENCES labor_solutions(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_labor_solution_items_catalog
    FOREIGN KEY (catalog_item_id) REFERENCES labor_items(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Wizard draft state (single active draft per user in the current app).
CREATE TABLE IF NOT EXISTS labor_wizard_drafts (
  id VARCHAR(64) PRIMARY KEY,
  customer_id VARCHAR(64) NULL,
  job_name VARCHAR(255) NULL,
  notes TEXT NULL,
  active_solution_id VARCHAR(64) NULL,
  project_management_percent DECIMAL(6,2) NOT NULL DEFAULT 10,
  project_management_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  project_management_rate_per_hour DECIMAL(10,2) NOT NULL DEFAULT 225,
  project_management_notes TEXT NULL,
  adoption_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  adoption_rate_per_hour DECIMAL(10,2) NOT NULL DEFAULT 175,
  adoption_notes TEXT NULL,
  created_date DATE NULL,
  last_modified DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_labor_wizard_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS labor_wizard_solutions (
  id VARCHAR(64) PRIMARY KEY,
  draft_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  overhead_percent DECIMAL(6,2) NOT NULL DEFAULT 10,
  contingency_percent DECIMAL(6,2) NOT NULL DEFAULT 5,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_labor_wizard_solutions_draft
    FOREIGN KEY (draft_id) REFERENCES labor_wizard_drafts(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS labor_wizard_items (
  id VARCHAR(64) PRIMARY KEY,
  solution_id VARCHAR(64) NOT NULL,
  catalog_item_id VARCHAR(64) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  hours_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
  rate_per_hour DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_labor_wizard_items_solution
    FOREIGN KEY (solution_id) REFERENCES labor_wizard_solutions(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_labor_wizard_items_catalog
    FOREIGN KEY (catalog_item_id) REFERENCES labor_items(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Reusable solution blueprints for the wizard.
CREATE TABLE IF NOT EXISTS solution_blueprints (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  overhead_percent DECIMAL(6,2) NOT NULL DEFAULT 10,
  contingency_percent DECIMAL(6,2) NOT NULL DEFAULT 5,
  project_management_percent DECIMAL(6,2) NOT NULL DEFAULT 10,
  project_management_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  project_management_rate_per_hour DECIMAL(10,2) NOT NULL DEFAULT 225,
  project_management_notes TEXT NULL,
  adoption_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  adoption_rate_per_hour DECIMAL(10,2) NOT NULL DEFAULT 175,
  adoption_notes TEXT NULL,
  created_date DATE NULL,
  last_modified DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS solution_blueprint_items (
  id VARCHAR(64) PRIMARY KEY,
  blueprint_id VARCHAR(64) NOT NULL,
  catalog_item_id VARCHAR(64) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  hours_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
  rate_per_hour DECIMAL(10,2) NOT NULL DEFAULT 0,
  catalog_snapshot JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_solution_blueprint_items_blueprint
    FOREIGN KEY (blueprint_id) REFERENCES solution_blueprints(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_solution_blueprint_items_catalog
    FOREIGN KEY (catalog_item_id) REFERENCES labor_items(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Pricing unit options used by MSP services.
CREATE TABLE IF NOT EXISTS pricing_units (
  id VARCHAR(64) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  suffix VARCHAR(50) NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Quotes created from the labor calculator.
CREATE TABLE IF NOT EXISTS quotes (
  id VARCHAR(64) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  notes TEXT NULL,
  service VARCHAR(100) NULL,
  number_of_users INT NOT NULL DEFAULT 0,
  duration_months INT NOT NULL DEFAULT 0,
  monthly_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  setup_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_hours DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_date DATE NULL,
  created_time VARCHAR(32) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quote_work_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  quote_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  reference_architecture VARCHAR(100) NULL,
  section VARCHAR(100) NULL,
  unit_of_measure VARCHAR(100) NULL,
  closet_count INT NOT NULL DEFAULT 0,
  switch_count DECIMAL(10,2) NOT NULL DEFAULT 0,
  hours_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
  rate_per_hour DECIMAL(10,2) NOT NULL DEFAULT 0,
  line_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  solution_name VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_quote_work_items_quote
    FOREIGN KEY (quote_id) REFERENCES quotes(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quote_labor_groups (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  quote_id VARCHAR(64) NOT NULL,
  section VARCHAR(100) NOT NULL,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  items INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_quote_labor_groups_quote
    FOREIGN KEY (quote_id) REFERENCES quotes(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quote_selected_options (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  quote_id VARCHAR(64) NOT NULL,
  option_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  monthly_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  pricing_unit VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_quote_selected_options_quote
    FOREIGN KEY (quote_id) REFERENCES quotes(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- User management (Admin > Users).
CREATE TABLE IF NOT EXISTS admin_users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role ENUM('admin','manager','user') NOT NULL DEFAULT 'user',
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  department VARCHAR(255) NULL,
  join_date DATE NULL,
  last_login DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admin_users_email (email)
) ENGINE=InnoDB;

-- User profile store (Profile page).
CREATE TABLE IF NOT EXISTS user_profiles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  avatar VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  bio TEXT NULL,
  social_facebook VARCHAR(255) NULL,
  social_x VARCHAR(255) NULL,
  social_linkedin VARCHAR(255) NULL,
  social_instagram VARCHAR(255) NULL,
  address_country VARCHAR(255) NULL,
  address_city_state VARCHAR(255) NULL,
  address_postal_code VARCHAR(50) NULL,
  address_tax_id VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_profiles_user
    FOREIGN KEY (user_id) REFERENCES admin_users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- UI preferences (Theme toggle).
CREATE TABLE IF NOT EXISTS user_preferences (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) NULL,
  theme ENUM('light','dark') NOT NULL DEFAULT 'light',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_preferences_user
    FOREIGN KEY (user_id) REFERENCES admin_users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- MSP offerings, service levels, and options.
CREATE TABLE IF NOT EXISTS msp_offerings (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  image_url TEXT NULL,
  category ENUM('backup','support','database','consulting') NOT NULL,
  base_price DECIMAL(12,2) NULL,
  pricing_unit VARCHAR(50) NULL,
  setup_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  setup_fee_cost DECIMAL(12,2) NULL,
  setup_fee_margin DECIMAL(6,2) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_date DATE NULL,
  last_modified DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS msp_offering_features (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  offering_id VARCHAR(64) NOT NULL,
  feature TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msp_offering_features_offering
    FOREIGN KEY (offering_id) REFERENCES msp_offerings(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS msp_service_levels (
  id VARCHAR(64) PRIMARY KEY,
  offering_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  base_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  base_cost DECIMAL(12,2) NULL,
  margin_percent DECIMAL(6,2) NULL,
  license_cost DECIMAL(12,2) NULL,
  license_margin DECIMAL(6,2) NULL,
  professional_services_price DECIMAL(12,2) NULL,
  professional_services_cost DECIMAL(12,2) NULL,
  professional_services_margin DECIMAL(6,2) NULL,
  pricing_unit VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_msp_service_levels_offering
    FOREIGN KEY (offering_id) REFERENCES msp_offerings(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS msp_service_level_options (
  id VARCHAR(64) PRIMARY KEY,
  service_level_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  monthly_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  monthly_cost DECIMAL(12,2) NULL,
  margin_percent DECIMAL(6,2) NULL,
  pricing_unit VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_msp_service_level_options_level
    FOREIGN KEY (service_level_id) REFERENCES msp_service_levels(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- Authentication identities and credentials.
CREATE TABLE IF NOT EXISTS auth_users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  password_salt VARCHAR(255) NULL,
  status ENUM('active','locked','disabled') NOT NULL DEFAULT 'active',
  last_login DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_auth_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auth_user_roles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  auth_user_id VARCHAR(64) NOT NULL,
  role ENUM('admin','manager','user') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_auth_user_roles_user
    FOREIGN KEY (auth_user_id) REFERENCES auth_users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- Session tokens for web logins.
CREATE TABLE IF NOT EXISTS auth_sessions (
  id VARCHAR(64) PRIMARY KEY,
  auth_user_id VARCHAR(64) NOT NULL,
  session_token VARCHAR(255) NOT NULL,
  refresh_token VARCHAR(255) NULL,
  ip_address VARCHAR(64) NULL,
  user_agent TEXT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_auth_sessions_token (session_token),
  CONSTRAINT fk_auth_sessions_user
    FOREIGN KEY (auth_user_id) REFERENCES auth_users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- Audit log for key data changes and user activity.
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id VARCHAR(64) NULL,
  actor_email VARCHAR(255) NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(64) NULL,
  summary TEXT NULL,
  metadata JSON NULL,
  ip_address VARCHAR(64) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_logs_user
    FOREIGN KEY (actor_user_id) REFERENCES auth_users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;
