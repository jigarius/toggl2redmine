# frozen_string_literal: true

require_relative '../test_helper'

class T2rImportControllerTest < T2r::IntegrationTest
  fixtures :all

  def setup
    @user = users(:jsmith)
    @field = custom_fields(:toggl_api_token)

    set_custom_field_value(@user, @field, 'fake-toggl-api-token')
    log_user(@user.login, @user.login)
  end

  test 'Includes T2rBaseController' do
    assert(T2rImportController < T2rBaseController)
  end

  test ".import returns 400 response if 'toggl_ids' param is not present" do
    data = {
      time_entry: {
        activity_id: 1,
        comments: 'Special delivery!',
        hours: 4.0,
        issue_id: 1,
        spent_on: '2021-01-17'
      }
    }

    post '/toggl2redmine/import', params: data

    assert_response 400
    assert_equal(
      { 'errors' => ['param is missing or the value is empty: toggl_ids'] },
      @response.parsed_body
    )
  end

  test ".import returns 400 response if 'toggl_ids' param is empty" do
    data = {
      toggl_ids: [],
      time_entry: {
        activity_id: 1,
        comments: 'Special delivery!',
        hours: 4.0,
        issue_id: 1,
        spent_on: '2021-01-17'
      }
    }

    post '/toggl2redmine/import', params: data

    assert_response 400
    assert_equal(
      { 'errors' => ['param is missing or the value is empty: toggl_ids'] },
      @response.parsed_body
    )
  end

  test ".import returns 400 response if 'time_entry' param is not present" do
    post '/toggl2redmine/import', params: { toggl_ids: [999] }

    assert_response 400
    assert_equal(
      { 'errors' => ['param is missing or the value is empty: time_entry'] },
      @response.parsed_body
    )
  end

  test ".import returns 400 response if 'time_entry' param is not valid" do
    data = {
      toggl_ids: [999],
      time_entry: {
        activity_id: enumerations(:activity_development).id,
        comments: 'Special delivery!',
        hours: -1,
        issue_id: issues(:alpha_001).id,
        spent_on: '2021-01-17'
      }
    }

    post '/toggl2redmine/import', params: data

    assert_response 400
    assert_equal(
      { 'errors' => ['Validation failed: Hours is invalid'] },
      @response.parsed_body
    )
  end

  test '.import returns 403 response if user is not a project member' do
    data = {
      toggl_ids: [999],
      time_entry: {
        activity_id: enumerations(:activity_development).id,
        comments: 'Special delivery!',
        hours: 4.0,
        issue_id: issues(:delta_001).id,
        spent_on: '2021-01-17'
      }
    }

    post '/toggl2redmine/import', params: data

    assert_response 403
    assert_equal(
      { 'errors' => ['You are not a member of this project.'] },
      @response.parsed_body
    )
  end

  test ".import returns 403 response if user doesn't have 'log_time' permission for the project" do
    data = {
      toggl_ids: [999],
      time_entry: {
        activity_id: enumerations(:activity_development).id,
        comments: 'Special delivery!',
        hours: 4.0,
        issue_id: issues(:bravo_001).id,
        spent_on: '2021-01-17'
      }
    }

    post '/toggl2redmine/import', params: data

    assert_response 403
    assert_equal(
      { 'errors' => ['You are not allowed to log time on this project.'] },
      @response.parsed_body
    )
  end

  test '.import returns 400 response if time entry has already been imported' do
    data = {
      toggl_ids: [999, 1003],
      time_entry: {
        activity_id: enumerations(:activity_other).id,
        comments: "Listen to Friday I'm in Love",
        hours: 2.0,
        issue_id: issues(:alpha_001).id,
        spent_on: '2021-01-17'
      }
    }

    post '/toggl2redmine/import', params: data

    assert_response 400
    assert_equal(
      { 'errors' => ['Toggl ID has already been imported.'] },
      @response.parsed_body
    )
  end

  test '.import returns 400 response if the project is closed' do
    data = {
      toggl_ids: [50],
      time_entry: {
        activity_id: enumerations(:activity_other).id,
        comments: 'Organize party for the year 2020',
        hours: 4,
        issue_id: issues(:charlie_001).id,
        spent_on: '2021-07-20'
      }
    }

    post '/toggl2redmine/import', params: data

    assert_response 403
    assert_equal(
      { 'errors' => ['You are not allowed to log time on this project.'] },
      @response.parsed_body
    )
  end

  test '.import returns 503 response and rolls back if time entries cannot be saved' do
    data = {
      toggl_ids: [2001, 2002, 1003],
      time_entry: {
        activity_id: enumerations(:activity_other).id,
        comments: 'Get rich or die trying',
        hours: 2.0,
        issue_id: issues(:alpha_001).id,
        spent_on: '2021-01-17'
      }
    }

    # Say, somehow there are 2 competing requests that collide.
    # Not sure if this is possible, but feels safer with it.
    TogglMapping.expects(:where)
      .with(toggl_id: data[:toggl_ids].map(&:to_s))
      .returns([])

    assert_no_changes('TimeEntry.count') do
      assert_no_changes('TogglMapping.count') do
        post '/toggl2redmine/import', params: data
      end
    end

    assert_response 400
    assert_equal(
      { 'errors' => ['Validation failed: Toggl ID has already been imported'] },
      @response.parsed_body
    )
  end

  test ".import shows message if time entries cannot be saved and database doesn't support rollback" do
    skip
  end

  test '.import returns 201 response on success' do
    data = {
      toggl_ids: [2001, 2002, 2003],
      time_entry: {
        activity_id: enumerations(:activity_other).id,
        comments: 'Get rich or die trying',
        hours: 8.0,
        issue_id: issues(:alpha_001).id,
        spent_on: '2021-01-17'
      }
    }

    assert_difference('TimeEntry.count', 1) do
      assert_difference('TogglMapping.count', 3) do
        post '/toggl2redmine/import', params: data
      end
    end

    assert_response 201
    assert(@response.parsed_body)
  end
end
