# Lloyds

This project is a microservice API for managing football leagues and teams running at [https://api.andrewssite.xyz/api](https://api.andrewssite.xyz/api).

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
- Docker (optional for local development, required for GCP development)
- PostgreSQL Server:
    - You'll need a running PostgreSQL instance. You can install it directly on your system (see [PostgreSQL official downloads](https://www.postgresql.org/download/)) or run it easily using Docker:
      ```bash
      docker run --name lloyds-postgres -e POSTGRES_PASSWORD=your_chosen_password -p 5432:5432 -d postgres
      ```
- `gcloud` CLI (for GCP deployment, optional for local development)
- `kubectl` CLI (for Kubernetes interaction, required for GCP deployment)
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

## GCP Deployment

### GCP Prerequisites

-   **Google Cloud Project:** An active GCP project with billing enabled.
-   **GKE Cluster:** A running GKE cluster (Standard or Autopilot). Ensure the cluster has Workload Identity enabled or the node pool service account has the necessary permissions to connect to Cloud SQL (Cloud SQL Client role).
-   **Cloud SQL for PostgreSQL Instance:** A running Cloud SQL for PostgreSQL instance. Note its instance connection name (e.g., `your-gcp-project:your-region:your-instance-name`).
-   **Artifact Registry or Container Registry:** A repository to store your Docker images (e.g., `europe-west2-docker.pkg.dev/your-gcp-project/your-repository`).
-   **Static External IP Address:** A reserved global static external IP address in your GCP project for the Ingress. Note its name (e.g., `lloyds-api-static-ip`).
-   **Cloud SQL Proxy:** The `cloud-sql-proxy` executable is required to connect to the Cloud SQL instance from your local machine for tasks like seeding. Download it from the official Google Cloud documentation.
-   **DNS Configuration:** A DNS A record pointing your desired domain (e.g., `api.andrewssite.xyz`) to the reserved static IP address.

#### Create GKE Cluster (Optional)

If you don't already have a GKE cluster, you can create one using the `gcloud` CLI. This command creates a basic cluster suitable for this application. Remember to replace placeholders like `your-gcp-project-id`, `your-cluster-name`, and `your-cluster-region`.

```bash
gcloud container clusters create your-cluster-name \
    --project=your-gcp-project-id \
    --location=your-cluster-region \
    --machine-type=e2-small \
    --enable-ip-alias \
    --release-channel=regular \
    --scopes=https://www.googleapis.com/auth/cloud-platform \
    --enable-autoscaling --min-nodes=1 --max-nodes=3
```
*Note: Adjust machine type, node count, region, and other settings based on your needs and budget.*


### Deployment Steps

1.  **Authenticate `gcloud` and `kubectl`:**
    Ensure your `gcloud` CLI is authenticated and configured for your project and cluster.
    ```bash
    gcloud auth login
    gcloud config set project your-gcp-project-id
    gcloud container clusters get-credentials your-cluster-name --region your-cluster-region
    ```

2.  **Build and Push Docker Image:**
    Build the Docker image for your application and push it to your chosen container registry. Replace placeholders with your actual project ID, repository name, and desired image tag.
    ```bash
    docker build -t europe-west2-docker.pkg.dev/your-gcp-project/your-repository/lloyds-api-image:latest .
    docker push europe-west2-docker.pkg.dev/your-gcp-project/your-repository/lloyds-api-image:latest
    ```
    *Update the image tag in `kubernetes/deployment.yaml` if you use a different tag.*

3.  **Create Database Credentials Secret:**
    Create the Kubernetes Secret containing your database username and password. **Do not commit secrets directly to Git.** Use `kubectl create secret generic` or apply a YAML file with base64 encoded data (as in `kubernetes/db-credentials-secret.yaml`, but ensure you handle the actual secret values securely).
    ```bash
    # Example using kubectl (replace with your actual username and password)
    # kubectl create secret generic lloyds-db-credentials --from-literal=DB_USER='your_db_user' --from-literal=DB_PASSWORD='your_db_password'
    
    # Or apply the provided YAML (ensure base64 values are correct and handled securely)
    kubectl apply -f kubernetes/db-credentials-secret.yaml
    ```

4.  **Apply Kubernetes Manifests:**
    Apply the Kubernetes configuration files. Ensure you have updated `kubernetes/ingress.yaml` with your static IP name and domain, `kubernetes/managed-certificate.yaml` with your domain, and `kubernetes/deployment.yaml` with your image path and Cloud SQL instance connection name.
    ```bash
    kubectl apply -f kubernetes/backend-config.yaml
    kubectl apply -f kubernetes/service.yaml
    kubectl apply -f kubernetes/deployment.yaml
    kubectl apply -f kubernetes/managed-certificate.yaml
    kubectl apply -f kubernetes/ingress.yaml
    ```

5.  **Monitor Deployment and Ingress:**
    Monitor the status of your deployment, pods, and Ingress. It may take several minutes for the Ingress and Managed Certificate to become active and the load balancer to provision.
    ```bash
    kubectl get deployments
    kubectl get pods
    kubectl get services
    kubectl get ingress lloyds-api-ingress
    kubectl describe ingress lloyds-api-ingress
    kubectl get managedcertificates lloyds-api-certificate
    ```
6.  **Seed the Cloud SQL Database (Optional):**
    If you need to seed your newly deployed Cloud SQL database, you can run the `seed.js` script locally, connecting to your Cloud SQL instance via the Cloud SQL Proxy.

    a.  **Ensure your local `.env` file is configured for the Cloud SQL instance.** This means `DB_HOST` should be `localhost` (or `127.0.0.1`), `DB_PORT` should match the port the proxy will listen on (e.g., `5433` or `5432`), and `DB_USER`, `DB_PASSWORD`, and `DB_NAME` should be the credentials for your Cloud SQL database.
        Example `.env` configuration for this:
        ```env
        PORT=3000 # Not used by seed script directly, but good to have
        DB_USER=your_cloud_sql_db_user
        DB_PASSWORD=your_cloud_sql_db_password
        DB_NAME=lloyds_api_db # Or your specific Cloud SQL database name
        DB_HOST=127.0.0.1
        DB_PORT=5433 # Port for the proxy to listen on
        ```

    b.  **Start the Cloud SQL Proxy in a separate terminal window.** Replace `your-gcp-project:your-region:your-instance-name` with your actual Cloud SQL instance connection name and ensure the `--port` matches `DB_PORT` in your `.env`.
        ```bash
        ./cloud-sql-proxy your-gcp-project:your-region:your-instance-name --port=5433
        # If cloud-sql-proxy is not in your current directory, you might need to use its full path
        # or ensure it's in your system's PATH.
        ```

    c.  **Run the seed script in your project directory:**
        ```bash
        node seed.js
        ```
    d.  Once seeding is complete, you can stop the Cloud SQL Proxy (Ctrl+C in its terminal).
    
## Running Tests

### Unit and Integration Tests (Jest)

To run the Jest tests defined in the `__tests__` directory:
```bash
npm test
```

### API Tests (Postman/Newman)

The Postman collection is located at `/postman/Lloyds_API.postman_collection.json`.
The provided environment file (`Local_Development.postman_environment.json`) defines `baseURL=http://localhost:3000`, but this can be set manually. If tests are to be re-run, the database must be reseeded each time to reset the test data. Running tests on the production environment will likely result in test failures as the data consistency is not guaranteed.

1. **Ensure your API server is running:** `node index.js`  
2. **Reset the database:** `node seed.js`
3. **Run the tests:**
    - ***Using Postman Desktop App:***
        - Import the collection into Postman.
        - Import or create an environment in Postman, ensuring the `baseURL` variable is set (e.g., `http://localhost:3000` for local, `https://api.andrewssite.xyz` for production).
        - Select the appropriate environment in Postman.
        - Run the collection.

    - ***Using Newman:***
        ```bash
        npx newman run ./postman/Lloyds_API.postman_collection.json -e ./postman/Local_Development.postman_environment.json
        ```
        Alternatively, to set environment variables directly:
        ```bash
        npx newman run ./postman/Lloyds_API.postman_collection.json --env-var "baseURL=http://localhost:3000"
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
