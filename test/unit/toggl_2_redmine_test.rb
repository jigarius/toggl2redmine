# frozen_string_literal: true

require_relative '../test_helper'

class Toggl2RedmineTest < ActiveSupport::TestCase
  test '::VERSION' do
    assert_match(/\d+\.\d+\.\d+/, Toggl2Redmine::VERSION)
  end

  test '.root' do
    assert_equal(
      File.dirname(File.dirname(File.dirname(__FILE__))),
      Toggl2Redmine.root
    )
  end
end
