require 'net/http'

# Toggl web service helper.
class TogglService
  attr_reader :api_key

  # API endpoint.
  URL = 'https://www.toggl.com'.freeze

  # Toggl API Key.
  @api_key = nil

  # Constructor.
  def initialize(api_key)
    @api_key = api_key
  end

  # Prepare request data before sending a request to Toggl.
  def beforeSend(data)
    # TODO: Convert dates to ISO-8601 format.
    data
  end

  # Makes a GET request to Toggl.
  def get(path, data = nil)
    # Prepare request URI.
    url = URL + path
    uri = URI(url)
    unless data.empty?
      data = beforeSend(data)
      uri.query = data.to_query
    end

    # Prepare request.
    request = Net::HTTP::Get.new(uri)
    request.basic_auth @api_key, 'api_token'
    request['Accept'] = 'application/json'

    # Prepare response.
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    response = http.request(request)

    # Handle errors.
    raise TogglError.new("Toggl error: #{response.body}.", request, response) if response.code.to_i != 200

    # Return output as Hash.
    JSON.parse(response.body)
  end

  # Loads time entries form Toggl.
  def load_time_entries(query)
    # The workspace parameter is not for Toggl, so remove it.
    workspaces = query[:workspaces]
    query.delete(:workspaces)

    # TODO: Convert dates to string in beforeSend()
    query[:start_date] = query[:start_date].iso8601 if query[:start_date]
    query[:end_date] = query[:end_date].iso8601 if query[:end_date]

    output = get('/api/v8/time_entries', query)

    # The workspace filter is only supported on certain versions of the
    # Toggl API. Thus, it is easier to filter out such records ourselves.
    output.keep_if { |time_entry| workspaces.include? time_entry['wid'] } unless workspaces.empty?

    output
  end
end
