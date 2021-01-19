# frozen_string_literal: true

require 'net/http'

# Toggl web service helper.
class TogglService
  attr_reader :api_key

  ENDPOINT = 'https://www.toggl.com'

  def initialize(api_key)
    @api_key = api_key
  end

  # Loads time entries form Toggl.
  def load_time_entries(query = {})
    # The workspace parameter is not for Toggl, so remove it.
    workspaces = query[:workspaces] || []
    query.delete(:workspaces)

    query[:start_date] = query[:start_date].iso8601 if query[:start_date]
    query[:end_date] = query[:end_date].iso8601 if query[:end_date]

    raw_entries = get('/api/v8/time_entries', query)

    # The workspace filter is only supported on certain versions of the
    # Toggl API. Thus, it is easier to filter out such records ourselves.
    filter_by_workspaces(raw_entries, workspaces)
      .map { |e| TogglTimeEntry.new(e.symbolize_keys) }
  end

  # Loads workspaces from Toggl.
  def load_workspaces
    get('/api/v8/workspaces')
      .map { |w| TogglWorkspace.new(w.symbolize_keys) }
  end

  private

  # Makes a GET request to Toggl.
  def get(path, data = nil)
    uri = URI(ENDPOINT + path)
    uri.query = data.to_query if data.present?

    request = Net::HTTP::Get.new(uri)
    request.basic_auth @api_key, 'api_token'
    request['Accept'] = 'application/json'

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    response = http.request(request)

    raise_on_error(request, response)

    JSON.parse(response.body)
  end

  def filter_by_workspaces(records, workspaces)
    return records if workspaces.empty?

    records.keep_if { |r| workspaces.include? r['wid'] }
  end

  def raise_on_error(request, response)
    return if response.code == '200'

    raise TogglError.new("Toggl error: #{response.body}.", request, response)
  end
end
