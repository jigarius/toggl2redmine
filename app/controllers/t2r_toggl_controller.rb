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
      time_entry_groups = TogglTimeEntryGroup.group(time_entries)
    rescue TogglError => e
      response = e.response
      return render json: { errors: response.body }, status: response.code
    rescue StandardError => e
      return render json: { errors: e.message }, status: 400
    end

    result = {}
    time_entry_groups.each do |key, group|
      result[key] = group.as_json
      result[key]['issue'] = nil

      next unless group.issue && user_can_view_issue?(group.issue)

      result[key]['issue'] =
        group.issue.as_json(
          only: %i[id subject],
          include: {
            tracker: { only: %i[id name] },
            project: { only: %i[id name status] },
          }
        )
    end

    render json: result
  end

  # Reads workspaces from Toggl.
  def read_workspaces
    @workspaces = toggl_service.load_workspaces
    render json: @workspaces
  end

  def user_can_view_issue?(issue)
    @user.admin? ||
    issue.project.members.pluck(:user_id).include?(@user.id)
  end
end
