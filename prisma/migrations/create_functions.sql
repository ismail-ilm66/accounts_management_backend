-- Function to create default chart of accounts for a new business
CREATE OR REPLACE FUNCTION create_default_chart_of_accounts(p_business_id UUID)
RETURNS void AS $$
BEGIN
    -- Assets
    INSERT INTO accounts (id, business_id, account_code, account_name, account_type_id, is_system_account) VALUES
    (gen_random_uuid(), p_business_id, '1000', 'Assets', 1, TRUE),
    (gen_random_uuid(), p_business_id, '1100', 'Current Assets', 1, TRUE),
    (gen_random_uuid(), p_business_id, '1101', 'Cash', 1, TRUE),
    (gen_random_uuid(), p_business_id, '1102', 'Bank', 1, TRUE),
    (gen_random_uuid(), p_business_id, '1110', 'Debtors', 1, TRUE),
    (gen_random_uuid(), p_business_id, '1120', 'Stock', 1, TRUE),
    (gen_random_uuid(), p_business_id, '1130', 'Investment', 1, TRUE);
    
    -- Liabilities
    INSERT INTO accounts (id, business_id, account_code, account_name, account_type_id, is_system_account) VALUES
    (gen_random_uuid(), p_business_id, '2000', 'Liabilities', 2, TRUE),
    (gen_random_uuid(), p_business_id, '2100', 'Current Liabilities', 2, TRUE),
    (gen_random_uuid(), p_business_id, '2101', 'Creditors', 2, TRUE),
    (gen_random_uuid(), p_business_id, '2102', 'Loans', 2, TRUE);
    
    -- Equity
    INSERT INTO accounts (id, business_id, account_code, account_name, account_type_id, is_system_account) VALUES
    (gen_random_uuid(), p_business_id, '3000', 'Equity', 3, TRUE),
    (gen_random_uuid(), p_business_id, '3101', 'Capital', 3, TRUE),
    (gen_random_uuid(), p_business_id, '3102', 'Drawings', 3, TRUE),
    (gen_random_uuid(), p_business_id, '3103', 'Retained Earnings', 3, TRUE);
    
    -- Revenue
    INSERT INTO accounts (id, business_id, account_code, account_name, account_type_id, is_system_account) VALUES
    (gen_random_uuid(), p_business_id, '4000', 'Revenue', 4, TRUE),
    (gen_random_uuid(), p_business_id, '4101', 'Sales', 4, TRUE),
    (gen_random_uuid(), p_business_id, '4102', 'Sales Returns', 4, TRUE);
    
    -- Expenses
    INSERT INTO accounts (id, business_id, account_code, account_name, account_type_id, is_system_account) VALUES
    (gen_random_uuid(), p_business_id, '5000', 'Expenses', 5, TRUE),
    (gen_random_uuid(), p_business_id, '5101', 'Purchases', 5, TRUE),
    (gen_random_uuid(), p_business_id, '5102', 'Purchase Returns', 5, TRUE),
    (gen_random_uuid(), p_business_id, '5103', 'Cost of Goods Sold', 5, TRUE),
    (gen_random_uuid(), p_business_id, '5201', 'Salaries', 5, TRUE),
    (gen_random_uuid(), p_business_id, '5202', 'Utilities', 5, TRUE),
    (gen_random_uuid(), p_business_id, '5203', 'Rent', 5, TRUE),
    (gen_random_uuid(), p_business_id, '5204', 'Daily Expenses', 5, TRUE);
    
    -- Set parent relationships
    UPDATE accounts SET parent_account_id = (SELECT id FROM accounts WHERE account_code = '1000' AND business_id = p_business_id)
    WHERE account_code = '1100' AND business_id = p_business_id;
    
    UPDATE accounts SET parent_account_id = (SELECT id FROM accounts WHERE account_code = '1100' AND business_id = p_business_id)
    WHERE account_code IN ('1101', '1102', '1110', '1120', '1130') AND business_id = p_business_id;
    
    UPDATE accounts SET parent_account_id = (SELECT id FROM accounts WHERE account_code = '2000' AND business_id = p_business_id)
    WHERE account_code = '2100' AND business_id = p_business_id;
    
    UPDATE accounts SET parent_account_id = (SELECT id FROM accounts WHERE account_code = '2100' AND business_id = p_business_id)
    WHERE account_code IN ('2101', '2102') AND business_id = p_business_id;
    
    UPDATE accounts SET parent_account_id = (SELECT id FROM accounts WHERE account_code = '3000' AND business_id = p_business_id)
    WHERE account_code IN ('3101', '3102', '3103') AND business_id = p_business_id;
    
    UPDATE accounts SET parent_account_id = (SELECT id FROM accounts WHERE account_code = '4000' AND business_id = p_business_id)
    WHERE account_code IN ('4101', '4102') AND business_id = p_business_id;
    
    UPDATE accounts SET parent_account_id = (SELECT id FROM accounts WHERE account_code = '5000' AND business_id = p_business_id)
    WHERE account_code IN ('5101', '5102', '5103', '5201', '5202', '5203', '5204') AND business_id = p_business_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create default expense categories
CREATE OR REPLACE FUNCTION create_default_expense_categories(p_business_id UUID)
RETURNS void AS $$
DECLARE
    v_salary_account_id UUID;
    v_utility_account_id UUID;
    v_rent_account_id UUID;
    v_daily_account_id UUID;
BEGIN
    -- Get account IDs
    SELECT id INTO v_salary_account_id FROM accounts WHERE business_id = p_business_id AND account_code = '5201';
    SELECT id INTO v_utility_account_id FROM accounts WHERE business_id = p_business_id AND account_code = '5202';
    SELECT id INTO v_rent_account_id FROM accounts WHERE business_id = p_business_id AND account_code = '5203';
    SELECT id INTO v_daily_account_id FROM accounts WHERE business_id = p_business_id AND account_code = '5204';
    
    -- Create expense categories
    INSERT INTO expense_categories (id, business_id, category_name, category_code, account_id, is_system_category) VALUES
    (gen_random_uuid(), p_business_id, 'SALARY', 'SAL', v_salary_account_id, TRUE),
    (gen_random_uuid(), p_business_id, 'UTILITY', 'UTL', v_utility_account_id, TRUE),
    (gen_random_uuid(), p_business_id, 'RENT', 'RNT', v_rent_account_id, TRUE),
    (gen_random_uuid(), p_business_id, 'DAILY', 'DAY', v_daily_account_id, TRUE);
END;
$$ LANGUAGE plpgsql;

