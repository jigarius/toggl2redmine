# frozen_string_literal: true

require "#{Rails.root}/test/test_helper"

module T2r
  class TestCase < ActiveSupport::TestCase
    self.fixture_path =
      File.join(Toggl2Redmine.root, 'test', 'fixtures')
  end

  class IntegrationTest < Redmine::IntegrationTest
    self.fixture_path =
      File.join(Toggl2Redmine.root, 'test', 'fixtures')

    protected

    def log_user(login, password)
      post signin_url, params: {
        username: login,
        password: password
      }
    end

    def set_custom_field_value(user, field, value)
      assert_not_nil(field, "Unexpected: Field 'Toggl API Token' not found")

      custom_value =
        CustomValue.find_by(customized: user, custom_field: field) ||
        CustomValue.new(customized: user, custom_field: field)

      custom_value.value = value
      custom_value.save!
    end
  end
end
