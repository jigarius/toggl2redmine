# frozen_string_literal: true

require_relative '../test_helper'

class Toggl2RedmineTest < ActiveSupport::TestCase
  test '::VERSION' do
    assert_match(/\d+\.\d+\.\d+/, Toggl2Redmine::VERSION)
  end

  test '.root' do
    # TODO: Restore test.
    # See https://github.com/two-pack/redmine-plugin-test-action/issues/12
    skip 'Cannot determine plugin root due to how tests are executed.'

    assert_equal(
      File.join(Rails.root.to_s, 'plugins', 'toggl2redmine'),
      Toggl2Redmine.root
    )
  end
end
