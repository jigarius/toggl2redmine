# frozen_string_literal: true

class T2rRedmineController < T2rBaseController
  def read_time_entries
    # Require 'from' parameter.
    unless params[:from]
      return render json: {
        errors: "Parameter 'from' must be present."
      }, status: 400
    end
    from = Time.parse(params[:from])

    # Require 'till' parameter.
    unless params[:till]
      return render json: {
        errors: "Parameter 'till' must be present."
      }, status: 400
    end
    till = Time.parse(params[:till])

    # Load time entries in range.
    time_entries = TimeEntry.where(user: @user, spent_on: from..till).order(:id)

    render json: {
      time_entries: time_entries.as_json(
        only: %i[id comments hours],
        include: {
          issue: {
            only: %i[id subject],
            include: {
              tracker: {
                only: %i[id name]
              }
            }
          },
          project: {
            only: %i[id name status]
          },
          activity: {
            only: %i[id name]
          }
        }
      )
    }
  end
end
