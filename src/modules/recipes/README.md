# Recipes API — Endpoints & Documentation

Base path: `/api/v1/recipes`

Authentication
- Admin endpoints: require JWT admin token (JwtAdminAuthGuard) and role checks (RoleGuard).
- User endpoints: require JWT user token (JwtAuthGuard).
- Upload endpoints expect `multipart/form-data` file field named `file`.

Common Query Parameters (used for list endpoints)
- page (number) — page number, default 1
- limit (number) — items per page, default 10
- search (string) — case-insensitive title search
- sortBy (string) — field to sort by (e.g. id, title, created_at)
- order (string) — ASC or DESC

Common Response envelope (list)
{
  data: [...],
  pagination: {
    total: number,
    page: number,
    limit: number,
    totalPages: number,
    nextPage: number | null | false,
    prevPage: number | null | false
  }
}

Types
- Recipe (partial returned fields)
  - id: number
  - title: string
  - slug: string
  - image_url: string
  - description?: string
  - category: { id: number, name: string }
  - admin?: { id: number, username: string, role: string }
  - detail?: RecipeDetailSummary | null

- RecipeDetailSummary
  - recipe_video: string
  - time_preparation: string
  - time_cooking: string
  - recipe_type: string

- RecipeDetail (full)
  - id: number
  - recipe_video: string
  - time_preparation: string
  - time_cooking: string
  - recipe_type: string
  - ingredients: JSON / array
  - steps: JSON / array
  - nutrition_info: array
  - notes?: string
  - nutrition_facts: boolean

Endpoints

1) GET /recipes
- Summary: List recipes (basic fields) with pagination, search, sorting.
- Query: page, limit, search, sortBy, order
- Auth: none
- Response: pagination + list of Recipe (each includes `detail` summary: recipe_video, time_preparation, time_cooking, recipe_type)
- Example response (partial):
{
  data: [
    {
      id: 1,
      title: "Classic Margherita Pizza",
      slug: "classic-margherita-pizza",
      image_url: "...",
      category: { id: 1, name: "Pizza" },
      admin: { id: 2, username: "dangbinhtrieu", role: "ADMIN" },
      detail: { recipe_video: "...", time_preparation: "15", time_cooking: "10", recipe_type: "grill" }
    }, ...
  ],
  pagination: { total: 100, page: 1, limit: 10, totalPages: 10, nextPage: 2, prevPage: null }
}

2) GET /recipes/by-created/me
- Summary: Recipes created by authenticated admin.
- Query: page, limit, search, sortBy, order
- Auth: JwtAdminAuthGuard
- Response: same as GET /recipes

3) GET /recipes/full-details
- Summary: Recipes list with full detail payload attached (ingredients, steps, nutrition_info, notes, nutrition_facts).
- Query: page, limit, search, sortBy, order
- Auth: none
- Response: list of Recipe with full `detail` object.

4) GET /recipes/:id
- Summary: Get single recipe (basic).
- Params: id (number)
- Auth: none
- Response: Recipe object (basic fields)

5) GET /recipes/:id/details
- Summary: Get full RecipeDetail by recipe id.
- Params: id (number)
- Auth: none
- Response: RecipeDetail object (full)

6) POST /recipes
- Summary: Create a new recipe with detail.
- Auth: JwtAdminAuthGuard + RoleGuard (SUPER_ADMIN, ADMIN, MODERATOR, EDITOR)
- Body (JSON):
{
  "title": "string",
  "image_url": "string",
  "description": "string",
  "category_id": number,
  "detail": {
    "recipe_video": "string",
    "time_preparation": "string",
    "time_cooking": "string",
    "recipe_type": "string",
    "ingredients": JSON | array,
    "instructions": JSON | array,
    "nutrition_info": array,
    "nutrition_facts": boolean,
    "notes": "string"
  }
}
- Response: { message: "Recipe created successfully" }

7) PUT /recipes/:id
- Summary: Update basic recipe fields.
- Auth: JwtAdminAuthGuard + RoleGuard
- Params: id
- Body:
{ "title"?: string, "image_url"?: string, "description"?: string }
- Response: { message: "Recipe updated successfully" }

8) PUT /recipes/:id/details
- Summary: Update recipe detail by recipe ID.
- Auth: JwtAdminAuthGuard + RoleGuard
- Params: id
- Body: RecipeDetailDto (same shape as detail in create)
- Response: { message: "Recipe details updated successfully" }

9) DELETE /recipes/:id
- Summary: Soft-delete recipe (sets is_active true).
- Auth: JwtAdminAuthGuard + RoleGuard
- Params: id
- Response: { message: "Recipe deleted successfully" }

10) POST /recipes/:id/add-to-favorites
- Summary: Add recipe to authenticated user's favorites.
- Auth: JwtAuthGuard (user)
- Params: id (recipe id)
- Response: { message: "Recipe added to favorites successfully" }

11) DELETE /recipes/:id/remove-from-favorites
- Summary: Remove recipe from authenticated user's favorites.
- Auth: JwtAuthGuard (user)
- Params: id (recipe id)
- Response: { message: "Recipe removed from favorites successfully" }

12) GET /recipes/favorites/user
- Summary: Get authenticated user's favorite recipes (supports pagination, search, sort).
- Query: page, limit, search, sortBy, order
- Auth: JwtAuthGuard
- Response: pagination + data (wishlist entries with recipe details)

13) GET /recipes/:id/is-favorite
- Summary: Check if a recipe is in authenticated user's favorites.
- Auth: JwtAuthGuard
- Params: id
- Response: boolean

14) POST /recipes/import/csv
- Summary: Import recipes from CSV file.
- Auth: JwtAdminAuthGuard + RoleGuard (SUPER_ADMIN, ADMIN, MODERATOR, EDITOR)
- Body: multipart/form-data with field `file` (CSV). If no file provided, service will pick the newest export file in `tmp/`.
- CSV header expected (example produced by export):
  id,title,slug,image_url,description,category_name,admin_username,recipe_video,time_preparation,time_cooking,recipe_type,ingredients,steps,nutrition_info,nutrition_facts,notes
- Response: { message: string, summary: { imported, skipped, errors, errorsDetails }, filePath?: string }

15) GET /recipes/export/csv
- Summary: Export recipes to CSV and persist file to export directory.
- Auth: JwtAdminAuthGuard + RoleGuard
- Response: { message: "CSV exported successfully", filePath: "/absolute/path/to/file.csv" }
- Deployment note: set `EXPORT_DIR` env var to a writable directory (e.g. `/var/www/app/exports`) so exported files persist.

Examples & notes
- File upload: use `multipart/form-data` with key `file`.
- CSV parsing: import attempts to parse `ingredients`, `steps`, `nutrition_info` as JSON if they look like arrays/objects. Strings are accepted otherwise.
- Error handling: endpoints throw HTTP exceptions with appropriate status codes (400/404/409/500).
- For download: controller currently returns the `filePath`. Implement a download endpoint to stream the file (e.g., using `res.download(filePath)` or Nest's StreamableFile) if you want direct downloads.

Contact / Maintainer
- Module: src/modules/recipes
- Service: RecipeService
- Controller: RecipeController