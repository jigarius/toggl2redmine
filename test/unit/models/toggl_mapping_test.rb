# frozen_string_literal: true

require_relative '../../test_helper'

class TogglMappingTest < ActiveSupport::TestCase
  test 'simple attribute readers' do
    subject = TogglMapping.new(
      toggl_id: 19,
      time_entry_id: 89,
      created_at: DateTime.strptime('2021-01-16T15:30:04+00:00')
    )

    assert_equal(19, subject.toggl_id)
    assert_equal(89, subject.time_entry_id)
    assert_equal(DateTime.strptime('2021-01-16T15:30:04+00:00'), subject.created_at)
  end
end
