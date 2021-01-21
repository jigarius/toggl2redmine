# frozen_string_literal: true

require_relative '../test_helper'

class T2rRedmineControllerTest < T2r::IntegrationTest
  fixtures :custom_fields, :users

  def setup
    @user = users(:jsmith)
    @field = custom_fields(:toggl_api_token)

    set_custom_field_value(@user, @field, 'fake-toggl-api-token')
    log_user(@user.login, @user.login)
  end

  test 'Includes T2rBaseController' do
    assert(T2rRedmineController < T2rBaseController)
  end

  test '.read_time_entries returns time entries as JSON' do

  end

  test ".read_time_entries fails if param 'from' is missing" do
    data = { till: DateTime.now }

    get "/toggl2redmine/redmine_time_entries?#{data.to_query}"

    expectation = { errors: "Parameter 'from' must be present." }

    assert_response 400
    assert_equal(expectation.as_json, @response.parsed_body)
  end

  test ".read_time_entries fails if param 'till' is missing" do
    data = { from: DateTime.now }

    get "/toggl2redmine/redmine_time_entries?#{data.to_query}"

    expectation = { errors: "Parameter 'till' must be present." }

    assert_response 400
    assert_equal(expectation.as_json, @response.parsed_body)
  end
end
