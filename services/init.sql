-- Create schemas for microservices boundaries
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS rating;
CREATE SCHEMA IF NOT EXISTS notification;

-- Grant permissions if necessary
COMMENT ON SCHEMA auth IS 'Schema for user profiles and addresses';
COMMENT ON SCHEMA catalog IS 'Schema for product directory and categories';
COMMENT ON SCHEMA orders IS 'Schema for shopping carts and order checkouts';
COMMENT ON SCHEMA rating IS 'Schema for reviews and product Q&As';
COMMENT ON SCHEMA notification IS 'Schema for logged user alerts';
