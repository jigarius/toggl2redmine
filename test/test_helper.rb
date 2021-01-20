# frozen_string_literal: true

require "#{Rails.root}/test/test_helper"
# require 'active_record/fixtures'

module T2r
  module FixtureLoader
    def self.included(base)
      base.class_eval do
        self.fixture_path = "#{Rails.root}/plugins/toggl2redmine/test/fixtures/"
      end
    end
  end
end
