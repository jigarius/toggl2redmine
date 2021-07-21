# frozen_string_literal: true

class T2rRedmineController < T2rBaseController
  def read_time_entries
    parse_params

    time_entries = TimeEntry.where(
      user: @user,
      spent_on: params[:from]..params[:till]
    ).order(:id)

    result = time_entries.map do |time_entry|
      time_entry.as_json(
        only: %i[id comments hours],
        include: {
          issue: {
            only: %i[id subject],
            include: {
              tracker: { only: %i[id name] }
            }
          },
          project: { only: %i[id name status] },
          activity: { only: %i[id name] }
        }
      )
    end

    render json: { time_entries: result }
  rescue ActionController::ParameterMissing => e
    render json: { errors: [e.message] }, status: 400
  end

  private

  def parse_params
    params[:from] = Time.parse(params.require(:from))
    params[:till] = Time.parse(params.require(:till))
  end
end
