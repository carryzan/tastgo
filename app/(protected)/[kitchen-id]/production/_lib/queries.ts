export const RECIPES_QUERY_KEY = ['production-recipes']
export const RECIPES_FROM = 'production_recipes'
// Hint !production_recipe_id disambiguates: production_recipes has two paths to
// production_recipe_versions (current_version_id FK + reverse production_recipe_id FK).
// Without the hint PostgREST errors with "more than one relationship found".
export const RECIPES_SELECT =
  '*, production_recipe_versions!production_recipe_id(id, version_number)'

export const BATCHES_QUERY_KEY = ['production-batches']
export const BATCHES_FROM = 'production_batches'
// Explicit FK-column hints on every embed to avoid ambiguity.
export const BATCHES_SELECT =
  '*, production_recipes!production_recipe_id(id, name), production_recipe_versions!recipe_version_id(id, version_number), production_service_periods!service_period_id(id, name)'
