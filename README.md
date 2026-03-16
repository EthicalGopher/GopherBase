# GopherBase

GopherBase is a PostgreSQL-based backend and management interface.

## Running as a Wails App

To run GopherBase as a desktop application using Wails, follow these steps:

1.  **Install Wails:**
    If you haven't already, install the Wails CLI:
    ```bash
    go install github.com/wailsapp/wails/v2/cmd/wails@latest
    ```

2.  **Ensure PostgreSQL is running:**
    The application connects to PostgreSQL. You can use the provided Docker Compose:
    ```bash
    docker-compose up -d
    ```

3.  **Build the Frontend:**
    Navigate to the `Interface` directory and build the frontend:
    ```bash
    cd Interface
    npm install
    npm run build
    cd ..
    ```

4.  **Run in Dev Mode:**
    In the `Backend` directory, run:
    ```bash
    wails dev
    ```

5.  **Build the Desktop App:**
    ```bash
    wails build
    ```

## API Access

The application also runs a Fiber server in the background on port 8080, which the frontend uses for data access. This allows for a smooth transition from a web-based app to a desktop app.

## Project Structure

- `main.go`: Application entry point, initializes Wails and Fiber.
- `app.go`: Wails application logic and direct bindings.
- `server/`: Core backend logic (database, auth, storage).
- `Interface/`: Frontend React application.
- `wails.json`: Wails configuration file.
