# Lloyds

This project is a microservice API for managing football leagues and teams.

## API Documentation

Interactive API documentation (Swagger UI) is available when the service is running.

- **Locally:** If running the service on port 3000, the documentation can be accessed at [http://localhost:3000/api-docs](http://localhost:3000/api-docs).
- **Deployed (Production):** The public API documentation is available at [https://api.andrewssite.xyz/api-docs](https://api.andrewssite.xyz/api-docs).

## Endpoints
The primary API endpoints are `/api/leagues` and `/api/teams`. Refer to the API documentation for detailed information on request/response formats and available operations.

## Setup Instructions

### Prerequisites

- Node.js (v18 or later recommended)
- npm (usually comes with Node.js)
- Docker (for building images, optional for local development if not containerizing)
- **PostgreSQL Server:**
    - You'll need a running PostgreSQL instance. You can install it directly on your system (see [PostgreSQL official downloads](https://www.postgresql.org/download/)) or run it easily using Docker.
    - For Docker, a simple way to start a PostgreSQL container is:
      ```bash
      docker run --name lloyds-postgres -e POSTGRES_PASSWORD=your_chosen_password -p 5432:5432 -d postgres
      ```
      *(Remember to use a secure password and adjust environment variables as needed for your `.env` file.)*
- `gcloud` CLI (for GCP deployment, optional for local development)
- Postman or Newman (for running Postman tests)

### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/AndrewWood94/Lloyds.git
    cd Lloyds
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the project root by copying `.env.example` or by setting the following variables:
    ```env
    PORT=3000
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_NAME=lloyds_api_db
    DB_HOST=localhost
    DB_PORT=5432
    # For Cloud SQL Proxy connection (if used locally for GCP DB)
    # INSTANCE_CONNECTION_NAME=your-gcp-project:your-region:your-instance-name
    ```
    *Ensure your PostgreSQL server is running. You will also need to create the database (e.g., `lloyds_api_db`) and a user with appropriate permissions if they don't already exist. For example, using `psql`:*
    ```sql
    CREATE DATABASE lloyds_api_db;
    CREATE USER your_db_user WITH PASSWORD 'your_db_password';
    GRANT ALL PRIVILEGES ON DATABASE lloyds_api_db TO your_db_user;
    ```

4.  **Seed the database:**
    This script will create the necessary tables and populate them with initial data.
    ```bash
    node seed.js
    ```

5.  **Run the application:**
    ```bash
    node index.js
    ```
    The API should now be running, typically at `http://localhost:3000`.

## Running Tests

### Unit and Integration Tests (Jest)

To run the Jest tests defined in the `__tests__` directory:
```bash
npm test
```

### API Tests (Postman/Newman)

The Postman collection is located at `/postman/LLoyds_API.postman_collection.json`.
The provided environment file (`LLoyds_API.postman_environment.json`) defines `baseURL=http://localhost:3000`, but this can be set manually. If tests are to be re-run, the database must be reseeded each time to reset the test data. Running tests on the production environment will likely result in test failures as the data consistency is not guaranteed.

Ensure your API server is running. `node index.js`
Reset the database `node seed.js`

1.  **Using Postman Desktop App:**
    - Import the collection into Postman.
    - Import or create an environment in Postman, ensuring the `baseURL` variable is set (e.g., `http://localhost:3000` for local, `https://api.andrewssite.xyz` for production).
    - Select the appropriate environment in Postman.
    - Run the collection.

2.  **Using Newman:**
    ```bash
    npx newman run ./postman/LLoyds_API.postman_collection.json -e ./postman/LLoyds_API.postman_environment.json
    ```
    Alternatively, to set environment variables directly:
    ```bash
    npx newman run ./postman/LLoyds_API.postman_collection.json --env-var "baseURL=http://localhost:3000"
    ```

## Example API Requests (curl)

These examples assume the API is running locally at `http://localhost:3000`. Replace with `https://api.andrewssite.xyz` for the deployed version.

### Leagues

**1. Get all leagues:**
```bash
curl http://localhost:3000/api/leagues
```

**2. Get leagues filtered by country:**
```bash
curl "http://localhost:3000/api/leagues?country=England"
```

**3. Create a new league:**
```bash
curl -X POST -H "Content-Type: application/json" \
-d '{
  "name": "Eredivisie",
  "country": "Netherlands"
}' \
http://localhost:3000/api/leagues
```

### Teams

**1. Get all teams:**
```bash
curl http://localhost:3000/api/teams
```

**2. Get teams filtered by league name and country:**
```bash
curl "http://localhost:3000/api/teams?league_name=Serie%20A&country=Italy"
```

**3. Create a new team:**
```bash
curl -X POST -H "Content-Type: application/json" \
-d '{
  "name": "Ajax",
  "league_name": "Eredivisie",
  "league_country": "Netherlands"
}' \
http://localhost:3000/api/teams
```

**4. View all teams in newly created league:**
```bash
curl "http://localhost:3000/api/teams?league_name=Eredivisie"
```