# frozen_string_literal: true

require_relative '../../test_helper'

class TogglWorkspaceTest < ActiveSupport::TestCase
  test 'simple attribute readers work correctly' do
    subject = TogglWorkspace.new(
      id: 19,
      name: 'Bunny wabbit'
    )

    assert_equal(19, subject.id)
    assert_equal('Bunny wabbit', subject.name)
  end

  test '.==' do
    subject = TogglWorkspace.new(id: 19, name: 'Bunny wabbit')

    assert_equal(
      TogglWorkspace.new(id: 19, name: 'Bunny wabbit'),
      subject
    )

    refute_equal(
      TogglWorkspace.new(id: 20, name: 'Bunny wabbit'),
      subject
    )

    refute_equal(
      TogglWorkspace.new(id: 19, name: 'Jerry mouse'),
      subject
    )
  end
end
