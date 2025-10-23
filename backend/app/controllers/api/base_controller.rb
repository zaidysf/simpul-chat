module Api
  class BaseController < ApplicationController
    protect_from_forgery with: :null_session

    rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
    rescue_from ActionController::ParameterMissing, with: :render_unprocessable_entity
    rescue_from ActiveRecord::RecordInvalid, with: :render_unprocessable_entity

    before_action :set_default_format

    private

    def set_default_format
      request.format = :json
    end

    def render_not_found(error)
      render json: { error: error.message }, status: :not_found
    end

    def render_unprocessable_entity(error)
      errors = if error.respond_to?(:record) && error.record&.respond_to?(:errors)
                 error.record.errors.full_messages
               else
                 Array.wrap(error.message)
               end

      render json: { errors: errors }, status: :unprocessable_entity
    end
  end
end
