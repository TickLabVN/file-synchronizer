# File Synchronizer

A cross-platform desktop application built with ElectronJ for synchronizing files to Cloud storage services.

> **Note:** Because the server is deployed on Render, the first login may take a few seconds while the server starts up. Please wait for the loading indicator before proceeding.

## Features

- Cross-platform support (Windows, macOS, Linux)
- Seamless file synchronization with Cloud storage services like Google Drive, Box,...
- Real-time updates and conflict resolution
- User-friendly interface built with React and styled using TailwindCSS

## Prerequisites

- Node.js
- npm
- A Google Cloud Platform account
- A Box Platform account

## Installation

1. **Clone the repository**:

    ```bash
    git clone https://github.com/BaoDuong254/file-synchronizer.git
    cd file-synchronizer
    ```

2. **Install Electron-vite dependencies**:

    ```bash
    npm install
    ```

3. **Install backend dependencies**:

    ```bash
    cd src/server
    npm install
    ```

4. **Install frontend dependencies**:

    ```bash
    cd src/renderer
    npm install
    ```

    > **Note:** You can also download a release package for your operating system from the repository’s Releases page.

## Configuration

1. **Copy the example environment file**:

    ```bash
    cp .env.example .env
    ```

2. **Edit `.env` and set the following variables**:

    - `GOOGLE_CLIENT_ID`
    - `GOOGLE_CLIENT_SECRET`
    - `BOX_CLIENT_ID`
    - `BOX_CLIENT_SECRET`
    - `BACKEND_URL`

3. **Setup credentials in Google Cloud Platform**:

    - Create or select a project
    - Enable the Google Drive API and OAuth2
    - Create OAuth2 credentials for a **Web Application**
    - Copy the **Client ID** and **Client Secret** into your `.env`

    > **Note:** The setup steps are similar for other cloud providers—simply create the corresponding credentials and update the variables above.

## Running the Application

1. **Start the backend server**:

    ```bash
    npm run server
    ```

2. **Start the Electron app (in a separate terminal)**:

    ```bash
    npm run dev
    ```

3. **Login and sync**:

    - The Electron window will open
    - Sign in with your Cloud account
    - Choose files or folders to synchronize

## Contributing

We welcome contributions! To contribute:

1. **Fork the repository**
2. **Create a branch for your feature or fix:**

    ```bash
    git checkout -b feature/your-feature-name
    ```

3. **Make your changes and commit:**

    ```bash
    git commit -m "Add feature X"
    ```

4. **Push to your branch:**

    ```bash
    git push origin feature/your-feature-name
    ```

5. **Open a Pull Request on GitHub and describe your changes.**

## Reporting Issues

If you encounter any bugs or errors, please open an issue on GitHub and include:

- Steps to reproduce the problem
- Expected vs. actual behavior
- Relevant logs or error messages

---

> **Note:** This application is currently in development. If you find any issues or have suggestions for improvements, please report them or contribute via pull requests. We appreciate your feedback!
