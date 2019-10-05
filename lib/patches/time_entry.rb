# frozen_string_literal: true

module Toggl2Redmine
  # Patch Redmine's TimeEntry model.
  module TimeEntryPatch
    def self.included(base)
      base.class_eval do
        unloadable # To not unload in development?
        has_many :toggl_mappings, dependent: :destroy
      end
    end
  end
end

TimeEntry.include Toggl2Redmine::TimeEntryPatch
