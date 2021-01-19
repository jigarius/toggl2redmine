# frozen_string_literal: true

class TogglError < StandardError
  attr_reader :request, :response

  def initialize(message = nil, request = nil, response = nil)
    super(message)

    @request = request
    @response = response
  end
end
