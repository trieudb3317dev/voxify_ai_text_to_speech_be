# Categories API — Endpoints & Documentation

Base path: `/api/v1/categories`

Authentication
- Admin endpoints: require JWT admin token (JwtAdminAuthGuard) and role checks (RoleGuard).
- Use `multipart/form-data` for file uploads (field name `file`) when applicable.

Common Query Parameters
- page (number) — page number, default 1
- limit (number) — items per page, default 10
- search (string) — case-insensitive name search
- sortBy (string) — field to sort by (id, name, created_at, recipe_count)
- order (string) — ASC or DESC

Common Response (list)
{
  data: [...],
  pagination: {
    total, page, limit, totalPages, nextPage, prevPage
  }
}

Types
- Category (returned)
  - id: number
  - name: string
  - slug: string
  - image_url?: string
  - description?: string
  - created_at: timestamp
  - recipe_count: number

- CategoryDto (create/update)
  - name: string (required for create)
  - image_url?: string
  - description?: string

Endpoints

1) POST /categories
- Summary: Create a new category.
- Auth: JwtAdminAuthGuard + RoleGuard (SUPER_ADMIN, ADMIN, MODERATOR, EDITOR)
- Body (JSON):
  {
    "name": "string",
    "image_url": "string",
    "description": "string"
  }
- Response: { message: "Category created successfully" }
- Errors: 409 if category exists.

2) GET /categories
- Summary: List categories with recipe counts, pagination, search and sort.
- Query: page, limit, search, sortBy, order
- Auth: none
- Response: { data: Category[], pagination: { ... } }

3) GET /categories/:id
- Summary: Get single category and recipe_count.
- Params: id
- Auth: none
- Response:
  {
    id, name, slug, image_url, description, created_at, recipe_count
  }
- Errors: 404 if not found.

4) PUT /categories/:id
- Summary: Update category.
- Auth: JwtAdminAuthGuard + RoleGuard
- Params: id
- Body: CategoryDto
- Response: { message: "Category updated successfully" }
- Errors: 404 if not found.

5) DELETE /categories/:id
- Summary: Soft-delete category (and mark its recipes as inactive).
- Auth: JwtAdminAuthGuard + RoleGuard
- Params: id
- Response: { message: "Category deleted successfully" }
- Errors: 404 if not found.

6) POST /categories/import/csv
- Summary: Import categories from CSV.
- Auth: JwtAdminAuthGuard + RoleGuard (SUPER_ADMIN)
- Body: multipart/form-data `file` (CSV). If omitted, service looks for newest CSV in tmp/.
- CSV header example: name,slug,image_url,description
- Behavior: For each row, create category if name present and not duplicate (by name or slug).
- Response: { message, summary: { imported, skipped, errors, errorsDetails }, filePath? }

7) GET /categories/export/csv
- Summary: Export all categories to CSV persisted to export dir.
- Auth: JwtAdminAuthGuard + RoleGuard (SUPER_ADMIN)
- Response: { filePath: "/absolute/path/to/categories.csv" }
- Deployment note: set `EXPORT_DIR` env var to a writable directory so files persist.

CSV Notes
- Parser supports quoted fields and escaped quotes.
- Slug is auto-generated when missing.
- image_url is included and stored as-is (no upload handled here).

Examples
- Create body:
  {
    "name": "Breakfast",
    "image_url": "https://example.com/image.jpg",
    "description": "Morning recipes"
  }

- Sample GET /categories response (partial):
  {
    "data": [
      {
        "id": 1,
        "name": "Breakfast",
        "slug": "breakfast",
        "image_url": "https://...",
        "description": "Morning recipes",
        "created_at": "2025-01-01T00:00:00.000Z",
        "recipe_count": 12
      }
    ],
    "pagination": { "total":1, "page":1, "limit":10, "totalPages":1, "nextPage": false, "prevPage": false }
  }

Error Handling
- Uses HTTP exceptions with appropriate status codes (400 / 404 / 409 / 500).

Maintainer
- Module: src/modules/categories
- Service: CategoryService
- Controller: CategoryController

