# frozen_string_literal: true

require_relative '../../test_helper'

class TogglTimeEntryGroupTest < ActiveSupport::TestCase
  test 'implements TogglTimeEntry interface' do
    assert(TogglTimeEntryGroup.include?(TogglTimeEntry))

    subject = TogglTimeEntryGroup.new
    TogglTimeEntry.instance_methods.each do |method|
      subject.public_send method
    end
  end
end
