# frozen_string_literal: true

class T2rTogglController < T2rBaseController
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

    # Determine 'workspaces' parameter.
    workspaces =
      params.fetch(:workspaces, '').split(',').map(&:to_i)

    begin
      time_entries = toggl_service.load_time_entries(
        start_date: from,
        end_date: till,
        workspaces: workspaces
      )
      @time_entries = TogglTimeEntryGroup.group(time_entries)
    rescue TogglError => e
      response = e.response
      return render json: { errors: response.body }, status: response.code
    rescue StandardError => e
      return render json: { errors: e.message }, status: 400
    end

    # Prepare grouped time entries.
    output = {}
    # Expand certain Redmine models manually.
    @time_entries.values.each do |group|
      hash = group.as_json
      hash[:issue] = nil
      hash[:errors] = []

      # TODO: Perform JSON conversion in Object#as_json.
      if group.issue &&
         # If the user has permission to see the project.
         (@user.admin? || group.issue.project.members.pluck(:user_id).include?(@user.id))

        # Include issue.
        issue = group.issue
        hash[:issue] = {
          id: issue.id,
          subject: issue.subject,
          # Include tracker.
          tracker: {
            id: issue.tracker.id,
            name: issue.tracker.name
          },
          # Include project.
          project: {
            id: issue.project.id,
            name: issue.project.name,
            status: issue.project.status
          }
        }
      end
      output[group.key] = hash
    end

    render json: output
  end

  # Reads workspaces from Toggl.
  def read_workspaces
    @workspaces = toggl_service.load_workspaces
    render json: @workspaces
  end
end
