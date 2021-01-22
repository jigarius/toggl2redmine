# frozen_string_literal: true

# Toggl 2 Redmine: Seed data
#
# To use this file, copy it to "redmine/db/seeds.rb" (or symlink) and execute
# the command "rake db:seed".
#
# Using fixtures for seeding the database is not the best idea, however,
# it helps manage all sample data using fixtures and prevents duplication.

require 'active_record/fixtures'

lambda {
  # For DEVELOPMENT use only.
  return unless Rails.env == 'development'

  fixture_directory = "#{Toggl2Redmine.root}/test/fixtures"
  fixture_set_names = Dir["#{fixture_directory}/*.yml"].map do |f|
    File.basename(f, '.yml')
  end

  ActiveRecord::FixtureSet.create_fixtures(
    fixture_directory,
    fixture_set_names
  )
}.call
