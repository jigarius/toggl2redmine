class TogglError < StandardError
  attr_reader :request, :response

  # The request.
  @request = nil

  # The response.
  @response = nil

  def initialize(message = nil, request = nil, response = nil)
    super(message)
    @request = request
    @response = response
  end
end
