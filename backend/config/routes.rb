Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    resources :chatrooms, only: %i[index show create destroy] do
      collection do
        get :online_users
      end
      member do
        get :presence
      end
      resources :messages, only: %i[index create]
    end
  end
end
