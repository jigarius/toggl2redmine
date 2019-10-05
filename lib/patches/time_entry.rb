# Patch Redmine's TimeEntry model.
#
# When a time entry is deleted, all related Toggl mappings should be deleted.
module Toggl2Redmine
  module TimeEntryPatch
    def self.included(base)
      base.class_eval do
        unloadable # To not unload in development?
        has_many :toggl_mappings, dependent: :destroy
      end
    end
  end
end

TimeEntry.send(:include, Toggl2Redmine::TimeEntryPatch)
