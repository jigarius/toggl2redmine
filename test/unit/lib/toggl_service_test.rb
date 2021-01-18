# frozen_string_literal: true

require_relative '../../test_helper'
require 'base64'

class TogglServiceTest < ActiveSupport::TestCase
  TOGGL_API_KEY = 'foobar'

  test '::ENDPOINT' do
    assert_equal('https://www.toggl.com', TogglService::ENDPOINT)
  end

  test '.api_key' do
    subject = TogglService.new(TOGGL_API_KEY)
    assert_equal('foobar', subject.api_key)
  end

  test '.load_time_entries raises TogglError on failure' do
    mock_response =
      Net::HTTPServerError.new(1.0, '500', 'Service unavailable')
    mock_response.expects(:body).returns(nil)

    Net::HTTP
      .any_instance
      .expects(:request)
      .returns(mock_response)

    subject = TogglService.new(TOGGL_API_KEY)
    assert_raises(TogglError) { subject.load_time_entries }
  end

  test '.load_time_entries returns JSON on success' do
    query = {
      start_date: Time.now,
      end_date: Time.now - 24.hours
    }

    expected = mock_json_response('time_entries')

    mock_response =
      Net::HTTPSuccess.new(1.0, '200', 'OK')

    mock_response
      .expects(:body)
      .returns(expected)

    Net::HTTP
      .any_instance
      .expects(:request)
      .with do |request|
        request_hash = request.to_hash

        assert_equal(['application/json'], request_hash['accept'])
        assert_equal(
          [authorization_header(TOGGL_API_KEY, 'api_token')],
          request_hash['authorization']
        )

        assert_equal(TogglService::ENDPOINT, "#{request.uri.scheme}://#{request.uri.host}")
        assert_equal('/api/v8/time_entries', request.uri.path)
      end
      .returns(mock_response)

    subject = TogglService.new(TOGGL_API_KEY)
    result = subject.load_time_entries(query)

    assert_kind_of(Array, result)
    assert_equal(5, result.length)
  end

  test '.load_time_entries filters entries by workspace' do
    query = { workspaces: [99] }

    mock_response =
      Net::HTTPSuccess.new(1.0, '200', 'OK')

    mock_response
      .expects(:body)
      .returns(mock_json_response('time_entries'))

    Net::HTTP
      .any_instance
      .expects(:request)
      .with do |request|
        # Workspace filter is handled by the TogglService.
        assert_nil(request.uri.query)
      end
      .returns(mock_response)

    subject = TogglService.new(TOGGL_API_KEY)
    result = subject.load_time_entries(query)

    assert_equal(2, result.length)

    result.each { |e| assert_equal(99, e['wid']) }
  end

  test '.load_workspaces raises TogglError on failure' do
    mock_response =
      Net::HTTPServerError.new(1.0, '500', 'Service unavailable')
    mock_response.expects(:body).returns(nil)

    Net::HTTP
      .any_instance
      .expects(:request)
      .returns(mock_response)

    subject = TogglService.new(TOGGL_API_KEY)
    assert_raises(TogglError) { subject.load_workspaces }
  end

  test '.load_workspaces returns JSON on success' do
    expected = mock_json_response('workspaces')

    mock_response =
      Net::HTTPSuccess.new(1.0, '200', 'OK')

    mock_response
      .expects(:body)
      .returns(expected)

    Net::HTTP
      .any_instance
      .expects(:request)
      .with do |request|
        request_hash = request.to_hash

        assert_equal(['application/json'], request_hash['accept'])
        assert_equal(
          [authorization_header(TOGGL_API_KEY, 'api_token')],
          request_hash['authorization']
        )

        assert_equal(TogglService::ENDPOINT, "#{request.uri.scheme}://#{request.uri.host}")
        assert_equal('/api/v8/workspaces', request.path)
      end
      .returns(mock_response)

    subject = TogglService.new(TOGGL_API_KEY)
    result = subject.load_workspaces

    assert_kind_of(Array, result)
    assert_equal(3, result.length)
  end

  private

  # type: time_entries|workspaces
  def mock_json_response(type)
    File.read("#{Rails.root}/plugins/toggl2redmine/test/fixtures/toggl/#{type}.json")
  end

  def authorization_header(username, password)
    value = Base64.encode64("#{username}:#{password}")
    "Basic #{value}".chomp
  end
end
