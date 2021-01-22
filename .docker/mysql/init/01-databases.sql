-- Create databases.
CREATE DATABASE IF NOT EXISTS `redmine_development`;
CREATE DATABASE IF NOT EXISTS `redmine_test`;

-- Grant permissions.
GRANT ALL PRIVILEGES ON redmine_development.* TO 'redmine';
GRANT ALL PRIVILEGES ON redmine_test.* TO 'redmine';
